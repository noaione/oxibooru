use crate::api::doc::OIDC_TAG;
use crate::api::error::{ApiError, ApiResult};
use crate::app::AppState;
use crate::auth::password;
use crate::extract::{Json, Path};
use crate::model::enums::{AvatarStyle, UserRank};
use crate::model::oidc::{NewOidcAuthState, NewUserOidcAccount};
use crate::model::user::{NewUser, NewUserToken};
use crate::oidc::exchange::{
    OidcUserInfo, build_authorization_url, exchange_code, fetch_userinfo, generate_csrf_state, generate_pkce,
};
use crate::schema::{oidc_auth_state, user, user_oidc_account, user_token};
use crate::string::{SecretString, SmallString};
use crate::time::DateTime;
use argon2::password_hash::SaltString;
use argon2::password_hash::rand_core::{OsRng, RngCore};
use axum::extract::State;
use diesel::{BoolExpressionMethods, ExpressionMethods, Insertable, OptionalExtension, QueryDsl, RunQueryDsl};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;
use uuid::Uuid;

pub fn routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(authorize))
        .routes(routes!(callback))
}

/// Response for the authorize endpoint.
#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AuthorizeResponse {
    pub authorize_url: String,
    pub state: String,
}

/// Request body for the callback endpoint.
#[derive(Deserialize, ToSchema)]
pub struct OidcCallbackBody {
    pub code: String,
    pub state: String,
}

/// Response for a successful OIDC login.
#[derive(Serialize, ToSchema)]
pub struct OidcLoginResponse {
    pub user: String,
    pub token: Uuid,
}

/// Initiates an OIDC/OAuth2 authorization flow.
///
/// Returns an authorization URL to redirect the user to, along with a state token.
/// The state token must be passed back to the callback endpoint.
#[utoipa::path(
    get,
    path = "/oidc/{provider}/authorize",
    tag = OIDC_TAG,
    params(
        ("provider" = String, Path, description = "Provider name as configured on the server"),
    ),
    responses(
        (status = 200, body = AuthorizeResponse),
        (status = 404, description = "Provider not configured"),
        (status = 502, description = "Provider discovery failed"),
    ),
)]
async fn authorize(
    State(state): State<AppState>,
    Path(provider_name): Path<String>,
) -> ApiResult<Json<AuthorizeResponse>> {
    let provider = state
        .config
        .oidc
        .providers
        .iter()
        .find(|p| p.name == provider_name)
        .ok_or_else(|| ApiError::OidcProviderNotFound(provider_name.clone()))?
        .clone();

    let endpoints = state.oidc_cache.get_or_fetch(&provider, &state.http_client).await?;

    let csrf_state = generate_csrf_state();
    let pkce = generate_pkce();

    let redirect_uri = build_redirect_uri(&state, &provider_name);
    let authorize_url = build_authorization_url(&endpoints, &provider, &csrf_state, Some(&pkce), &redirect_uri);

    let pkce_verifier = Some(pkce.verifier);
    let now = DateTime::now();
    let expiration = DateTime::from(*now + time::Duration::minutes(5));

    let new_state = NewOidcAuthState {
        id: Uuid::new_v4(),
        provider_name,
        csrf_state: csrf_state.clone(),
        pkce_verifier,
        expiration_time: expiration,
    };

    state
        .connection_pool
        .transaction(move |conn| {
            // clean up expired states
            diesel::delete(oidc_auth_state::table)
                .filter(oidc_auth_state::expiration_time.lt(DateTime::now()))
                .execute(conn)?;

            new_state.insert_into(oidc_auth_state::table).execute(conn)?;
            Ok::<_, diesel::result::Error>(())
        })
        .await?;

    Ok(Json(AuthorizeResponse {
        authorize_url,
        state: csrf_state,
    }))
}

/// Completes an OIDC/OAuth2 login after the provider redirects back.
///
/// Validates the state token, exchanges the authorization code, and returns a
/// session token that can be used for subsequent authenticated requests.
#[utoipa::path(
    post,
    path = "/oidc/{provider}/callback",
    tag = OIDC_TAG,
    params(
        ("provider" = String, Path, description = "Provider name as configured on the server"),
    ),
    request_body = OidcCallbackBody,
    responses(
        (status = 200, body = OidcLoginResponse),
        (status = 401, description = "State is invalid or expired"),
        (status = 403, description = "No matching account and auto-creation is disabled"),
        (status = 404, description = "Provider not configured"),
        (status = 502, description = "Token exchange or user info fetch failed"),
    ),
)]
async fn callback(
    State(state): State<AppState>,
    Path(provider_name): Path<String>,
    Json(body): Json<OidcCallbackBody>,
) -> ApiResult<Json<OidcLoginResponse>> {
    let provider = state
        .config
        .oidc
        .providers
        .iter()
        .find(|p| p.name == provider_name)
        .ok_or_else(|| ApiError::OidcProviderNotFound(provider_name.clone()))?
        .clone();

    let auth_state = state
        .connection_pool
        .transaction({
            let csrf_state = body.state.clone();
            move |conn| {
                let row = oidc_auth_state::table
                    .filter(oidc_auth_state::csrf_state.eq(&csrf_state))
                    .first::<crate::model::oidc::OidcAuthState>(conn)
                    .optional()?;

                let row = match row {
                    Some(r) if r.expiration_time >= DateTime::now() => r,
                    _ => return Err(ApiError::OidcInvalidState),
                };

                diesel::delete(oidc_auth_state::table.find(row.id)).execute(conn)?;
                Ok::<_, ApiError>(row)
            }
        })
        .await?;

    let redirect_uri = build_redirect_uri(&state, &provider_name);

    let endpoints = state.oidc_cache.get_or_fetch(&provider, &state.http_client).await?;
    let token_resp = exchange_code(
        &endpoints,
        &provider,
        &body.code,
        auth_state.pkce_verifier.as_deref(),
        &redirect_uri,
        &state.http_client,
    )
    .await?;

    let userinfo_uri = endpoints
        .userinfo
        .ok_or(ApiError::OidcMissingField("userinfo_endpoint"))?;
    let user_info: OidcUserInfo =
        fetch_userinfo(&userinfo_uri, &token_resp.access_token, &provider, &state.http_client).await?;

    let auto_create = state.config.oidc.auto_create_account;
    let prefer_rank = user_info
        .rank
        .unwrap_or_else(|| state.config.public_info.default_user_rank);
    let config = state.config.clone();

    // Resolve user account
    let (username, token_id) = state
        .connection_pool
        .transaction(move |conn| {
            // find by provider + subject
            let existing_user_id: Option<i64> = user_oidc_account::table
                .inner_join(user::table)
                .filter(user_oidc_account::provider_name.eq(&provider_name))
                .filter(user_oidc_account::subject.eq(&user_info.sub))
                .select(user::id)
                .first(conn)
                .optional()?;

            let user_id: i64 = if let Some(id) = existing_user_id {
                id
            } else if let Some(ref email) = user_info.email {
                // find by email on users table, then link to account
                let by_email: Option<i64> = user::table
                    .filter(user::email.eq(email))
                    .select(user::id)
                    .first(conn)
                    .optional()?;

                if let Some(id) = by_email {
                    NewUserOidcAccount {
                        user_id: id,
                        provider_name: &provider_name,
                        subject: &user_info.sub,
                    }
                    .insert_into(user_oidc_account::table)
                    .execute(conn)?;
                    id
                } else if auto_create {
                    create_oidc_user(conn, &config, &user_info, &provider_name, prefer_rank)?
                } else {
                    return Err(ApiError::OidcAutoCreateDisabled);
                }
            } else if auto_create {
                create_oidc_user(conn, &config, &user_info, &provider_name, prefer_rank)?
            } else {
                return Err(ApiError::OidcAutoCreateDisabled);
            };

            let username: SmallString = user::table
                .filter(user::id.eq(user_id))
                .select(user::name)
                .first(conn)?;

            let now = DateTime::now();
            diesel::delete(user_token::table)
                .filter(user_token::user_id.eq(user_id))
                .filter(user_token::enabled.eq(false).or(user_token::expiration_time.lt(now)))
                .execute(conn)?;

            let token_id = Uuid::new_v4();
            NewUserToken {
                id: token_id,
                user_id,
                note: Some("OIDC Login"),
                enabled: true,
                expiration_time: None,
            }
            .insert_into(user_token::table)
            .execute(conn)?;

            Ok::<_, ApiError>((username, token_id))
        })
        .await?;

    Ok(Json(OidcLoginResponse {
        user: username.to_string(),
        token: token_id,
    }))
}

fn create_oidc_user(
    conn: &mut diesel::PgConnection,
    config: &crate::config::Config,
    user_info: &OidcUserInfo,
    provider_name: &str,
    rank: UserRank,
) -> Result<i64, ApiError> {
    let base_name = user_info
        .username
        .as_deref()
        .or_else(|| user_info.email.as_deref().and_then(|e| e.split('@').next()))
        .unwrap_or("user")
        .to_string();

    let sanitized: String = base_name
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
        .take(32)
        .collect();
    let sanitized = if sanitized.is_empty() {
        "user".to_string()
    } else {
        sanitized
    };

    let mut rng_bytes = [0u8; 3];
    let mut candidate = sanitized.clone();

    // Generate a random UTF-8 string to use as a stub password — never exposed to the user
    let pw_rand = SaltString::generate(&mut OsRng);
    let pw_rand_str = pw_rand.as_str().to_string();
    let (pw_hash, pw_salt) = password::hash_password(config, &SecretString::from(pw_rand_str))?;

    let user_id = loop {
        let result: Option<crate::model::user::User> = NewUser {
            name: &candidate,
            password_hash: pw_hash.read(),
            password_salt: pw_salt.as_str(),
            email: user_info.email.as_deref(),
            rank,
            avatar_style: AvatarStyle::Gravatar,
        }
        .insert_into(user::table)
        .on_conflict(user::name)
        .do_nothing()
        .get_result(conn)
        .optional()?;

        if let Some(u) = result {
            break u.id;
        }

        // random suffix to avoid name collisions
        OsRng.fill_bytes(&mut rng_bytes);
        let suffix: u32 = u32::from_le_bytes([rng_bytes[0], rng_bytes[1], rng_bytes[2], 0]) % 10000;
        candidate = format!("{sanitized}_{suffix}");
    };

    NewUserOidcAccount {
        user_id,
        provider_name,
        subject: &user_info.sub,
    }
    .insert_into(user_oidc_account::table)
    .execute(conn)?;

    Ok(user_id)
}

fn build_redirect_uri(state: &AppState, provider_name: &str) -> String {
    let domain = state.config.domain_url(&state.env);
    let domain = domain.trim_end_matches('/');
    format!("{domain}/oidc/{provider_name}/callback")
}
