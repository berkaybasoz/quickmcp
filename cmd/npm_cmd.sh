npm install
npm run dev
npm audit
npm audit fix
npm audit fix --force 
npm update

npm install xlsx@latest
npm uninstall xlsx
npm install exceljs

# QuickMCP'yi çaliştırmak için
quickmcp
ya da 
npx @softtechai/quickmcp

# QuickMCP'yi publish için
npm pkg set name=@softtechai/quickmcp
npm publish


Kullanım
- `npx -y @softtechai/quickmcp` → UI: `http://localhost:3000`, MCP sidecar: `3001`
- İsteğe bağlı:
  - `--data-dir=./data` → SQLite konumunu belirler

İsteğe bağlı kapatma (opt-out)
- Flag: `--no-web`
- Env: `QUICKMCP_ENABLE_WEB=0` veya `QUICKMCP_DISABLE_WEB=1`

Claude Desktop örneği
- `"quickmcp": { "command": "npx", "args": ["-y", "@softtechai/quickmcp"] }`
  - Artık ekstra flag gerekmeden UI açılır.
- UI istemiyorsanız:
  - `"args": ["-y", "@softtechai/quickmcp", "--no-web"]` veya `"env": { "QUICKMCP_ENABLE_WEB": "0" }`


1. Komut Satırından (En Hızlı)
quickmcp --version
veya
quickmcp -v
2. npm list Komutu
Global olarak yüklü paketin versiyonunu görmek için:
npm list -g @softtechai/quickmcp
veya sadece derinlik 0'da (daha temiz çıktı):
npm list -g @softtechai/quickmcp --depth=0
3. npm info Komutu
Paketin en son yayınlanan versiyonunu görmek için:
npm info @softtechai/quickmcp version
veya tüm bilgileri görmek için:
npm info @softtechai/quickmcp



npm pkg set name=@softtechai/quickmcp

en çok kullanılacaklar
npm run build
npm publish
npm i -g @softtechai/quickmcp
npm list -g @softtechai/quickmcp
npm uninstall -g @softtechai/quickmcp

