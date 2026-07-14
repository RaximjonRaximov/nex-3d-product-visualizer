# NEX — 3D mahsulot vizualizatori

Professional darajadagi 3D product configurator. GLB/GLTF fayllarini yuklang, materiallarni sozlang, skrinshot oling va to‘liq ekranda ko‘ring.

## Imkoniyatlar

- GLB va GLTF fayllarini yuklash (drag & drop yoki tanlash)
- Har bir material uchun rang, metallik, qoplama, shaffoflik, shisha effekti va ustki yorqinlikni sozlash
- Tekstura yuklash va olib tashlash
- Avto aylantirish va qoplamalar ko‘rsatish
- Skrinshot yuklab olish
- To‘liq ekran rejimi
- Moslashuvchan dizayn (desktop va mobil)
- Zamonaviy yorug‘lik va realistik qoplamalar (Three.js RoomEnvironment)

## Texnologiyalar

- Three.js (WebGL)
- GLTFLoader
- OrbitControls
- RoomEnvironment
- Vanilla JavaScript + ES modules
- HTML5/CSS3

## Ishga tushirish

```bash
cd nex-3d-product-visualizer
python3 -m http.server 8080
```

Brauzerda oching: http://localhost:8080

## Foydalanish

1. Sahifa yuklanganda "NEX Speaker" namunasi ko‘rsatiladi.
2. Chapdagi paneldan materialni tanlab rang va xususiyatlarini o‘zgartiring.
3. O‘z GLB/GLTF faylingizni yuklang.
4. "Skrinshot" tugmasi bilan tasvirni yuklab oling.

## License

Open source — istalgan loyiha uchun ishlatishingiz mumkin.
