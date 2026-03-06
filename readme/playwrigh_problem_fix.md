1. Terminal izinlerini resetle

  tccutil reset All com.apple.Terminal

  2. Playwright cache’i temizleyip yeniden kur

  rm -rf ~/Library/Caches/ms-playwright
  npx playwright install chromium
  xattr -dr com.apple.quarantine ~/Library/Caches/ms-playwright || true

  3. Kalan headless process’leri öldür

  pkill -f "chrome-headless-shell|Chromium" || true

  4. Hızlı launch testi

  node -e "const {chromium}=require('playwright');(async()=>{const b=await
  chromium.launch({headless:true});console.log('ok');await b.close();})();"

  5. Sonra tekrar

  npm run test:e2e -- --reporter=line