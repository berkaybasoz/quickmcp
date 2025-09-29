# QuickMCP MSSQL Docker Setup

Bu klasör, emir iletimi uygulaması için MSSQL Server Docker container'ını içerir.

## Kullanım

### Container'ı Başlatma
```bash
cd quickmcp-docker
docker-compose up -d
```

### Container'ı Durdurma
```bash
docker-compose down
```

### Volume'ları da silmek için
```bash
docker-compose down -v
```

## Bağlantı Bilgileri

- **Server:** localhost,1435
- **Username:** sa
- **Password:** OrderApp123!
- **Database:** OrderTransmissionDB

## Veritabanı Şeması

Container ayağa kalktığında otomatik olarak aşağıdaki tablolar oluşturulur:

- **Customers** - Müşteri bilgileri
- **Products** - Ürün katalogu
- **Orders** - Siparişler
- **OrderDetails** - Sipariş detayları
- **OrderStatus** - Sipariş durumları
- **OrderTransmissionLog** - İletim logları

## Dosya Açıklamaları

### Aktif Kullanılan Dosyalar
- `docker-compose.yml` - Ana Docker Compose yapılandırması
- `entrypoint.sh` - Container başlatma scripti (otomatik veritabanı kurulumu)
- `init-db-startup.sql` - Veritabanı ve tablo oluşturma scripti

## Kurulum

**Otomatik Kurulum:** `docker-compose up -d` - Container başladığında otomatik olarak veritabanı oluşturulur

## Notlar

- Container ilk başladığında veritabanı oluşturulması ~30 saniye sürebilir
- Management Studio ile bağlantı kurarken "Trust Server Certificate" seçeneğini işaretleyin
- Port 1435 kullanılmaktadır, bu portu başka bir uygulama kullanıyorsa değiştirin



 "n8n-mcp": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "https://9hret5g2.rcsrv.com",
        "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxYTI2YTQ2ZS00YjAyLTQ0OWUtYjhiYi1iNTFlNWRmYmQ1ZGQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1Mzg1MzIyfQ.DdoBrhxlTW1XcG7uGgpKWsdHk7X394KI7V8CV8pY0HI"
      }
    },
    "simple-test": {
      "command": "node",
      "args": ["/Users/berkaybasoz/Documents/apps/quickmcp/simple-mcp-test.js"]
    },