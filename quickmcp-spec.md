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
