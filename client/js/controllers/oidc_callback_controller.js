"use strict";

const api = require("../api.js");
const tags = require("../tags.js");
const pools = require("../pools.js");
const router = require("../router.js");
const uri = require("../util/uri.js");
const topNavigation = require("../models/top_navigation.js");

class OidcCallbackController {
    constructor(provider, params) {
        topNavigation.setTitle("Logging in…");

        const code = params.get("code");
        const state = params.get("state");
        const savedState = sessionStorage.getItem("oidc_state");

        sessionStorage.removeItem("oidc_state");
        sessionStorage.removeItem("oidc_provider");

        if (!code || !state || state !== savedState) {
            const ctx = router.show(uri.formatClientLink("login"));
            if (ctx.controller && ctx.controller.showError) {
                ctx.controller.showError("OIDC login failed: invalid or missing state");
            }
            return;
        }

        api.submitOidcCallback(provider, code, state)
            .then((response) => api.loginWithToken(response.user, response.token, true))
            .then(() => {
                const ctx = router.show(uri.formatClientLink());
                if (ctx.controller && ctx.controller.showSuccess) {
                    ctx.controller.showSuccess("Logged in");
                }
                tags.refreshCategoryColorMap();
                pools.refreshCategoryColorMap();
            })
            .catch((error) => {
                const ctx = router.show(uri.formatClientLink("login"));
                if (ctx.controller && ctx.controller.showError) {
                    ctx.controller.showError(
                        "OIDC login failed: " + (error.message || "unknown error")
                    );
                }
            });
    }
}

module.exports = (router) => {
    router.enter(["oidc", ":provider", "callback"], (ctx, next) => {
        const params = new URLSearchParams(window.location.search);
        ctx.controller = new OidcCallbackController(ctx.parameters.provider, params);
    });
};
