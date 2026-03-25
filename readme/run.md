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


  DEPLOY_MODE=ONPREM npm run dev:dev
  DEPLOY_MODE=SAAS npm run dev:dev

  Kod geliştirirken: npm run dev:dev
  Build çıktısını test ederken: npm run build && npm run start:dev


SAAS SPA gibi localde debug yapmak
npm run build && npm run build:spa  

npx concurrently -k -n BACKEND,SPA -c green,blue \
  "DEPLOY_MODE=SAAS AUTH_MODE=SUPABASE_GOOGLE DATA_PROVIDER=SUPABASE DOTENV_CONFIG_PATH=.env.dev npm run dev" \
  "npm run dev:spa"