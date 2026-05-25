use crate::schema::{oidc_auth_state, user_oidc_account};
use crate::time::DateTime;
use diesel::pg::Pg;
use diesel::{Identifiable, Insertable, Queryable, Selectable};
use uuid::Uuid;

#[derive(Insertable)]
#[diesel(table_name = oidc_auth_state)]
#[diesel(check_for_backend(Pg))]
pub struct NewOidcAuthState {
    pub id: Uuid,
    pub provider_name: String,
    pub csrf_state: String,
    pub pkce_verifier: Option<String>,
    pub expiration_time: DateTime,
}

#[derive(Identifiable, Queryable, Selectable)]
#[diesel(table_name = oidc_auth_state)]
#[diesel(check_for_backend(Pg))]
pub struct OidcAuthState {
    pub id: Uuid,
    pub provider_name: String,
    pub csrf_state: String,
    pub pkce_verifier: Option<String>,
    pub expiration_time: DateTime,
}

#[derive(Insertable)]
#[diesel(table_name = user_oidc_account)]
#[diesel(check_for_backend(Pg))]
pub struct NewUserOidcAccount<'a> {
    pub user_id: i64,
    pub provider_name: &'a str,
    pub subject: &'a str,
}

#[derive(Identifiable, Queryable, Selectable)]
#[diesel(table_name = user_oidc_account)]
#[diesel(check_for_backend(Pg))]
pub struct UserOidcAccount {
    pub id: i64,
    pub user_id: i64,
    pub provider_name: String,
    pub subject: String,
    pub creation_time: DateTime,
}
