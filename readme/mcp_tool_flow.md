Aşağıdaki akış şu dosyalardaki gerçek koda dayanıyor:
  electron-simple.js:1020, ChatInterface.tsx:928

  1. Renderer’dan Electron’a istek gider
     ChatInterface şunu yollar: provider=claude, messages, model, apiKey, attachments (ChatInterface.tsx:928).
  2. Electron, Claude’a ilk REST isteğini atar
     Endpoint: POST https://api.anthropic.com/v1/messages
     Header: x-api-key, anthropic-version: 2023-06-01 (electron-simple.js:1072)

  Örnek giden body (şema birebir, içerik örnek):

  {
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 4000,
    "messages": [
      {
        "role": "user",
        "content": "Bana dosya listesini çıkar"
      }
    ],
    "tools": [
      {
        "name": "list_files",
        "description": "MCP tool from Filesystem Server",
        "input_schema": {
          "type": "object",
          "properties": {
            "path": { "type": "string" }
          },
          "required": ["path"]
        }
      }
    ]
  }

  tools alanı mcpManager.getAllTools() ile dolduruluyor (electron-simple.js:1025).

  3. Claude’dan gelen cevap iki tip olabilir
     Normal cevap örneği:

  {
    "id": "msg_xxx",
    "type": "message",
    "role": "assistant",
    "content": [
      { "type": "text", "text": "İşte sonuç..." }
    ],
    "stop_reason": "end_turn"
  }

  Tool çağrısı isteyen cevap örneği:

  {
    "id": "msg_xxx",
    "type": "message",
    "role": "assistant",
    "content": [
      { "type": "text", "text": "Önce aracı çalıştırıyorum." },
      {
        "type": "tool_use",
        "id": "toolu_123",
        "name": "list_files",
        "input": { "path": "/tmp" }
      }
    ],
    "stop_reason": "tool_use"
  }

  Bu durum stop_reason === "tool_use" ile yakalanıyor (electron-simple.js:1090).

  4. Tool sonucu Claude’a geri gönderilir (2. REST çağrısı)
     App MCP tool’u çalıştırır: mcpManager.callTool(...) (electron-simple.js:1108) ve Claude’a ikinci çağrıyı yapar:

  {
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 4000,
    "messages": [
      { "role": "user", "content": "Bana dosya listesini çıkar" },
      { "role": "assistant", "content": [/* Claude'un tool_use cevabı */] },
      {
        "role": "user",
        "content": [
          {
            "type": "tool_result",
            "tool_use_id": "toolu_123",
            "content": "{\"files\":[\"a.txt\",\"b.txt\"]}"
          }
        ]
      }
    ],
    "tools": [/* yine MCP tools */]
  }

  Son cevap geldikten sonra UI tarafında response.data.content[0]?.text gösteriliyor (ChatInterface.tsx:941).