pub mod discovery;
pub mod exchange;

pub use discovery::OidcProviderCache;

#[derive(Debug, thiserror::Error)]
pub enum OidcError {
    #[error("OIDC discovery request failed: {0}")]
    DiscoveryRequest(#[from] reqwest::Error),
    #[error("OIDC discovery response is missing field: {0}")]
    DiscoveryMissingField(&'static str),
    #[error("OIDC token exchange failed: {0}")]
    TokenExchange(String),
    #[error("OIDC token exchange request failed: {0}")]
    TokenExchangeRequest(reqwest::Error),
    #[error("OIDC user info request failed: {0}")]
    UserInfoRequest(reqwest::Error),
    #[error("OIDC response missing required field: {0}")]
    MissingField(&'static str),
}
