CREATE TABLE "oidc_auth_state" (
    "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "provider_name"   VARCHAR(64) NOT NULL,
    "csrf_state"      VARCHAR(256) NOT NULL UNIQUE,
    "pkce_verifier"   VARCHAR(256),
    "expiration_time" TIMESTAMPTZ NOT NULL
        DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 minutes')
);
CREATE INDEX "oidc_auth_state_expiration_idx" ON "oidc_auth_state" ("expiration_time");

CREATE TABLE "user_oidc_account" (
    "id"            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "user_id"       BIGINT NOT NULL REFERENCES "user" ON DELETE CASCADE,
    "provider_name" VARCHAR(64) NOT NULL,
    "subject"       VARCHAR(512) NOT NULL,
    "creation_time" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("provider_name", "subject")
);
CREATE INDEX "user_oidc_account_user_id_idx" ON "user_oidc_account" ("user_id");
