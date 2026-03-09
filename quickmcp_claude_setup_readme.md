# QuickMCP + Claude Desktop Setup (Ozet)

## 1) Token var ama tool call fail oluyorsa
- `Failed to call tool "admin__BestCitiesMCP__count_bestcities"` gibi hatalarda ilk kontrol log:
  - `unauthenticated (no valid token)`
  - `auth carriers authHeader=0 bearer=0 x-mcp-token=0 query=0 body=0`
- Bu durumda Claude tarafindan token gitmiyor ya da token dogrulanamiyor.

## 2) `QUICKMCP_RSA_PRIVATE_KEY` neden gerekli?
- RS256 token dogrulamada QuickMCP bir public/private key ciftine bakar.
- `QUICKMCP_RSA_PRIVATE_KEY` **vermezsen**, her acilista yeni (ephemeral) RSA key uretilir.
- Bu da onceki tokenlari restart sonrasinda gecersiz yapar.
- `QUICKMCP_RSA_PRIVATE_KEY` verirsen:
  - QuickMCP acilista yeni key uretmez.
  - Env'deki key'i kullanir.
  - Restart sonrasi tokenlar gecerliligini korur.

## 3) Claude Desktop config env
- En az su degiskenleri ayni anda ver:
  - `QUICKMCP_TOKEN`
  - `QUICKMCP_RSA_PRIVATE_KEY` (base64 PEM)
- Opsiyonel:
  - `QUICKMCP_RSA_KID`

## 4) QuickMCP STDIO tarafinda yapilan kritik fix
- `quickmcp-direct-stdio.js` icinde auth context cozumleme async idi.
- `resolveAuthContextFromSources` artik `await` ile cagriliyor.
- Boylece verilen default token gercekten isleniyor.

## 5) Beklenen dogru log davranisi
- Baslangicta:
  - `MCP token present: yes`
- Requestlerde:
  - `auth: no token in request, using default token`
  - ve `unauthenticated` yerine kullanici/workspace bilgisi gorulmeli.

