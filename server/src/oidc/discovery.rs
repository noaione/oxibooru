use crate::config::OidcProviderConfig;
use crate::oidc::OidcError;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use url::Url;

const CACHE_TTL: Duration = Duration::from_hours(1);

#[derive(Clone)]
pub struct ResolvedProvider {
    pub authorization: Url,
    pub token: Url,
    pub userinfo: Option<Url>,
}

struct CacheEntry {
    provider: ResolvedProvider,
    fetched_at: Instant,
}

pub struct OidcProviderCache {
    entries: Mutex<HashMap<String, CacheEntry>>,
}

impl OidcProviderCache {
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
        }
    }

    fn get_cached(&self, name: &str) -> Option<ResolvedProvider> {
        let guard = self.entries.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let key = name.to_string();
        guard.get(&key).and_then(|entry| {
            if entry.fetched_at.elapsed() < CACHE_TTL {
                Some(entry.provider.clone())
            } else {
                None
            }
        })
    }

    fn insert(&self, name: &str, provider: ResolvedProvider) {
        let mut guard = self.entries.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        guard.insert(
            name.to_string(),
            CacheEntry {
                provider,
                fetched_at: Instant::now(),
            },
        );
    }

    pub async fn get_or_fetch(
        &self,
        config: &OidcProviderConfig,
        http: &reqwest::Client,
    ) -> Result<ResolvedProvider, OidcError> {
        if let Some(cached) = self.get_cached(&config.name) {
            return Ok(cached);
        }

        let resolved = if let Some(issuer) = &config.issuer_uri {
            discover_oidc(issuer, http).await?
        } else {
            ResolvedProvider {
                authorization: config
                    .authorization_uri
                    .clone()
                    .ok_or(OidcError::DiscoveryMissingField("authorization_uri"))?,
                token: config
                    .token_uri
                    .clone()
                    .ok_or(OidcError::DiscoveryMissingField("token_uri"))?,
                userinfo: config.userinfo_uri.clone(),
            }
        };

        self.insert(&config.name, resolved.clone());
        Ok(resolved)
    }
}

async fn discover_oidc(issuer: &Url, http: &reqwest::Client) -> Result<ResolvedProvider, OidcError> {
    let discovery_url = issuer
        .join(".well-known/openid-configuration")
        .map_err(|_| OidcError::DiscoveryMissingField("issuer_uri is not a valid base URL"))?;

    let doc: serde_json::Value = http.get(discovery_url).send().await?.json().await?;

    let authorization_uri = doc["authorization_endpoint"]
        .as_str()
        .ok_or(OidcError::DiscoveryMissingField("authorization_endpoint"))?
        .parse()
        .map_err(|_| OidcError::DiscoveryMissingField("authorization_endpoint is not a valid URL"))?;

    let token_uri = doc["token_endpoint"]
        .as_str()
        .ok_or(OidcError::DiscoveryMissingField("token_endpoint"))?
        .parse()
        .map_err(|_| OidcError::DiscoveryMissingField("token_endpoint is not a valid URL"))?;

    let userinfo_uri = doc["userinfo_endpoint"].as_str().and_then(|s| s.parse().ok());

    Ok(ResolvedProvider {
        authorization: authorization_uri,
        token: token_uri,
        userinfo: userinfo_uri,
    })
}
