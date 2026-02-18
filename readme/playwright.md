  1. Bağımlılıkları kur
     npm install
  2. (İlk kez) Playwright browser’larını indir
     npx playwright install
  3. Uygulamayı ayağa kaldır
     npm run dev
  4. Testi çalıştır
     npm run test:e2e


tek dosya çalıştırma:
npx playwright test tests/e2e/mssql.spec.ts
npx playwright test tests/e2e/mysql.spec.ts
npx playwright test tests/e2e/postgresql.spec.ts
npx playwright test tests/e2e/rest.spec.ts
npx playwright test tests/e2e/webpage.spec.ts
npx playwright test tests/e2e/curl.spec.ts

GITHUB_TEST_TOKEN="github_pat_..." \
  npx playwright test tests/e2e/github.spec.ts

Not: Testler http://localhost:3000 bekliyor; farklıysa PLAYWRIGHT_BASE_URL env’i ile değiştir:
PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e