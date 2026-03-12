  npm run build
  npm publish --dry-run
  npm publish --access public

  npx -y @softtechai/quickmcp@latest

  Belirli sürümle çalıştırma:

  npx -y @softtechai/quickmcp@1.1.0

  Global kuruluysa upgrade:

  npm i -g @softtechai/quickmcp@latest

  Projede dependency olarak upgrade:

  npm i @softtechai/quickmcp@latest

  Sürüm kontrol:

  npm view @softtechai/quickmcp version

  Not: daha önceki izin hatası tekrar çıkarsa bir kere şunu çalıştır:

  sudo chown -R $(id -u):$(id -g) ~/.npm