import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { STORAGE_KEYS } from '../utils/constants'

// IDB Helpers
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CalculatorProDB', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' })
      }
    }
  })
}

const idbRequest = (request) => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const transactionComplete = (tx) => {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Simple XSS sanitizer
const sanitizeHtml = (html) => {
  if (!html) return ''
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

// Parse Markdown aman
const parseMarkdown = (content) => {
  if (!content) return []
  
  const lines = content.split('\n')
  const elements = []
  let inCodeBlock = false
  let codeContent = []
  let key = 0
  
  const addElement = (type, props) => {
    elements.push({ type, props, key: key++ })
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        addElement('pre', { children: codeContent.join('\n') })
        codeContent = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      continue
    }
    
    if (inCodeBlock) {
      codeContent.push(line)
      continue
    }
    
    if (line.includes('`')) {
      const parts = []
      let text = line
      let match
      const regex = /`([^`]+)`/g
      let lastIndex = 0
      
      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
        }
        parts.push({ type: 'code', content: match[1] })
        lastIndex = match.index + match[0].length
      }
      if (lastIndex < text.length) {
        parts.push({ type: 'text', content: text.slice(lastIndex) })
      }
      
      addElement('p', { parts })
      continue
    }
    
    if (line.startsWith('# ')) {
      addElement('h1', { children: line.slice(2) })
      continue
    }
    if (line.startsWith('## ')) {
      addElement('h2', { children: line.slice(3) })
      continue
    }
    if (line.startsWith('### ')) {
      addElement('h3', { children: line.slice(4) })
      continue
    }
    
    let processed = line
      .replace(/\*\*(.*?)\*\*/g, '<<BOLD>>$1<<</BOLD>>')
      .replace(/\*(.*?)\*/g, '<<ITALIC>>$1<<</ITALIC>>')
    
    if (processed !== line) {
      const parts = []
      let text = processed
      let idx = 0
      
      while (idx < text.length) {
        const boldStart = text.indexOf('<<BOLD>>', idx)
        const italicStart = text.indexOf('<<ITALIC>>', idx)
        
        let nextIdx = Math.min(
          boldStart !== -1 ? boldStart : Infinity,
          italicStart !== -1 ? italicStart : Infinity
        )
        
        if (nextIdx === Infinity) {
          parts.push({ type: 'text', content: text.slice(idx) })
          break
        }
        
        if (nextIdx > idx) {
          parts.push({ type: 'text', content: text.slice(idx, nextIdx) })
        }
        
        if (boldStart !== -1 && boldStart === nextIdx) {
          const end = text.indexOf('<</BOLD>>', boldStart)
          if (end !== -1) {
            parts.push({ type: 'bold', content: text.slice(boldStart + 8, end) })
            idx = end + 9
          } else {
            parts.push({ type: 'text', content: text.slice(idx) })
            break
          }
        } else if (italicStart !== -1 && italicStart === nextIdx) {
          const end = text.indexOf('<</ITALIC>>', italicStart)
          if (end !== -1) {
            parts.push({ type: 'italic', content: text.slice(italicStart + 10, end) })
            idx = end + 11
          } else {
            parts.push({ type: 'text', content: text.slice(idx) })
            break
          }
        }
      }
      
      addElement('p', { parts })
      continue
    }
    
    if (line.startsWith('- ')) {
      addElement('li', { children: line.slice(2) })
      continue
    }
    
    if (line.trim() === '') {
      addElement('br', {})
      continue
    }
    
    addElement('p', { children: line })
  }
  
  if (inCodeBlock && codeContent.length > 0) {
    addElement('pre', { children: codeContent.join('\n') })
  }
  
  return elements
}

// Render parsed markdown
const MarkdownPreview = ({ content }) => {
  const elements = parseMarkdown(content)
  
  return (
    <div className="preview-md">
      {elements.map((el) => {
        switch (el.type) {
          case 'h1':
            return <h1 key={el.key} className="md-h1">{el.props.children}</h1>
          case 'h2':
            return <h2 key={el.key} className="md-h2">{el.props.children}</h2>
          case 'h3':
            return <h3 key={el.key} className="md-h3">{el.props.children}</h3>
          case 'p':
            if (el.props.parts) {
              return (
                <p key={el.key}>
                  {el.props.parts.map((part, idx) => {
                    if (part.type === 'text') return <span key={idx}>{part.content}</span>
                    if (part.type === 'bold') return <strong key={idx}>{part.content}</strong>
                    if (part.type === 'italic') return <em key={idx}>{part.content}</em>
                    if (part.type === 'code') return <code key={idx} className="md-inline-code">{part.content}</code>
                    return null
                  })}
                </p>
              )
            }
            return <p key={el.key}>{el.props.children}</p>
          case 'li':
            return <li key={el.key} className="md-li">{el.props.children}</li>
          case 'pre':
            return <pre key={el.key} className="md-pre"><code>{el.props.children}</code></pre>
          case 'br':
            return <div key={el.key} style={{ height: '8px' }} />
          default:
            return null
        }
      })}
    </div>
  )
}

const checkStorageQuota = (dataSize) => {
  const limit = 4.5 * 1024 * 1024
  let used = 0
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length * 2
    }
  }
  return (used + dataSize) < limit
}

function RuangKerja() {
  const navigate = useNavigate()
  
  const [content, setContent] = useState('')
  const [fileName, setFileName] = useState('dokumen.txt')
  const [selectedFormat, setSelectedFormat] = useState('txt')
  const [showPreview, setShowPreview] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [folders, setFolders] = useState([{ id: 'root', name: 'Semua File' }])
  const [selectedFolderId, setSelectedFolderId] = useState('root')
  const [savedDrafts, setSavedDrafts] = useState([])
  const [showDrafts, setShowDrafts] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [lineCount, setLineCount] = useState(0)
  const [exportError, setExportError] = useState(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RUANGKERJA_DRAFTS)
      if (stored) setSavedDrafts(JSON.parse(stored))
    } catch (err) {
      console.error('Failed to load drafts:', err)
    }
  }, [])

  useEffect(() => {
    if (!showSendModal) return
    fetch('/api/folders')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (data.length) setFolders(data) })
      .catch(() => {})
  }, [showSendModal])

  useEffect(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0
    const chars = content.length
    const lines = content.split('\n').length
    setWordCount(words)
    setCharCount(chars)
    setLineCount(lines)
  }, [content])

  const formats = [
    { id: 'html', name: 'HTML', ext: '.html', icon: '🌐', category: 'deployment' },
    { id: 'css', name: 'CSS', ext: '.css', icon: '🎨', category: 'deployment' },
    { id: 'js', name: 'JavaScript', ext: '.js', icon: '⚡', category: 'deployment' },
    { id: 'json', name: 'JSON', ext: '.json', icon: '📋', category: 'deployment' },
    { id: 'pdf', name: 'PDF', ext: '.pdf', icon: '📄', category: 'document' },
    { id: 'md', name: 'Markdown', ext: '.md', icon: '📝', category: 'document' },
    { id: 'txt', name: 'Plain Text', ext: '.txt', icon: '📃', category: 'document' }
  ]

  const deploymentFormats = formats.filter(f => f.category === 'deployment')
  const documentFormats = formats.filter(f => f.category === 'document')

  const handleFormatChange = (formatId) => {
    setSelectedFormat(formatId)
    const format = formats.find(f => f.id === formatId)
    if (format) {
      const baseName = fileName.replace(/\.[^.]+$/, '')
      setFileName(baseName + format.ext)
    }
  }

  const applyTemplate = (templateKey) => {
    const templates = {
      HTML_BLANK: { name: 'HTML Kosong', content: '<!DOCTYPE html>\\n<html lang="id">\\n<head>\\n  <meta charset="UTF-8">\\n  <title>Judul</title>\\n</head>\\n<body>\\n  <!-- Konten di sini -->\\n</body>\\n</html>' },
      CSS_RESET: { name: 'CSS Reset', content: '* {\\n  margin: 0;\\n  padding: 0;\\n  box-sizing: border-box;\\n}\\n\\nbody {\\n  font-family: sans-serif;\\n}' },
      JS_MODULE: { name: 'JS Module', content: '// Module\\nexport function init() {\\n  console.log("Ready");\\n}\\n\\ninit();' },
      JSON_CONFIG: { name: 'JSON Config', content: '{\\n  "name": "app",\\n  "version": "1.0.0",\\n  "main": "index.js"\\n}' },
      MD_README: { name: 'README', content: '# Judul\\n\\nDeskripsi singkat.\\n\\n## Cara Penggunaan\\n\\n1. Langkah 1\\n2. Langkah 2\\n\\n---\\n\\n© 2024' },
      TXT_NOTE: { name: 'Catatan', content: 'Catatan:\\n\\n- Item 1\\n- Item 2\\n- Item 3\\n\\nTanggal: ___________' }
    }
    
    const template = templates[templateKey]
    if (template) {
      setContent(template.content)
      const extMap = {
        HTML_BLANK: '.html',
        CSS_RESET: '.css',
        JS_MODULE: '.js',
        JSON_CONFIG: '.json',
        MD_README: '.md',
        TXT_NOTE: '.txt'
      }
      setFileName(template.name.toLowerCase().replace(/\s+/g, '_') + (extMap[templateKey] || '.txt'))
      setShowTemplates(false)
    }
  }

  const saveDraft = useCallback(() => {
    if (!content.trim()) return
    
    const draft = {
      id: `draft_${Date.now()}`,
      content,
      fileName,
      format: selectedFormat,
      savedAt: Date.now()
    }
    
    const updated = [draft, ...savedDrafts].slice(0, 20)
    setSavedDrafts(updated)
    
    const data = JSON.stringify(updated)
    if (!checkStorageQuota(data.length * 2)) {
      alert('⚠️ Storage hampir penuh! Draft tidak disimpan.')
      return
    }
    
    try {
      localStorage.setItem(STORAGE_KEYS.RUANGKERJA_DRAFTS, data)
      alert('✅ Draft disimpan!')
    } catch (err) {
      console.error('Failed to save draft:', err)
      alert('❌ Gagal menyimpan draft. Storage penuh.')
    }
  }, [content, fileName, selectedFormat, savedDrafts])

  const loadDraft = (draft) => {
    setContent(draft.content)
    setFileName(draft.fileName)
    setSelectedFormat(draft.format)
    setShowDrafts(false)
  }

  const deleteDraft = (draftId) => {
    const updated = savedDrafts.filter(d => d.id !== draftId)
    setSavedDrafts(updated)
    try {
      localStorage.setItem(STORAGE_KEYS.RUANGKERJA_DRAFTS, JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to delete draft:', err)
    }
  }

  const exportFile = useCallback(() => {
    if (!content.trim()) return
    setExportError(null)

    let blob
    let mimeType = 'text/plain'

    switch (selectedFormat) {
      case 'html':
        mimeType = 'text/html'
        blob = new Blob([content], { type: mimeType })
        break
      case 'css':
        mimeType = 'text/css'
        blob = new Blob([content], { type: mimeType })
        break
      case 'js':
        mimeType = 'text/javascript'
        blob = new Blob([content], { type: mimeType })
        break
      case 'json':
        mimeType = 'application/json'
        try {
          const parsed = JSON.parse(content)
          blob = new Blob([JSON.stringify(parsed, null, 2)], { type: mimeType })
        } catch {
          blob = new Blob([content], { type: mimeType })
        }
        break
      case 'md':
        mimeType = 'text/markdown'
        blob = new Blob([content], { type: mimeType })
        break
      case 'txt':
      default:
        blob = new Blob([content], { type: mimeType })
        break
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
  }, [content, fileName, selectedFormat])

  const generatePDF = useCallback(() => {
    if (!content.trim()) return
    setExportError(null)

    const lines = content.split('\n')
    const maxCharsPerLine = 80
    const wrappedLines = []
    
    lines.forEach(line => {
      if (line.length <= maxCharsPerLine) {
        wrappedLines.push(line)
      } else {
        for (let i = 0; i < line.length; i += maxCharsPerLine) {
          wrappedLines.push(line.slice(i, i + maxCharsPerLine))
        }
      }
    })
    
    const pdfHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${sanitizeHtml(fileName)}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 11pt; 
            line-height: 1.5; 
            color: #000;
            padding: 20mm;
          }
          h1 { font-size: 18pt; margin-bottom: 12pt; }
          pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; }
          .header { 
            text-align: center; 
            border-bottom: 1px solid #ccc; 
            padding-bottom: 10pt; 
            margin-bottom: 20pt;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${sanitizeHtml(fileName)}</h1>
          <p>Dibuat dengan CalculatorPro Ruang Kerja</p>
        </div>
        <pre>${sanitizeHtml(wrappedLines.join('\n'))}</pre>
      </body>
      </html>
    `

    const blob = new Blob([pdfHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = fileName.replace('.pdf', '.html')
      a.click()
      URL.revokeObjectURL(url)
    }
  }, [content, fileName])

  const handleExport = () => {
    if (selectedFormat === 'pdf') {
      generatePDF()
    } else {
      exportFile()
    }
  }

  const sendToGudang = useCallback(async () => {
    if (!content.trim()) return

    const format = formats.find(f => f.id === selectedFormat)
    const contentBlob = new Blob([content])
    
    if (contentBlob.size > 2 * 1024 * 1024) {
      alert('❌ File terlalu besar (maksimal 2MB)')
      return
    }

    const newFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: fileName,
      originalName: fileName,
      type: format ? `${format.category === 'deployment' ? 'text' : 'application'}/${selectedFormat}` : 'text/plain',
      size: contentBlob.size,
      content: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(content)))}`,
      folderId: selectedFolderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isStarred: false,
      isTrashed: false
    }

    try {
      const db = await openDB()
      const tx = db.transaction(['files'], 'readwrite')
      const filesStore = tx.objectStore('files')
      
      const existingFiles = await idbRequest(filesStore.getAll())
      
      const totalSize = existingFiles.reduce((sum, f) => sum + (f.size || 0), 0) + newFile.size
      if (totalSize > 10 * 1024 * 1024) {
        alert('❌ Total storage melebihi 10MB. Hapus file lama di Gudang terlebih dahulu.')
        db.close()
        return
      }
      
      await idbRequest(filesStore.put(newFile))
      await transactionComplete(tx)
      db.close()
      
      setShowSendModal(false)
      alert(`✅ "${fileName}" berhasil dikirim ke Gudang!`)
    } catch (err) {
      console.error('Failed to send to Gudang:', err)
      alert('❌ Gagal mengirim ke Gudang. Coba lagi.')
    }
  }, [content, fileName, selectedFormat])

  const getPreview = () => {
    if (!content.trim()) return <div className="preview-empty">Preview akan muncul di sini...</div>

    switch (selectedFormat) {
      case 'html':
        return (
          <div className="preview-html">
            <iframe
              srcDoc={sanitizeHtml(content)}
              title="HTML Preview"
              sandbox="allow-scripts"
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
            />
          </div>
        )
      case 'md':
        return <MarkdownPreview content={content} />
      case 'json':
        try {
          const parsed = JSON.parse(content)
          return (
            <pre className="preview-json">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          )
        } catch {
          return <pre className="preview-text">{content}</pre>
        }
      default:
        return <pre className="preview-text">{content}</pre>
    }
  }

  const goBack = () => navigate('/skyroom')

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(180deg, #0A0E1A 0%, #0F1420 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        height: '56px',
        flexShrink: 0,
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={goBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#8B92A8',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            ⬅️
          </button>
          <h1 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#FFFFFF',
            margin: 0
          }}>
            📝 Ruang Kerja
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setShowDrafts(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              color: '#8B92A8',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '8px 12px'
            }}
          >
            💾
          </button>
          <button 
            onClick={() => setShowTemplates(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              color: '#8B92A8',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '8px 12px'
            }}
          >
            📋
          </button>
        </div>
      </div>

      {/* Format Selector */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        flexShrink: 0
      }}>
        <span style={{ fontSize: '12px', color: '#8B92A8', marginBottom: '8px', display: 'block' }}>
          Format:
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: '#8B92A8', textTransform: 'uppercase', letterSpacing: '0.5px', width: '50px', flexShrink: 0 }}>
              Deploy
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {deploymentFormats.map(f => (
                <button
                  key={f.id}
                  onClick={() => handleFormatChange(f.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    background: selectedFormat === f.id ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: selectedFormat === f.id ? '1px solid rgba(255, 107, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    color: selectedFormat === f.id ? '#FF6B00' : '#8B92A8',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <span>{f.icon}</span>
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: '#8B92A8', textTransform: 'uppercase', letterSpacing: '0.5px', width: '50px', flexShrink: 0 }}>
              Dokumen
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {documentFormats.map(f => (
                <button
                  key={f.id}
                  onClick={() => handleFormatChange(f.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    background: selectedFormat === f.id ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: selectedFormat === f.id ? '1px solid rgba(255, 107, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    color: selectedFormat === f.id ? '#FF6B00' : '#8B92A8',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <span>{f.icon}</span>
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filename Input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        flexShrink: 0
      }}>
        <span style={{ fontSize: '12px', color: '#8B92A8', flexShrink: 0 }}>
          Nama File:
        </span>
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </div>

      {/* Editor + Preview */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        minHeight: 0
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ketik atau paste teks di sini..."
            spellCheck={false}
            style={{
              flex: 1,
              width: '100%',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '14px',
              lineHeight: 1.6,
              resize: 'none',
              outline: 'none',
              fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace'
            }}
          />
        </div>

        {showPreview && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
            background: 'rgba(255, 255, 255, 0.01)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              fontSize: '12px',
              color: '#8B92A8'
            }}>
              <span>👁️ Preview</span>
              <button 
                onClick={() => setShowPreview(false)}
                style={{ background: 'none', border: 'none', color: '#8B92A8', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              {getPreview()}
            </div>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div style={{
        display: 'flex',
        gap: '16px',
        padding: '8px 16px',
        fontSize: '11px',
        color: '#8B92A8',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        flexShrink: 0
      }}>
        <span>{lineCount} baris</span>
        <span>{wordCount} kata</span>
        <span>{charCount} karakter</span>
      </div>

      {/* Error Display */}
      {exportError && (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#EF4444',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          ⚠️ {exportError}
        </div>
      )}

      {/* Action Bar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '12px 16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        flexShrink: 0,
        overflowX: 'auto'
      }}>
        <button 
          onClick={() => setContent('')}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#FFFFFF'
          }}
        >
          🗑️ Hapus
        </button>
        <button 
          onClick={saveDraft}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#FFFFFF'
          }}
        >
          💾 Simpan Draft
        </button>
        <button 
          onClick={() => setShowPreview(!showPreview)}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#FFFFFF'
          }}
        >
          {showPreview ? '🙈' : '👁️'} Preview
        </button>
        <button 
          onClick={handleExport}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            border: 'none',
            background: 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
            color: '#FFFFFF'
          }}
        >
          ⬇️ Export
        </button>
        <button 
          onClick={() => setShowSendModal(true)}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            border: 'none',
            background: 'linear-gradient(180deg, #FF6B00 0%, #FF8C00 100%)',
            color: '#FFFFFF'
          }}
        >
          📦 Kirim ke Gudang
        </button>
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
          onClick={() => setShowTemplates(false)}
        >
          <div 
            style={{
              background: '#1C1C2E',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: '#FFFFFF', fontSize: '18px', margin: '0 0 16px 0' }}>
              🚀 Pilih Template
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {[
                { key: 'HTML_BLANK', icon: '🌐', name: 'HTML Kosong' },
                { key: 'CSS_RESET', icon: '🎨', name: 'CSS Reset' },
                { key: 'JS_MODULE', icon: '⚡', name: 'JS Module' },
                { key: 'JSON_CONFIG', icon: '📋', name: 'JSON Config' },
                { key: 'MD_README', icon: '📝', name: 'README' },
                { key: 'TXT_NOTE', icon: '📃', name: 'Catatan' }
              ].map(template => (
                <button
                  key={template.key}
                  onClick={() => applyTemplate(template.key)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '20px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  <div style={{ fontSize: '32px' }}>{template.icon}</div>
                  <div style={{ fontSize: '13px', color: '#FFFFFF' }}>{template.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Drafts Modal */}
      {showDrafts && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
          onClick={() => setShowDrafts(false)}
        >
          <div 
            style={{
              background: '#1C1C2E',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: '#FFFFFF', fontSize: '18px', margin: '0 0 16px 0' }}>
              💾 Draft Tersimpan
            </h3>
            {savedDrafts.length === 0 ? (
              <p style={{ color: '#8B92A8', textAlign: 'center', padding: '20px' }}>
                Belum ada draft tersimpan
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {savedDrafts.map(draft => (
                  <div key={draft.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px'
                  }}>
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => loadDraft(draft)}>
                      <div style={{ fontSize: '14px', color: '#FFFFFF', marginBottom: '4px' }}>
                        {draft.fileName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8B92A8' }}>
                        {new Date(draft.savedAt).toLocaleString('id-ID')} • {draft.content.length} karakter
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteDraft(draft.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        fontSize: '16px',
                        cursor: 'pointer',
                        padding: '8px'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Send to Gudang Modal */}
      {showSendModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
          onClick={() => setShowSendModal(false)}
        >
          <div 
            style={{
              background: '#1C1C2E',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: '#FFFFFF', fontSize: '18px', margin: '0 0 8px 0' }}>
              📦 Kirim ke Gudang
            </h3>
            <p style={{ color: '#8B92A8', fontSize: '13px', marginBottom: '16px' }}>
              File akan disimpan di Gudang &gt; Semua File
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              margin: '16px 0'
            }}>
              <span style={{ fontSize: '32px' }}>{formats.find(f => f.id === selectedFormat)?.icon}</span>
              <span style={{ flex: 1, color: '#FFFFFF', fontSize: '14px', wordBreak: 'break-all' }}>
                {fileName}
              </span>
              <span style={{ color: '#8B92A8', fontSize: '12px' }}>
                {formatSize(new Blob([content]).size)}
              </span>
            </div>
            {/* Folder picker */}
            <div style={{ marginTop: '12px' }}>
              <p style={{ color: '#8B92A8', fontSize: '12px', marginBottom: '8px' }}>Simpan ke folder:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                {folders.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFolderId(f.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px',
                      background: selectedFolderId === f.id ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.04)',
                      border: selectedFolderId === f.id ? '1px solid rgba(255,107,0,0.4)' : '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '10px', cursor: 'pointer', textAlign: 'left', width: '100%'
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>📁</span>
                    <span style={{ fontSize: '14px', color: selectedFolderId === f.id ? '#FF6B00' : '#CBD5E1', fontWeight: selectedFolderId === f.id ? 600 : 400 }}>{f.name}</span>
                    {selectedFolderId === f.id && <span style={{ marginLeft: 'auto', color: '#FF6B00', fontSize: '16px' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button 
                onClick={() => setShowSendModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#8B92A8'
                }}
              >
                Batal
              </button>
              <button 
                onClick={sendToGudang}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'linear-gradient(180deg, #FF6B00 0%, #FF8C00 100%)',
                  color: '#FFFFFF'
                }}
              >
                ✅ Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 2)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

export default RuangKerja
