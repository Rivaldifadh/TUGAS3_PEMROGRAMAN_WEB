# TUGAS3_PEMROGRAMAN_WEB - Versi Perbaikan

## Isi Perbaikan
- Menambahkan `watch` pada `doList` (deep watcher) untuk auto-persist ke `localStorage`.
- Memperbaiki typo nama fungsi `addProgressForm` (sebelumnya `addProgressform`).
- Menjamin event keyboard bekerja (Enter/Escape) via global keydown listener.
- Menggunakan modular JS (ES Modules) agar struktur lebih rapi tanpa build tool.

## Cara menjalankan (lokal)
1. Pastikan struktur file seperti:
   - index.html
   - styles.css
   - dataBahanAjar.json
   - js/main.js
   - js/app.js
2. Jalankan server lokal (disarankan) di folder project:
   - Python3: `python -m http.server 8000`
   - atau pake Live Server (VSCode)
3. Buka http://localhost:8000

## Cara membuat ZIP untuk dikumpulkan
- Pastikan project folder berisi semua file (src, js, styles, data, README.md)
- Kompres folder menjadi `TUGAS3_PEMROGRAMAN_WEB.zip` lalu unggah ke LMS atau kirim ke tutor.

