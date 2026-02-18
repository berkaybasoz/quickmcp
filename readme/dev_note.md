1. Supabase UUID Kullanın (En Güvenli)
javascript// Supabase auth.users.id zaten UUID
const userId = user.id; // Full UUID
// Tool: 550e8400-e29b-41d4-a716-446655440000__OrderMCP__get_orders
Çakışma riski: Yok (UUID standart)
2. UUID İlk 12-16 Karakteri
javascriptconst userId = user.id.substring(0, 12); // 550e8400e29b
// Tool: 550e8400e29b__OrderMCP__get_orders
Çakışma riski: 2^48 = 281 trilyon kombinasyon (pratikçe yok)
3. Incremental User ID
sqlCREATE SEQUENCE user_id_seq;
javascriptconst userId = user.user_number; // 1, 2, 3, ...
// Tool: user_00001__OrderMCP__get_orders
Çakışma riski: Yok
4. Email + Collision Check
javascriptasync function generateUserId(email) {
  const hash = md5(email).substring(0, 8);
  
  // Database'de kontrol et
  const exists = await checkCollision(hash);
  
  if (exists) {
    // Collision varsa, daha uzun hash kullan
    return md5(email).substring(0, 12);
  }
  
  return hash;
}
Önerim: Supabase UUID Kullanın
javascript// Supabase'de
const user = supabase.auth.user();
const toolPrefix = user.id; // Full UUID, garantili unique

// Tool name
const toolName = `${user.id}__OrderMCP__get_orders`;

// Eğer çok uzun geliyorsa:
const shortId = user.id.replace(/-/g, '').substring(0, 16);
// 550e8400e29b41d4__OrderMCP__get_orders
```

**Neden UUID?**
- ✅ Supabase'de zaten var
- ✅ %100 unique
- ✅ Index'lenmiş
- ✅ Güvenli
- ✅ Standart

**Tool ismi uzunluğu:**
```
550e8400-e29b-41d4-a716-446655440000__OrderMCP__avg_ordertransmissionlog_transmissionid
= 36 + 2 + 58 = 96 karakter
Hala 100 karakter altında ve güvenli! 🎯
Kaç kullanıcı bekliyorsunuz sistemde?