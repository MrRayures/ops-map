# Security — Frontend

## Injection Prevention

- No innerHTML / dangerouslySetInnerHTML with user input
- No eval(), Function(), setTimeout(string)
- Sanitize URL construction from user input
- Use parameterized queries for any data layer

## Secrets

- No hardcoded API keys, tokens, or passwords in source
- Use environment variables (process.env / import.meta.env)
- No sensitive data in URL parameters or localStorage
- No secrets in client-side bundles

## Dependencies

- Run `npm audit` regularly — fix critical/high
- Remove unused dependencies
- Pin major versions in package.json
- Audit new packages before adding (check downloads, maintenance)

## Headers & Transport

- Content-Security-Policy for all pages
- X-Frame-Options: DENY (prevent clickjacking)
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options: nosniff

## Authentication

- Tokens in httpOnly cookies, never localStorage
- CSRF protection on all state-changing requests
- Session timeout and refresh token rotation
