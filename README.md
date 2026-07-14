# NEX — Professional 3D mahsulot vizualizatori

To‘liq professional darajadagi 3D product configurator. GLB/GLTF fayllarini yuklang, materiallarni sozlang, skrinshot oling va brend mahsulotlaringizni realistik 3D ko‘rinishda taqdim eting.

## Imkoniyatlar

- GLB va GLTF fayllarini drag & drop yoki tanlash orqali yuklash
- Har bir material uchun rang, metallik, qoplama, shaffoflik, shisha effekti va ustki yorqinlikni sozlash
- Tekstura yuklash va olib tashlash
- Tez material presetlar: Plastik, Metal, Shisha, Mato, Karbon
- 4 xil yoritgich presetsi: Studio, Issiq, Sovuq, Tun
- Bloom post-processing effekti (yoqish/o‘chirish)
- Avto aylantirish, qoplamalar, kamerani tiklash
- Skrinshot yuklab olish (PNG)
- To‘liq ekran rejimi
- Mahsulot statistikasi: meshlar, vertexlar, uchburchaklar, materiallar
- Moslashuvchan dizayn (desktop va mobil)
- SEO optimallashtirilgan: semantic HTML, Open Graph, Twitter Card, JSON-LD
- WebGL 2 va Three.js orqali zamonaviy 3D grafika

## 3D va vizual xususiyatlar

- Three.js `RoomEnvironment` + `PMREMGenerator` orqali realistik refleksiyalar
- `RectAreaLight` yordamida studiya yoritgichlari
- `EffectComposer` va `UnrealBloomPass` bilan post-processing
- `GLTFLoader` orqali 3D modellarni import qilish
- `MeshPhysicalMaterial` asosida keng qamrovli material sozlamalari

## Texnologiyalar

- Three.js r160 (WebGL 2)
- GLTFLoader, OrbitControls, RoomEnvironment
- RectAreaLightUniformsLib
- EffectComposer, RenderPass, UnrealBloomPass
- Vanilla JavaScript (ES modules)
- HTML5 semantic + ARIA
- CSS3 custom properties, grid, flexbox

## Ishga tushirish

```bash
cd nex-3d-product-visualizer
python3 -m http.server 8081
```

Brauzerda oching: http://localhost:8081

## Foydalanish

1. Sahifa ochilganda tayyor NEX Watch namunasi ko‘rsatiladi.
2. Chapdagi paneldan materialni tanlab rang va xususiyatlarini o‘zgartiring.
3. "Tez presetlar" dan foydalanib, materialni bir zumda o‘zgartiring.
4. "Studiya sozlamalari" dan yoritgich va bloom effektini boshqaring.
5. O‘z GLB/GLTF faylingizni yuklang va uni tahrirlang.
6. "Skrinshot" tugmasi bilan joriy ko‘rinishni yuklab oling.

## SEO va qo‘shimcha

- `index.html` da to‘liq meta teglar, Open Graph va JSON-LD structured data mavjud.
- `lang="uz"`, semantic teglar, ARIA label va skip-link kiritilgan.
- Brauzer cache va tez yuklash uchun `preconnect` optimallashtirilgan.

## License

Open source — istalgan loyiha uchun erkin foydalanishingiz mumkin.
