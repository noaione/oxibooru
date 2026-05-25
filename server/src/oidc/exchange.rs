use crate::config::OidcProviderConfig;
use crate::oidc::OidcError;
use crate::oidc::discovery::ResolvedProvider;
use argon2::password_hash::rand_core::{OsRng, RngCore};
use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use sha2::{Digest, Sha256};

pub struct PkceChallenge {
    pub verifier: String,
    pub challenge: String,
}

pub fn generate_pkce() -> PkceChallenge {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    let verifier = URL_SAFE_NO_PAD.encode(bytes);

    let digest = Sha256::digest(verifier.as_bytes());
    let challenge = URL_SAFE_NO_PAD.encode(digest);

    PkceChallenge { verifier, challenge }
}

pub fn generate_csrf_state() -> String {
    let mut bytes = [0u8; 24];
    OsRng.fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

pub fn build_authorization_url(
    endpoints: &ResolvedProvider,
    provider: &OidcProviderConfig,
    csrf_state: &str,
    pkce: Option<&PkceChallenge>,
    redirect_uri: &str,
) -> String {
    let mut url = endpoints.authorization.clone();
    {
        let mut pairs = url.query_pairs_mut();
        pairs.append_pair("response_type", "code");
        pairs.append_pair("client_id", &provider.client_id);
        pairs.append_pair("redirect_uri", redirect_uri);
        pairs.append_pair("scope", &provider.scope);
        pairs.append_pair("state", csrf_state);
        if let Some(pkce) = pkce {
            pairs.append_pair("code_challenge", &pkce.challenge);
            pairs.append_pair("code_challenge_method", "S256");
        }
    }
    url.to_string()
}

pub struct OidcTokenResponse {
    pub access_token: String,
}

pub async fn exchange_code(
    endpoints: &ResolvedProvider,
    provider: &OidcProviderConfig,
    code: &str,
    pkce_verifier: Option<&str>,
    redirect_uri: &str,
    http: &reqwest::Client,
) -> Result<OidcTokenResponse, OidcError> {
    let mut params = vec![
        ("grant_type", "authorization_code"),
        ("code", code),
        ("client_id", &provider.client_id),
        ("client_secret", &provider.client_secret),
        ("redirect_uri", redirect_uri),
    ];

    let verifier_owned;
    if let Some(v) = pkce_verifier {
        verifier_owned = v.to_string();
        params.push(("code_verifier", &verifier_owned));
    }

    let response = http
        .post(endpoints.token.clone())
        .header("Accept", "application/json")
        .form(&params)
        .send()
        .await
        .map_err(OidcError::TokenExchangeRequest)?;

    let body: serde_json::Value = response.json().await.map_err(OidcError::TokenExchangeRequest)?;

    if let Some(err) = body["error"].as_str() {
        let desc = body["error_description"].as_str().unwrap_or(err);
        return Err(OidcError::TokenExchange(desc.to_string()));
    }

    let access_token = body["access_token"]
        .as_str()
        .ok_or(OidcError::MissingField("access_token"))?
        .to_string();

    Ok(OidcTokenResponse { access_token })
}

pub struct OidcUserInfo {
    pub sub: String,
    pub email: Option<String>,
}

pub async fn fetch_userinfo(
    userinfo_uri: &url::Url,
    access_token: &str,
    http: &reqwest::Client,
) -> Result<OidcUserInfo, OidcError> {
    let body: serde_json::Value = http
        .get(userinfo_uri.clone())
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(OidcError::UserInfoRequest)?
        .json()
        .await
        .map_err(OidcError::UserInfoRequest)?;

    let sub = body["sub"].as_str().ok_or(OidcError::MissingField("sub"))?.to_string();

    let email = body["email"].as_str().map(String::from);

    Ok(OidcUserInfo { sub, email })
}
