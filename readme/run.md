npm run typecheck
npm run build
npm run dev

AUTH_MODE=LITE DATA_PROVIDER=SQLITE npm run dev
ya da
DEPLOY_MODE=SAAS npm run dev
DEPLOY_MODE=ONPREM npm run dev

AUTH_MODE=LITE DATA_PROVIDER=SQLITE QUICKMCP_DATA_DIR=/Users/berkaybasoz/.quickmcp npm run dev


DEPLOY_MODE=ONPREM olunca defaultlar şu oluyor:
  - AUTH_MODE set edilmemişse authMode = 'LITE'
  - DATA_PROVIDER set edilmemişse dataProvider = 'SQLITE'
DEPLOY_MODE=SAAS olunca (explicit override yoksa) defaultlar:
  - AUTH_MODE = 'SUPABASE_GOOGLE'
  - DATA_PROVIDER = 'SUPABASE'