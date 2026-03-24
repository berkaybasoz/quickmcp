# QuickMCP SPA Donusum Spesifikasyonu

## Karar Ozeti

- Backend tarafi `Express` olarak kalacak.
- Frontend, duz HTML sayfalar yerine SPA yapisina tasinacak.
- Hedef frontend stack: `React + TypeScript + Vite + Tailwind CSS + Framer Motion + Zustand`.
- Iletisim modeli: `REST` (zorunlu), `WebSocket` (opsiyonel gercek-zamanli kisimlar icin).
- Uygulama derlendikten sonra `npm` ile local makinelerde calisabilir olmaya devam edecek.

## Neden Bu Yapi

- Express zaten mevcut API ve calisma modelini tasiyor; backend rewrite riski yok.
- Vite tabanli SPA, partial/page/component yonetimini kolaylastirir.
- Local-first calisma modelinde (localhost) kurulum ve dagitim Next.js/NestJS kombinasyonuna gore daha sade olur.

## Hedef Mimari

- Frontend (`web-spa`):
  - React SPA
  - Route yonetimi: `react-router-dom`
  - State yonetimi: `zustand`
  - UI: Tailwind + Framer Motion
  - Ortak layout: tum sayfalarda tek bir `AppBar` ve tek bir `Sidebar` bileseni kullanilacak
- Backend (`src/server`):
  - Express API endpointleri korunur
  - Build edilmis SPA dosyalari static olarak servis edilir
  - SPA fallback route (`* -> index.html`) eklenir

## Ortak Layout Kurali

- Appbar ve sidebar tum sayfalarda ortak olacak (copy-paste HTML olmayacak).
- Ortak layout root seviyede konumlanacak; sayfalar sadece icerik bolgesini render edecek.
- Tema/sidebar state'i (collapse, aktif menu, vb.) merkezi state/store uzerinden yonetilecek.

## Dagitim Gereksinimi

- `npm install` + `npm run build` + `npm start` ile calismali.
- Paket icine frontend build ciktilari da dahil edilmeli (`files` alanina eklenmeli).
- Kullanici sadece Node/NPM ile localde uygulamayi acabilmeli.

## Uygulanmayacak Secenek

- Bu fazda `Next.js 14 + NestJS` mimarisine gecilmeyecek.
- Gerekce: local desktop benzeri kullanimda gereksiz operational complexity ve cikis artefakti karmasasi.

## Kademeli Gecis Plani

- Asama 1: React SPA iskeleti, temel layout ve route yapisi.
- Asama 2: Mevcut sayfalarin component bazli tasinmasi (Generate, Manage, Test, Authorization, Quick Ask).
- Asama 3: Express static serve + SPA fallback + production build entegrasyonu.
- Asama 4: E2E testlerin SPA route yapisina gore guncellenmesi.

## Uygulama Baslangic Kurali (Single Fetch + Local State)

- Uygulama acilisinda ortak remote veriler bir kez alinacak:
  - `/api/auth/me`
  - `/api/auth/config`
  - gerekli ise ozet dashboard verileri
- Bu veriler merkezi store icinde tutulacak (`zustand`).
- Ekrandaki buton aksiyonlari sonrasi tam sayfa yenilenmesi olmayacak; state store uzerinden guncellenecek.
- Browser refresh yapilmadikca ayni temel veriler tekrar fetch edilmeyecek (manuel invalidate haric).

## SPA Navigasyon Kurali

- Sol menu tiklamalari `window.location.href` ile degil `react-router-dom` ile yonetilecek.
- Full page refresh / redirect davranisi kaldirilacak.
- Ortak `Layout` altinda sadece icerik paneli degisecek.

## MVVM Dosya Organizasyonu

- `web-spa/src/app`: app bootstrap, providers, router
- `web-spa/src/shared`: ortak UI, utils, api client, type modelleri
- `web-spa/src/features/<feature>/model`: dto + mapper + domain model
- `web-spa/src/features/<feature>/viewmodel`: ekran state ve use-case akislari
- `web-spa/src/features/<feature>/view`: React componentleri

## Sprint 0 (Hemen Baslanacak Isler)

1. `web-spa` klasoru olustur (React + TypeScript + Vite + Tailwind + Zustand + Framer Motion).
2. Ortak `AppLayout` (AppBar + Sidebar + Content outlet) kur.
3. Router tanimla:
   - `/quick-ask`
   - `/generate`
   - `/manage-servers`
   - `/test-servers`
   - `/authorization`
   - `/users`
   - `/how-to-use`
4. `app bootstrap store` olustur:
   - app acilisinda `auth me + auth config` tek fetch
   - loading/error state
5. Sol menu davranisini SPA nav olacak sekilde uygula (refresh yok).

## Express Entegrasyon Kurali

- Backend API endpointleri aynen kalacak.
- Uretim build sonrasi SPA dosyalari static servis edilecek.
- `GET /api/*` disindaki route'lar SPA `index.html` fallback ile donecek.
- Yetkilendirme kontrolleri backend tarafinda korunacak; frontend sadece route-level UX kontrolu yapacak.

## Kabul Kriterleri

- Sol menu tiklamasinda browser tam yenilenmeyecek.
- App acilisinda ortak config/me endpointleri bir kez cagrilacak.
- Ayni oturumda ekran gecislerinde tekrar fetch olmayacak (invalidate edilmedikce).
- Ortak AppBar/Sidebar tek yerde tanimli olacak (copy-paste HTML olmayacak).
- `npm run build` ve `npm start` ile uygulama calismaya devam edecek.
