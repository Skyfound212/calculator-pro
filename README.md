# ðŸ§® CalculatorPro

Kalkulator profesional dengan mode Basic dan Scientific. Desain modern, cepat, dan akurat untuk kebutuhan kalkulasi harian Anda.

[![Deploy Status](https://img.shields.io/badge/deployed-cloudflare%20pages-orange)](https://calculatorpro.pages.dev)
[![React](https://img.shields.io/badge/react-18.3.1-blue)](https://react.dev)
[![Vite](https://img.shields.io/badge/vite-5.3.1-646CFF)](https://vitejs.dev)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## âœ¨ Fitur

### ðŸ§® Kalkulator
- **Mode Basic** â€” Aritmatika standar (+, âˆ’, Ã—, Ã·), persentase, akar kuadrat
- **Mode Scientific** â€” Trigonometri (sin, cos, tan), logaritma, pangkat, faktorial, konstanta (Ï€, e)
- **Memory Functions** â€” MC, MR, M+, Mâˆ’, MS
- **Riwayat** â€” Simpan 50 perhitungan terakhir
- **Keyboard Support** â€” Input cepat via keyboard (angka, operator, Enter, Backspace, Escape)

### ðŸŒŒ SkyRoom
- **Ruang rahasia** â€” Akses via secret code (default: `123+=`)
- **Efek glitch** â€” Animasi cyberpunk saat unlock

### ðŸ“¦ Gudang
- **File manager** â€” Upload, simpan, kelola file
- **IndexedDB storage** â€” Penyimpanan lokal yang reliable
- **Share link** â€” Bagikan file via URL
- **Favorit & Sampah** â€” Organisasi file yang intuitif

### ðŸ“ Ruang Kerja
- **Editor multi-format** â€” HTML, CSS, JS, JSON, Markdown, Plain Text
- **Template siap pakai** â€” Boilerplate untuk development
- **Live Preview** â€” Preview real-time untuk HTML & Markdown
- **Export** â€” Download sebagai file atau PDF
- **Kirim ke Gudang** â€” Langsung simpan hasil kerja ke file manager

---

## ðŸ› ï¸ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | React 18 + Vite |
| Routing | React Router DOM v6 |
| Styling | CSS-in-JS (inline `<style>`) |
| Storage | IndexedDB + localStorage |
| PWA | Service Worker + Cache API |
| Deploy | Cloudflare Pages |

---

## ðŸ“ Struktur Project

```
calculatorpro/
â”œâ”€â”€ public/
â”‚   â”œâ”€â”€ sw.js              # Service Worker (PWA)
â”‚   â”œâ”€â”€ index.html
â”‚   â””â”€â”€ icons/             # PWA icons (72x72 - 512x512)
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ pages/
â”‚   â”‚   â”œâ”€â”€ Calculator.jsx           # Mode Basic
â”‚   â”‚   â”œâ”€â”€ CalculatorScientific.jsx # Mode Scientific
â”‚   â”‚   â”œâ”€â”€ SkyRoom.jsx              # Secret room
â”‚   â”‚   â”œâ”€â”€ Gudang.jsx               # File manager
â”‚   â”‚   â”œâ”€â”€ RuangKerja.jsx           # Code editor
â”‚   â”‚   â””â”€â”€ SplashScreen.jsx         # Loading screen
â”‚   â”œâ”€â”€ utils/
â”‚   â”‚   â”œâ”€â”€ calculator.js            # Math engine + history
â”‚   â”‚   â””â”€â”€ constants.js             # App constants & storage keys
â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”œâ”€â”€ useLocalStorage.js       # Storage hook
â”‚   â”‚   â””â”€â”€ useSecretCode.js         # Secret code detector
â”‚   â”œâ”€â”€ App.jsx                      # Router & splash logic
â”‚   â”œâ”€â”€ main.jsx                     # Entry point + SW register
â”‚   â””â”€â”€ index.css                    # Global styles
â”œâ”€â”€ vite.config.js
â””â”€â”€ package.json
```

---

## ðŸš€ Development

```bash
# Clone repository
git clone https://github.com/Skyfound212/calculator-pro.git
cd calculator-pro

# Install dependencies
npm install

# Run dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## ðŸ”§ Konfigurasi

### Secret Code
Default: `123+=`

Ubah di `src/utils/constants.js`:
```javascript
SECRET_CODE: {
  DEFAULT: '123+=',    // Ganti dengan kode Anda
  ...
}
```

### Storage Keys
Semua key localStorage/IndexedDB terpusat di `src/utils/constants.js`:
```javascript
STORAGE_KEYS: {
  CALC_HISTORY: 'calculatorpro_history',
  CALC_MEMORY: 'calculatorpro_memory',
  GUDANG_DATA: 'calculatorpro_gudang_data',
  RUANGKERJA_DRAFTS: 'calculatorpro_ruangkerja_drafts',
  ...
}
```

---

## ðŸ“± PWA Install

1. Buka [calculatorpro.pages.dev](https://calculatorpro.pages.dev) di Chrome/Safari
2. Tap **"Add to Home Screen"** / **"Install App"**
3. Gunakan offline!

---

## ðŸ› Bug Fixes (v1.0.1)

| Bug | Fix |
|-----|-----|
| Tombol `()` tidak berfungsi | Handler parentheses dengan stack state |
| Parse angka desimal salah | `parseLocaleNumber()` untuk locale id-ID |
| XSS di Markdown preview | Parser aman tanpa `dangerouslySetInnerHTML` |
| Storage quota exceeded | Cek limit sebelum save + cleanup otomatis |
| `newWorker` null reference | Guard clause sebelum event listener |

---

## ðŸ“„ License

MIT License â€” bebas digunakan, modifikasi, dan distribusi.

---

## ðŸ‘¤ Author

**SkyFound** â€” Dibuat dengan â˜• dan kode.

---

> *"Kalkulator yang tidak hanya menghitung, tapi juga menginspirasi."*