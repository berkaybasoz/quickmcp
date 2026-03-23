# QuickMCP + Claude Desktop Setup

## 1) QUICKMCP_TOKEN_MODE nedir?
QuickMCP, MCP token dogrulama modunu `QUICKMCP_TOKEN_MODE` ile belirler.

Degerler:
- `RSA`
- `LOCAL`

Default davranis:
- `DEPLOY_MODE=SAAS` -> default `QUICKMCP_TOKEN_MODE=RSA`
- `DEPLOY_MODE=ONPREM` (veya `ON_PREM`) -> default `QUICKMCP_TOKEN_MODE=LOCAL`

Not:
- `QUICKMCP_TOKEN_MODE` acikca verilirse defaultu override eder.

## 2) Modlarin calisma sekli

### RSA modu
- Token JWT olarak imza dogrulamadan gecer.
- RS256 kullaniliyorsa public/private key eslesmesi gerekir.
- `QUICKMCP_RSA_PRIVATE_KEY` yoksa process acilisinda gecici key uretilir; token stabilitesi bozulur.
- Sonrasinda token policy kontrolleri (`mcp_tokens`) yine uygulanir.

### LOCAL modu
- JWT signature dogrulamasi yapilmaz.
- Gelen token icin `sha256(token)` hesaplanir.
- `mcp_tokens.token_hash` uzerinden DB'de kayit aranir.
- Kayıt varsa token kimligi/izinleri DB kaydindan okunur.
- `revoked`, `expires`, server/tool/resource policy kontrolleri yine uygulanir.

## 3) ONPREM icin onerilen sade kurulum (RSA'siz)

Server:
- `DEPLOY_MODE=ONPREM`
- `AUTH_MODE=LITE`
- `QUICKMCP_TOKEN_MODE=LOCAL`

Claude Desktop `mcpServers` env:
- `QUICKMCP_TOKEN=<token>`
- `QUICKMCP_TOKEN_MODE=LOCAL`
- (opsiyonel) `DEPLOY_MODE=ONPREM`
- (opsiyonel) `AUTH_MODE=LITE`

Bu senaryoda `QUICKMCP_RSA_PRIVATE_KEY` vermek zorunda degilsin.

## 4) SAAS icin onerilen kurulum
- `QUICKMCP_TOKEN_MODE=RSA` (zaten default)
- `QUICKMCP_RSA_PRIVATE_KEY` sabit verilmelidir.
- Aksi halde restartlarda gecici key uretilir ve tokenlar invalid olabilir.

## 5) Sik hata ve log yorumlama

### `Failed to call tool ...`
Genelde auth kaynaklidir. Su loglari kontrol et:
- `Failed to resolve auth context: Invalid MCP token`
- `unauthenticated (no valid token)`
- `Sending: error`

### Token gitti mi?
Asagidaki log tokenin request ile gelmedigini gosterir:
- `auth carriers authHeader=0 bearer=0 x-mcp-token=0 query=0 body=0`

Eger ayni anda su log varsa:
- `auth: no token in request, using default token`
o zaman QuickMCP `QUICKMCP_TOKEN` env degerini kullanmaya calisiyordur.

## 6) Claude Desktop ve local process notu
- Claude, `quickmcp-direct-stdio.js` icin kendi STDIO processini acar.
- Bu processin env'i (Claude configteki `env`) web server env'inden bagimsiz olabilir.
- Bu nedenle ayni token mode/env degerlerini Claude configte de tanimlamak gerekir.
