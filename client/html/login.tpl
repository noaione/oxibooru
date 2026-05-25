<div class='content-wrapper' id='login'>
    <h1>Log in</h1>
    <form>
        <ul class='input'>
            <li>
                <%= ctx.makeTextInput({
                    text: 'User name',
                    name: 'name',
                    required: true,
                    pattern: ctx.userNamePattern,
                }) %>
            </li>
            <li>
                <%= ctx.makePasswordInput({
                    text: 'Password',
                    name: 'password',
                    required: true,
                    pattern: ctx.passwordPattern,
                }) %>
            </li>
            <li>
                <%= ctx.makeCheckbox({
                    text: 'Remember me',
                    name: 'remember-user',
                }) %>
            </li>
        </ul>

        <div class='messages'></div>

        <div class='buttons'>
            <input type='submit' value='Log in'/>
            <a class='append' href='<%- ctx.formatClientLink('password-reset') %>'>Forgot the password?</a>
        </div>
    </form>
    <% if (ctx.oidcProviders && ctx.oidcProviders.length > 0) { %>
    <div class='oidc-providers'>
        <p class='oidc-separator'>or sign in with</p>
        <% for (let p of ctx.oidcProviders) { %>
        <button type='button' class='oidc-login-btn' data-provider='<%- p.name %>'>
            <img
                src='https://cdn.simpleicons.org/<%- p.iconProvider %>'
                alt=''
                class='oidc-provider-icon'
                width='16'
                height='16'
            />
            <%- p.displayName %>
        </button>
        <% } %>
    </div>
    <% } %>
</div>
