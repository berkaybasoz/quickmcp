~/Library/Logs/Claude/mcp-server-quickmcp-local.log

********************************************************************************************************************

MSSQL
HOST: localhost
PORT: 1435
DB:   OrderTransmissionDB
USER: sa
PWD:  OrderApp123!
NAME: MSSQL-ORDER

********************************************************************************************************************

MYSQL
HOST: localhost
PORT: 3306
DB:   quickmcp
USER: root
PWD:  password
NAME: MYSQLDB-FINANCE

********************************************************************************************************************

POSTGRESQL 
HOST: localhost
PORT: 5432
DB:   quickmcp
USER: user
PWD:  password
NAME: POSTGRE-BANKING

********************************************************************************************************************

REST
URL: https://petstore.swagger.io/v2/swagger.json
NAME: REST-PETSTORE

********************************************************************************************************************

WEB
URL: https://dolab-html.vercel.app/index.html
ALIAS: dolab
NAME: WEBPAGE-DOLAB

********************************************************************************************************************

CURL
ALIAS: binance
COMMAND: curl -X GET "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
NAME: CURL-BINANCE

https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT
curl -X GET "https://api.binance.com/api/v3/ticker/price?symbols=[\"BTCUSDT\",\"ETHUSDT\",\"BNBUSDT\"]"
curl -X GET "https://api.binance.com/api/v3/ticker/price"
curl -X GET "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"
curl -X GET https://api.restful-api.dev/objects

********************************************************************************************************************

github notion'da
NAME: GITHUB-BERKAY

********************************************************************************************************************

jira
URL: https://jira.softtech.com.tr
USERNAME: berkay.basoz
NAME: JIRA-SOFTTECH

********************************************************************************************************************

sftp
sftp://select.datascope.refinitiv.com
user: r9039747
port: 22
Şifre: <<TOKEN>>
NAME: SFTP

********************************************************************************************************************

mail
imap sunucu: imap.gmail.com 
imap port: 993
smtp sunucu: smtp.gmail.com
smtp port: 587
mail: archdrawcontact@gmail.com
pwd: <<TOKEN>>
NAME: GMAIL-BERKAY

********************************************************************************************************************

MONGODB 
Port: 27017
User: root
Password: password
DB: quickmcp
NAME: MONGODB

********************************************************************************************************************

N8N
"N8N_API_URL": "https://9hret5g2.rcsrv.com",
"N8N_API_KEY": <<TOKEN>>

********************************************************************************************************************

Hazelcast
Member Host: localhost
Member Host (Docker içinde): quickmcp-hazelcast
Member Port: 5701
Cluster Name (Optional): dev
