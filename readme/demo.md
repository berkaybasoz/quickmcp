MSSQL
HOST: localhost
PORT: 1435
DB:   OrderTransmissionDB
USER: sa
PWD:  OrderApp123!

MYSQL
HOST: localhost
PORT: 3306
DB:   quickmcp
USER: root
PWD:  password

POSTGRESQL
HOST: localhost
PORT: 5432
DB:   quickmcp
USER: root
PWD:  password


REST: https://petstore.swagger.io/v2/swagger.json

WEB:  https://dolab-html.vercel.app/index.html

CURL: https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT
curl -X GET "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
curl -X GET "https://api.binance.com/api/v3/ticker/price?symbols=[\"BTCUSDT\",\"ETHUSDT\",\"BNBUSDT\"]"
curl -X GET "https://api.binance.com/api/v3/ticker/price"
curl -X GET "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"

curl -X GET https://api.restful-api.dev/objects

