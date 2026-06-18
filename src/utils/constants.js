// ============================================
// CALCULATORPRO - CONSTANTS
// ============================================

// Secret Code Configuration
export const SECRET_CODE = {
  DEFAULT: '123+=',
  MIN_LENGTH: 4,
  MAX_LENGTH: 10,
  MUST_END_WITH: '=',
  TIMEOUT_MS: 3000, // Reset buffer after 3s inactivity
  STORAGE_KEY: 'calculatorpro_secret_code'
}

// Calculator Configuration
export const CALCULATOR = {
  MAX_DIGITS: 15,
  DECIMAL_PRECISION: 10,
  HISTORY_LIMIT: 50
}

// Memory Functions
export const MEMORY = {
  STORAGE_KEY: 'calculatorpro_memory'
}

// App Configuration
export const APP = {
  NAME: 'CalculatorPro',
  VERSION: '1.0.0',
  SPLASH_DURATION: 3000,
  THEME: {
    DARK: 'dark',
    MIDNIGHT: 'midnight',
    STEALTH: 'stealth'
  }
}

// SkyRoom Configuration
export const SKYROOM = {
  STORAGE_KEY: 'calculatorpro_skyroom_settings',
  AUTO_LOCK_MINUTES: 5,
  DEFAULT_THEME: 'dark'
}

// Gudang Configuration
export const GUDANG = {
  STORAGE_KEY: 'calculatorpro_gudang_data',
  TRASH_DAYS: 30,
  MAX_UPLOAD_SIZE_MB: 100,
  SUPPORTED_PREVIEW: {
    IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
    AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
    PDF: ['application/pdf'],
    TEXT: ['text/plain', 'text/markdown', 'text/csv', 'application/json'],
    CODE: ['text/javascript', 'text/css', 'text/html']
  }
}

// RuangKerja Configuration
export const RUANG_KERJA = {
  STORAGE_KEY: 'calculatorpro_ruangkerja_drafts',
  EXPORT_FORMATS: {
    DEPLOYMENT: ['html', 'css', 'js', 'json'],
    DOCUMENT: ['pdf', 'md', 'txt']
  },
  TEMPLATES: {
    HTML_BLANK: {
      name: 'HTML Kosong',
      content: '<!DOCTYPE html>\\n<html lang=\"id\">\\n<head>\\n  <meta charset=\"UTF-8\">\\n  <title>Judul</title>\\n</head>\\n<body>\\n  <!-- Konten di sini -->\\n</body>\\n</html>'
    },
    CSS_RESET: {
      name: 'CSS Reset',
      content: '* {\\n  margin: 0;\\n  padding: 0;\\n  box-sizing: border-box;\\n}\\n\\nbody {\\n  font-family: sans-serif;\\n}'
    },
    JS_MODULE: {
      name: 'JS Module',
      content: '// Module\\nexport function init() {\\n  console.log(\"Ready\");\\n}\\n\\ninit();'
    },
    JSON_CONFIG: {
      name: 'JSON Config',
      content: '{\\n  \"name\": \"app\",\\n  \"version\": \"1.0.0\",\\n  \"main\": \"index.js\"\\n}'
    },
    MD_README: {
      name: 'README',
      content: '# Judul\\n\\nDeskripsi singkat.\\n\\n## Cara Penggunaan\\n\\n1. Langkah 1\\n2. Langkah 2\\n\\n---\\n\\n© 2024'
    },
    TXT_NOTE: {
      name: 'Catatan',
      content: 'Catatan:\\n\\n- Item 1\\n- Item 2\\n- Item 3\\n\\nTanggal: ___________'
    }
  }
}

// LocalStorage Keys (centralized to avoid collisions)
export const STORAGE_KEYS = {
  SPLASH_SEEN: 'calculatorpro_splash_seen',
  CALC_HISTORY: 'calculatorpro_history',
  CALC_MEMORY: 'calculatorpro_memory',
  SKYROOM_SETTINGS: 'calculatorpro_skyroom_settings',
  GUDANG_DATA: 'calculatorpro_gudang_data',
  RUANGKERJA_DRAFTS: 'calculatorpro_ruangkerja_drafts',
  SECRET_CODE: 'calculatorpro_secret_code'
}

// File Type Icons Mapping
export const FILE_ICONS = {
  folder: '📁',
  image: '🖼️',
  video: '🎬',
  audio: '🎵',
  pdf: '📄',
  text: '📝',
  code: '💻',
  archive: '📦',
  unknown: '📎'
}

// Animation Durations (ms)
export const ANIMATION = {
  FAST: 150,
  NORMAL: 250,
  SLOW: 400,
  SPLASH: 3000,
  TRANSITION: 500
}