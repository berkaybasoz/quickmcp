# Authentication Modes

## Supported
- `AUTH_MODE=NONE`
- `AUTH_MODE=LITE`
- `AUTH_MODE=SUPABASE_GOOGLE` (reserved, not implemented in this build)

## Deploy Profiles
- `DEPLOY_MODE=ONPREM` => default `AUTH_MODE=LITE`, `DATA_PROVIDER=SQLITE`
- `DEPLOY_MODE=SAAS` => default `AUTH_MODE=SUPABASE_GOOGLE`, `DATA_PROVIDER=SUPABASE`
- Explicit `AUTH_MODE` / `DATA_PROVIDER` values always override `DEPLOY_MODE`.

## Backward Compatibility
- `AUTH_PROVIDER=NONE` -> `AUTH_MODE=NONE`
- `AUTH_PROVIDER=LITE` -> `AUTH_MODE=LITE`

## Data Provider
- `DATA_PROVIDER=SQLITE` (implemented)
- `DATA_PROVIDER=JDBC` (reserved)
- `DATA_PROVIDER=SUPABASE` (reserved)

## Default Values
- `AUTH_MODE=NONE`
- `DATA_PROVIDER=SQLITE`
- `AUTH_DEFAULT_USERNAME=guest`
- `AUTH_ADMIN_USERS=[{"username":"admin","password":"admin123"}]`
- `AUTH_COOKIE_SECRET=change-me`

## LITE Mode
- Login required.
- Access token + refresh token cookies are used.
- Server records are saved with `owner_username=<logged in username>`.

## NONE Mode
- Login disabled.
- All records are saved with `owner_username=AUTH_DEFAULT_USERNAME`.


DEPLOY_MODE=ONPREM -> otomatik AUTH_MODE=LITE, DATA_PROVIDER=SQLITE
DEPLOY_MODE=SAAS -> otomatik AUTH_MODE=SUPABASE_GOOGLE, DATA_PROVIDER=SUPABASE

AUTH_MODE=NONE
DATA_PROVIDER=SQLITE
AUTH_DEFAULT_USERNAME=guest
AUTH_ADMIN_USERS=[{"username":"admin","password":"admin123"}]
AUTH_COOKIE_SECRET=change-me
AUTH_ACCESS_TOKEN_TTL_SEC=900
AUTH_REFRESH_TOKEN_TTL_SEC=2592000
