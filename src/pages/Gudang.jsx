import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const API = '/api'

const FILE_TYPES = {
  image: { exts: ['jpg','jpeg','png','gif','webp','svg','bmp'], icon: 'ðŸ–¼ï¸', color: '#10B981' },
  video: { exts: ['mp4','mov','avi','mkv','webm','m4v'], icon: 'ðŸŽ¬', color: '#8B5CF6' },
  audio: { exts: ['mp3','wav','ogg','m4a','flac','aac'], icon: 'ðŸŽµ', color: '#F59E0B' },
  pdf:   { exts: ['pdf'], icon: 'ðŸ“•', color: '#EF4444' },
  doc:   { exts: ['doc','docx','odt','rtf'], icon: 'ðŸ“', color: '#3B82F6' },
  sheet: { exts: ['xls','xlsx','csv','ods'], icon: 'ðŸ“Š', color: '#10B981' },
  slide: { exts: ['ppt','pptx','odp'], icon: 'ðŸ“Š', color: '#F97316' },
  zip:   { exts: ['zip','rar','7z','tar','gz'], icon: 'ðŸ“¦', color: '#6B7280' },
  code:  { exts: ['js','ts','jsx','tsx','json','html','css','py','java','cpp','c'], icon: 'ðŸ’»', color: '#06B6D4' },
  text:  { exts: ['txt','md','log'], icon: 'ðŸ“„', color: '#9CA3AF' },
}

function getFileCategory(type, name) {
  const ext = name?.split('.').pop()?.toLowerCase() || ''
  for (const [cat, def] of Object.entries(FILE_TYPES)) {
    if (type?.startsWith('image/') && cat === 'image') return cat
    if (type?.startsWith('video/') && cat === 'video') return cat
    if (type?.startsWith('audio/') && cat === 'audio') return cat
    if (def.exts.includes(ext)) return cat
  }
  return 'text'
}

function getIcon(type, name) { return FILE_TYPES[getFileCategory(type, name)]?.icon || 'ðŸ“Ž' }
function getColor(type, name) { return FILE_TYPES[getFileCategory(type, name)]?.color || '#6B7280' }
function isImage(type) { return type?.startsWith('image/') }
function isVideo(type) { return type?.startsWith('video/') }

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const s = ['B','KB','MB','GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${s[i]}`
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Gudang() {
  const navigate = useNavigate()

  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([{ id: 'root', name: 'Semua File', parentId: null }])
  const [currentFolder, setCurrentFolder] = useState('root')
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('date')
  const [selectedIds, setSelectedIds] = useState([])
  const [showTrash, setShowTrash] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modals
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, pct: 0 })
  const [previewFile, setPreviewFile] = useState(null)
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [actionFile, setActionFile] = useState(null)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [renameName, setRenameName] = useState('')

  const fileInputRef = useRef()

  // Load data
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [fr, folr] = await Promise.all([fetch(`${API}/files`), fetch(`${API}/folders`)])
        if (fr.ok) setFiles(await fr.json())
        if (folr.ok) setFolders(await folr.json())
      } catch { setError('Gagal memuat data. Cek koneksi internet.') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // Filtered + sorted files
  const visibleFiles = files
    .filter(f => {
      if (showTrash) return f.isTrashed
      if (f.isTrashed) return false
      if (currentFolder !== 'root' && f.folderId !== currentFolder) return false
      if (searchQuery) return f.name.toLowerCase().includes(searchQuery.toLowerCase())
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'size') return (b.size || 0) - (a.size || 0)
      return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)
    })

  const previewFiles = visibleFiles.filter(f => isImage(f.type) || isVideo(f.type))
  const previewIdx = previewFiles.findIndex(f => f.id === previewFile?.id)

  // Upload
  const handleUpload = useCallback(async (e) => {
    const list = Array.from(e.target.files || [])
    if (!list.length) return
    setUploading(true)
    setUploadProgress({ current: 0, total: list.length, pct: 0 })

    for (let i = 0; i < list.length; i++) {
      const file = list[i]
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folderId', currentFolder)
      try {
        const res = await fetch(`${API}/files`, { method: 'POST', body: fd })
        if (res.ok) { const nf = await res.json(); setFiles(prev => [...prev, nf]) }
        else { const err = await res.json().catch(() => ({})); setError(err.error || `Gagal upload ${file.name}`) }
      } catch (err) { setError(`Error: ${err.message}`) }
      setUploadProgress({ current: i+1, total: list.length, pct: Math.round(((i+1)/list.length)*100) })
    }

    setUploading(false)
    setShowUpload(false)
    e.target.value = ''
  }, [currentFolder])

  // File actions
  const trashFile = async (id) => {
    await fetch(`${API}/files/${id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ isTrashed: true }) })
    setFiles(p => p.map(f => f.id === id ? { ...f, isTrashed: true } : f))
    setSelectedIds(p => p.filter(x => x !== id))
    setActionFile(null)
  }

  const restoreFile = async (id) => {
    await fetch(`${API}/files/${id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ isTrashed: false }) })
    setFiles(p => p.map(f => f.id === id ? { ...f, isTrashed: false } : f))
    setActionFile(null)
  }

  const deleteFile = async (id) => {
    await fetch(`${API}/files/${id}`, { method: 'DELETE' })
    setFiles(p => p.filter(f => f.id !== id))
    setActionFile(null)
  }

  const toggleStar = async (id) => {
    const file = files.find(f => f.id === id)
    if (!file) return
    const starred = !file.isStarred
    await fetch(`${API}/files/${id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ isStarred: starred }) })
    setFiles(p => p.map(f => f.id === id ? { ...f, isStarred: starred } : f))
  }

  const renameFile = async () => {
    if (!renameName.trim() || !actionFile) return
    await fetch(`${API}/files/${actionFile.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name: renameName.trim() }) })
    setFiles(p => p.map(f => f.id === actionFile.id ? { ...f, name: renameName.trim() } : f))
    setShowRenameDialog(false)
    setActionFile(null)
  }

  const createFolder = async () => {
    const name = folderName.trim() || 'Folder Baru'
    try {
      const res = await fetch(`${API}/folders`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name }) })
      if (res.ok) {
        const nf = await res.json()
        setFolders(p => [...p, nf])
      }
    } catch {}
    setShowFolderDialog(false)
    setFolderName('')
  }

  const downloadFile = (file) => {
    const a = document.createElement('a')
    a.href = `${API}/files/${file.id}`
    a.download = file.name
    a.click()
  }

  const selectAll = () => setSelectedIds(visibleFiles.map(f => f.id))
  const clearSelect = () => setSelectedIds([])
  const toggleSelect = (id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const currentFolderName = folders.find(f => f.id === currentFolder)?.name || 'Semua File'

  return (
    <div className="gd-root">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="gd-header">
        <button className="gd-icon-btn" onClick={() => navigate('/skyroom')}>â¬…</button>
        <div className="gd-header-title">
          {showTrash ? 'ðŸ—‘ï¸ Sampah' : currentFolderName}
        </div>
        <div className="gd-header-right">
          {selectedIds.length > 0 && (
            <button className="gd-icon-btn" onClick={clearSelect}>âœ•</button>
          )}
          <button className="gd-icon-btn" onClick={() => setShowSortMenu(p => !p)}>â‡…</button>
          <button className={`gd-icon-btn ${viewMode==='grid'?'active':''}`} onClick={() => setViewMode('grid')}>âŠž</button>
          <button className={`gd-icon-btn ${viewMode==='list'?'active':''}`} onClick={() => setViewMode('list')}>â˜°</button>
        </div>
      </div>

      {/* Sort menu */}
      {showSortMenu && (
        <div className="gd-sort-menu">
          {[['date','Tanggal'],['name','Nama'],['size','Ukuran']].map(([k,label]) => (
            <button key={k} className={`gd-sort-item ${sortBy===k?'active':''}`} onClick={() => { setSortBy(k); setShowSortMenu(false) }}>
              {sortBy===k ? 'â— ' : 'â—‹ '}{label}
            </button>
          ))}
        </div>
      )}

      {/* â”€â”€ Search â”€â”€ */}
      <div className="gd-search-row">
        <div className="gd-search-wrap">
          <span className="gd-search-icon">ðŸ”</span>
          <input
            className="gd-search"
            placeholder="Cari file..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && <button className="gd-search-clear" onClick={() => setSearchQuery('')}>âœ•</button>}
        </div>
      </div>

      {/* â”€â”€ Folder chips â”€â”€ */}
      {!showTrash && (
        <div className="gd-folders">
          {folders.map(f => (
            <button key={f.id} className={`gd-chip ${currentFolder===f.id?'active':''}`} onClick={() => setCurrentFolder(f.id)}>
              ðŸ“ {f.name}
            </button>
          ))}
          <button className="gd-chip new" onClick={() => { setFolderName(''); setShowFolderDialog(true) }}>
            + Folder
          </button>
        </div>
      )}

      {/* â”€â”€ Error banner â”€â”€ */}
      {error && (
        <div className="gd-banner error" onClick={() => setError(null)}>
          âš ï¸ {error}
        </div>
      )}

      {/* â”€â”€ Selection bar â”€â”€ */}
      {selectedIds.length > 0 && (
        <div className="gd-select-bar">
          <span>{selectedIds.length} dipilih</span>
          <button onClick={selectAll}>Pilih semua</button>
          <button onClick={() => { selectedIds.forEach(trashFile); clearSelect() }}>ðŸ—‘ï¸ Hapus</button>
          <button onClick={() => { selectedIds.forEach(id => { const f = files.find(x=>x.id===id); if(f) downloadFile(f) }); clearSelect() }}>â¬‡ Download</button>
        </div>
      )}

      {/* â”€â”€ File area â”€â”€ */}
      <div className="gd-scroll" onClick={() => { setShowSortMenu(false) }}>
        {loading && <div className="gd-empty"><span className="gd-spinner">â³</span> Memuat...</div>}

        {!loading && visibleFiles.length === 0 && (
          <div className="gd-empty">
            <div style={{fontSize:48}}>{showTrash ? 'ðŸ—‘ï¸' : 'ðŸ“‚'}</div>
            <div>{showTrash ? 'Sampah kosong' : searchQuery ? 'Tidak ditemukan' : 'Belum ada file'}</div>
            {!showTrash && !searchQuery && <div style={{fontSize:13,color:'#8B92A8',marginTop:4}}>Tap ï¼‹ untuk upload</div>}
          </div>
        )}

        {!loading && visibleFiles.length > 0 && (
          viewMode === 'grid' ? (
            <div className="gd-grid">
              {visibleFiles.map(file => (
                <GridCard
                  key={file.id}
                  file={file}
                  selected={selectedIds.includes(file.id)}
                  onTap={() => {
                    if (selectedIds.length > 0) { toggleSelect(file.id); return }
                    if (isImage(file.type) || isVideo(file.type)) setPreviewFile(file)
                    else downloadFile(file)
                  }}
                  onLongPress={() => toggleSelect(file.id)}
                  onAction={() => { setActionFile(file) }}
                />
              ))}
            </div>
          ) : (
            <div className="gd-list">
              {visibleFiles.map(file => (
                <ListRow
                  key={file.id}
                  file={file}
                  selected={selectedIds.includes(file.id)}
                  onTap={() => {
                    if (selectedIds.length > 0) { toggleSelect(file.id); return }
                    if (isImage(file.type) || isVideo(file.type)) setPreviewFile(file)
                    else downloadFile(file)
                  }}
                  onSelect={() => toggleSelect(file.id)}
                  onAction={() => setActionFile(file)}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* â”€â”€ Bottom bar â”€â”€ */}
      <div className="gd-bottom">
        <button className="gd-fab" onClick={() => setShowUpload(true)} title="Upload">
          ï¼‹
        </button>
        <button className={`gd-bottom-btn ${showTrash?'active':''}`} onClick={() => { setShowTrash(p=>!p); setSelectedIds([]) }}>
          ðŸ—‘ï¸ {showTrash ? 'Tutup' : 'Sampah'}
        </button>
        {showTrash && selectedIds.length === 0 && (
          <button className="gd-bottom-btn danger" onClick={async () => {
            const trashed = files.filter(f => f.isTrashed)
            for (const f of trashed) await deleteFile(f.id)
          }}>
            ðŸ—‘ï¸ Kosongkan
          </button>
        )}
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          MODALS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}

      {/* Upload Modal */}
      {showUpload && (
        <Modal onClose={() => !uploading && setShowUpload(false)}>
          <h3 className="modal-title">ðŸ“¤ Upload File</h3>
          <p className="modal-sub">Foto, video, dokumen â€” tersimpan di Cloudflare R2</p>
          <label>
            <input ref={fileInputRef} type="file" multiple onChange={handleUpload} disabled={uploading} style={{display:'none'}} />
            <div className={`gd-dropzone ${uploading?'loading':''}`} onClick={() => !uploading && fileInputRef.current?.click()}>
              {uploading ? (
                <>
                  <div className="gd-progress-bar"><div className="gd-progress-fill" style={{width:`${uploadProgress.pct}%`}} /></div>
                  <span>{uploadProgress.current}/{uploadProgress.total} file Â· {uploadProgress.pct}%</span>
                </>
              ) : (
                <>
                  <span style={{fontSize:40}}>ðŸ“¤</span>
                  <span>Tap untuk pilih file</span>
                  <span className="modal-sub">Semua jenis file didukung</span>
                </>
              )}
            </div>
          </label>
          <button className="gd-btn secondary" onClick={() => !uploading && setShowUpload(false)} disabled={uploading}>Batal</button>
        </Modal>
      )}

      {/* Folder name dialog */}
      {showFolderDialog && (
        <Modal onClose={() => setShowFolderDialog(false)}>
          <h3 className="modal-title">ðŸ“ Folder Baru</h3>
          <input
            className="gd-input"
            placeholder="Nama folder..."
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createFolder()}
            autoFocus
          />
          <div className="modal-actions">
            <button className="gd-btn secondary" onClick={() => setShowFolderDialog(false)}>Batal</button>
            <button className="gd-btn primary" onClick={createFolder}>Buat</button>
          </div>
        </Modal>
      )}

      {/* Rename dialog */}
      {showRenameDialog && actionFile && (
        <Modal onClose={() => setShowRenameDialog(false)}>
          <h3 className="modal-title">âœï¸ Ganti Nama</h3>
          <input
            className="gd-input"
            value={renameName}
            onChange={e => setRenameName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && renameFile()}
            autoFocus
          />
          <div className="modal-actions">
            <button className="gd-btn secondary" onClick={() => setShowRenameDialog(false)}>Batal</button>
            <button className="gd-btn primary" onClick={renameFile}>Simpan</button>
          </div>
        </Modal>
      )}

      {/* Action sheet */}
      {actionFile && !showRenameDialog && (
        <div className="gd-sheet-overlay" onClick={() => setActionFile(null)}>
          <div className="gd-sheet" onClick={e => e.stopPropagation()}>
            <div className="gd-sheet-handle" />
            <div className="gd-sheet-header">
              <span style={{fontSize:28}}>{getIcon(actionFile.type, actionFile.name)}</span>
              <div>
                <div className="gd-sheet-name">{actionFile.name}</div>
                <div className="gd-sheet-meta">{formatSize(actionFile.size)} Â· {formatDate(actionFile.uploadedAt)}</div>
              </div>
            </div>
            <div className="gd-sheet-actions">
              {!actionFile.isTrashed && <>
                <SheetBtn icon="â¬‡" label="Download" onClick={() => { downloadFile(actionFile); setActionFile(null) }} />
                <SheetBtn icon="â­" label={actionFile.isStarred ? 'Hapus Bintang' : 'Bintangi'} onClick={() => { toggleStar(actionFile.id); setActionFile(null) }} />
                {(isImage(actionFile.type) || isVideo(actionFile.type)) && (
                  <SheetBtn icon="ðŸ‘" label="Preview" onClick={() => { setPreviewFile(actionFile); setActionFile(null) }} />
                )}
                <SheetBtn icon="âœï¸" label="Ganti Nama" onClick={() => { setRenameName(actionFile.name); setShowRenameDialog(true) }} />
                <SheetBtn icon="ðŸ—‘ï¸" label="Pindah ke Sampah" onClick={() => trashFile(actionFile.id)} danger />
              </>}
              {actionFile.isTrashed && <>
                <SheetBtn icon="â™»ï¸" label="Pulihkan" onClick={() => restoreFile(actionFile.id)} />
                <SheetBtn icon="ðŸ—‘ï¸" label="Hapus Permanen" onClick={() => deleteFile(actionFile.id)} danger />
              </>}
            </div>
            <button className="gd-btn secondary" style={{margin:'8px 16px 16px'}} onClick={() => setActionFile(null)}>Tutup</button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="gd-preview-overlay" onClick={() => setPreviewFile(null)}>
          <div className="gd-preview-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="gd-preview-header">
              <button className="gd-icon-btn light" onClick={() => setPreviewFile(null)}>âœ•</button>
              <span className="gd-preview-name">{previewFile.name}</span>
              <div style={{display:'flex',gap:8}}>
                <button className="gd-icon-btn light" onClick={() => toggleStar(previewFile.id)} title="Bintangi">
                  {files.find(f=>f.id===previewFile.id)?.isStarred ? 'â­' : 'â˜†'}
                </button>
                <button className="gd-icon-btn light" onClick={() => downloadFile(previewFile)} title="Download">â¬‡</button>
              </div>
            </div>

            {/* Content */}
            <div className="gd-preview-body">
              {isImage(previewFile.type) ? (
                <img src={`${API}/files/${previewFile.id}`} alt={previewFile.name} className="gd-preview-img" />
              ) : (
                <video src={`${API}/files/${previewFile.id}`} controls autoPlay className="gd-preview-video" />
              )}
            </div>

            {/* Prev / Next */}
            {previewFiles.length > 1 && (
              <>
                <button
                  className="gd-preview-nav prev"
                  disabled={previewIdx <= 0}
                  onClick={() => setPreviewFile(previewFiles[previewIdx - 1])}
                >â€¹</button>
                <button
                  className="gd-preview-nav next"
                  disabled={previewIdx >= previewFiles.length - 1}
                  onClick={() => setPreviewFile(previewFiles[previewIdx + 1])}
                >â€º</button>
              </>
            )}

            {/* Footer */}
            <div className="gd-preview-footer">
              <span>{formatSize(previewFile.size)}</span>
              <span>{formatDate(previewFile.uploadedAt)}</span>
              {previewFiles.length > 1 && <span>{previewIdx+1} / {previewFiles.length}</span>}
            </div>
          </div>
        </div>
      )}

      <Styles />
    </div>
  )
}

// â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function GridCard({ file, selected, onTap, onLongPress, onAction }) {
  const pressTimer = useRef()
  const [imgError, setImgError] = useState(false)
  const cat = getFileCategory(file.type, file.name)

  const handleTouchStart = () => { pressTimer.current = setTimeout(onLongPress, 500) }
  const handleTouchEnd = () => clearTimeout(pressTimer.current)

  return (
    <div
      className={`gd-card ${selected?'selected':''}`}
      onClick={onTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Thumbnail area */}
      <div className="gd-card-thumb">
        {(cat === 'image' && !imgError) ? (
          <img
            src={`${API}/files/${file.id}`}
            alt={file.name}
            className="gd-thumb-img"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : cat === 'video' ? (
          <>
            <video src={`${API}/files/${file.id}`} className="gd-thumb-img" preload="metadata" muted playsInline />
            <div className="gd-play-badge">â–¶</div>
          </>
        ) : (
          <div className="gd-thumb-icon" style={{background: getColor(file.type, file.name)+'22', color: getColor(file.type, file.name)}}>
            {getIcon(file.type, file.name)}
          </div>
        )}
        {selected && <div className="gd-check">âœ“</div>}
        {file.isStarred && !selected && <div className="gd-star-badge">â­</div>}
      </div>

      {/* Info + action */}
      <div className="gd-card-info">
        <span className="gd-card-name">{file.name}</span>
        <button className="gd-more-btn" onClick={e => { e.stopPropagation(); onAction() }}>â‹®</button>
      </div>
      <span className="gd-card-meta">{formatSize(file.size)}</span>
    </div>
  )
}

function ListRow({ file, selected, onTap, onSelect, onAction }) {
  const cat = getFileCategory(file.type, file.name)
  const [imgError, setImgError] = useState(false)

  return (
    <div className={`gd-row ${selected?'selected':''}`} onClick={onTap}>
      {/* Checkbox */}
      <button className={`gd-row-check ${selected?'on':''}`} onClick={e => { e.stopPropagation(); onSelect() }}>
        {selected ? 'âœ“' : ''}
      </button>

      {/* Icon / thumb */}
      <div className="gd-row-thumb">
        {(cat === 'image' && !imgError) ? (
          <img src={`${API}/files/${file.id}`} alt={file.name} className="gd-row-img" loading="lazy" onError={() => setImgError(true)} />
        ) : cat === 'video' ? (
          <div className="gd-row-icon" style={{background:'#8B5CF622',color:'#8B5CF6',position:'relative'}}>
            ðŸŽ¬
          </div>
        ) : (
          <div className="gd-row-icon" style={{background:getColor(file.type,file.name)+'22', color:getColor(file.type,file.name)}}>
            {getIcon(file.type, file.name)}
          </div>
        )}
      </div>

      {/* Name + meta */}
      <div className="gd-row-info">
        <span className="gd-row-name">{file.name}</span>
        <span className="gd-row-meta">{formatSize(file.size)} Â· {formatDate(file.uploadedAt)}</span>
      </div>

      {/* Star */}
      {file.isStarred && <span style={{flexShrink:0,fontSize:14}}>â­</span>}

      {/* More */}
      <button className="gd-more-btn" onClick={e => { e.stopPropagation(); onAction() }}>â‹®</button>
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function SheetBtn({ icon, label, onClick, danger }) {
  return (
    <button className={`gd-sheet-btn ${danger?'danger':''}`} onClick={onClick}>
      <span className="gd-sheet-btn-icon">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// â”€â”€ All styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Styles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      .gd-root {
        width: 100%; height: 100%;
        background: #0A0A0F;
        display: flex; flex-direction: column;
        overflow: hidden;
        color: #E2E8F0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        position: relative;
      }

      /* â”€â”€ Header â”€â”€ */
      .gd-header {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 12px;
        background: #12121A;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        flex-shrink: 0;
        min-height: 52px;
      }
      .gd-header-title { flex: 1; font-size: 16px; font-weight: 600; color: #FFF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gd-header-right { display: flex; gap: 4px; flex-shrink: 0; }
      .gd-icon-btn {
        background: none; border: none; color: #94A3B8;
        width: 34px; height: 34px; border-radius: 8px;
        font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: background 150ms;
      }
      .gd-icon-btn:hover { background: rgba(255,255,255,0.08); }
      .gd-icon-btn.active { color: #FF6B00; background: rgba(255,107,0,0.12); }
      .gd-icon-btn.light { color: #E2E8F0; }

      /* â”€â”€ Sort menu â”€â”€ */
      .gd-sort-menu {
        position: absolute; top: 52px; right: 12px; z-index: 200;
        background: #1E1E2E; border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px; overflow: hidden; flex-shrink: 0;
      }
      .gd-sort-item {
        display: block; width: 100%; padding: 12px 20px;
        background: none; border: none; color: #94A3B8;
        font-size: 14px; text-align: left; cursor: pointer;
      }
      .gd-sort-item.active { color: #FF6B00; }
      .gd-sort-item:hover { background: rgba(255,255,255,0.05); }

      /* â”€â”€ Search â”€â”€ */
      .gd-search-row { padding: 10px 12px 0; flex-shrink: 0; }
      .gd-search-wrap {
        display: flex; align-items: center; gap: 8px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px; padding: 0 12px;
      }
      .gd-search-icon { font-size: 14px; opacity: 0.5; flex-shrink: 0; }
      .gd-search { flex: 1; background: none; border: none; color: #E2E8F0; font-size: 14px; padding: 10px 0; outline: none; }
      .gd-search::placeholder { color: #64748B; }
      .gd-search-clear { background: none; border: none; color: #64748B; cursor: pointer; font-size: 14px; flex-shrink: 0; }

      /* â”€â”€ Folders â”€â”€ */
      .gd-folders {
        display: flex; gap: 8px; padding: 10px 12px 0;
        overflow-x: auto; flex-shrink: 0;
        scrollbar-width: none;
      }
      .gd-folders::-webkit-scrollbar { display: none; }
      .gd-chip {
        display: flex; align-items: center; gap: 5px;
        padding: 6px 14px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px; color: #94A3B8;
        font-size: 13px; white-space: nowrap; cursor: pointer;
        transition: all 150ms;
      }
      .gd-chip.active { background: rgba(255,107,0,0.15); border-color: rgba(255,107,0,0.3); color: #FF6B00; }
      .gd-chip.new { border-style: dashed; }

      /* â”€â”€ Banners â”€â”€ */
      .gd-banner { padding: 10px 14px; margin: 8px 12px 0; border-radius: 10px; font-size: 13px; cursor: pointer; flex-shrink: 0; }
      .gd-banner.error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #FCA5A5; }

      /* â”€â”€ Selection bar â”€â”€ */
      .gd-select-bar {
        display: flex; align-items: center; gap: 12px;
        padding: 8px 14px; background: rgba(255,107,0,0.1);
        border-bottom: 1px solid rgba(255,107,0,0.2);
        flex-shrink: 0; font-size: 13px; color: #FF6B00;
        overflow-x: auto;
      }
      .gd-select-bar button {
        background: none; border: none; color: #FF6B00; cursor: pointer;
        font-size: 13px; white-space: nowrap; padding: 4px 8px;
        border-radius: 6px; flex-shrink: 0;
      }
      .gd-select-bar button:hover { background: rgba(255,107,0,0.15); }

      /* â”€â”€ Scroll area â”€â”€ */
      .gd-scroll { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 0; }
      .gd-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #475569; padding: 48px 16px; text-align: center; font-size: 15px; }

      /* â”€â”€ Grid â”€â”€ */
      .gd-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      @media (max-width: 360px) { .gd-grid { grid-template-columns: repeat(2, 1fr); } }

      .gd-card {
        background: #16162A; border: 1px solid rgba(255,255,255,0.06);
        border-radius: 12px; overflow: hidden; cursor: pointer;
        transition: border-color 150ms;
      }
      .gd-card:hover { border-color: rgba(255,255,255,0.12); }
      .gd-card.selected { border-color: #FF6B00; background: rgba(255,107,0,0.08); }

      .gd-card-thumb {
        position: relative; aspect-ratio: 1;
        background: #0F0F1A;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
      }
      .gd-thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .gd-thumb-icon {
        width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
        font-size: 32px; border-radius: 0;
      }
      .gd-play-badge {
        position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.35);
        font-size: 22px; color: #FFF;
      }
      .gd-check {
        position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center;
        background: rgba(255,107,0,0.6);
        font-size: 24px; color: #FFF; font-weight: 700;
      }
      .gd-star-badge { position: absolute; top: 4px; right: 4px; font-size: 12px; }

      .gd-card-info {
        display: flex; align-items: center;
        padding: 6px 8px 2px; gap: 4px;
      }
      .gd-card-name {
        flex: 1; font-size: 12px; color: #CBD5E1;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .gd-card-meta { padding: 0 8px 6px; font-size: 11px; color: #475569; display: block; }

      /* â”€â”€ List â”€â”€ */
      .gd-list { display: flex; flex-direction: column; gap: 2px; }
      .gd-row {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 8px; border-radius: 10px;
        cursor: pointer; transition: background 150ms;
      }
      .gd-row:hover { background: rgba(255,255,255,0.04); }
      .gd-row.selected { background: rgba(255,107,0,0.08); }

      .gd-row-check {
        width: 22px; height: 22px; border-radius: 50%;
        border: 1.5px solid rgba(255,255,255,0.2);
        background: none; color: #FFF; font-size: 12px; cursor: pointer;
        flex-shrink: 0; display: flex; align-items: center; justify-content: center;
        transition: all 150ms;
      }
      .gd-row-check.on { background: #FF6B00; border-color: #FF6B00; }

      .gd-row-thumb { width: 40px; height: 40px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
      .gd-row-img { width: 100%; height: 100%; object-fit: cover; }
      .gd-row-icon {
        width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
        border-radius: 8px; font-size: 20px;
      }
      .gd-row-info { flex: 1; min-width: 0; }
      .gd-row-name { display: block; font-size: 14px; color: #E2E8F0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gd-row-meta { display: block; font-size: 11px; color: #64748B; margin-top: 2px; }

      /* â”€â”€ More button â”€â”€ */
      .gd-more-btn {
        background: none; border: none; color: #64748B;
        width: 28px; height: 28px; border-radius: 6px;
        font-size: 18px; cursor: pointer; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        transition: background 150ms;
      }
      .gd-more-btn:hover { background: rgba(255,255,255,0.08); color: #E2E8F0; }

      /* â”€â”€ Bottom bar â”€â”€ */
      .gd-bottom {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 14px;
        background: #12121A;
        border-top: 1px solid rgba(255,255,255,0.06);
        flex-shrink: 0;
      }
      .gd-fab {
        width: 44px; height: 44px; border-radius: 50%;
        background: #FF6B00; border: none;
        color: #FFF; font-size: 22px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(255,107,0,0.4);
        flex-shrink: 0;
        transition: transform 150ms;
      }
      .gd-fab:hover { transform: scale(1.08); }
      .gd-bottom-btn {
        display: flex; align-items: center; gap: 6px;
        padding: 9px 16px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px; color: #94A3B8;
        font-size: 13px; cursor: pointer; transition: all 150ms;
      }
      .gd-bottom-btn:hover { background: rgba(255,255,255,0.09); }
      .gd-bottom-btn.active { color: #FF6B00; background: rgba(255,107,0,0.12); border-color: rgba(255,107,0,0.25); }
      .gd-bottom-btn.danger { color: #EF4444; background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.2); }

      /* â”€â”€ Modals â”€â”€ */
      .modal-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.75);
        display: flex; align-items: center; justify-content: center;
        z-index: 300; padding: 20px;
      }
      .modal-box {
        background: #1A1A2E; border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px; padding: 24px;
        width: 100%; max-width: 380px;
        display: flex; flex-direction: column; gap: 14px;
      }
      .modal-title { font-size: 18px; font-weight: 600; color: #FFF; }
      .modal-sub { font-size: 13px; color: #64748B; }
      .modal-actions { display: flex; gap: 10px; }

      .gd-dropzone {
        display: flex; flex-direction: column; align-items: center; gap: 10px;
        padding: 36px 20px;
        background: rgba(255,255,255,0.02);
        border: 2px dashed rgba(255,255,255,0.1);
        border-radius: 16px; color: #94A3B8;
        cursor: pointer; transition: all 150ms; text-align: center;
      }
      .gd-dropzone:hover { border-color: rgba(255,107,0,0.35); }
      .gd-dropzone.loading { cursor: default; }

      .gd-progress-bar { width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
      .gd-progress-fill { height: 100%; background: linear-gradient(90deg,#FF6B00,#FF8C00); border-radius: 3px; transition: width 300ms; }

      .gd-input {
        width: 100%; padding: 12px 14px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px; color: #E2E8F0;
        font-size: 15px; outline: none;
      }
      .gd-input:focus { border-color: rgba(255,107,0,0.5); }

      .gd-btn {
        flex: 1; padding: 12px; border-radius: 12px;
        border: none; font-size: 14px; cursor: pointer; font-weight: 500;
        transition: all 150ms;
      }
      .gd-btn.primary { background: #FF6B00; color: #FFF; }
      .gd-btn.primary:hover { background: #E05A00; }
      .gd-btn.secondary { background: rgba(255,255,255,0.07); color: #94A3B8; }
      .gd-btn.secondary:disabled { opacity: 0.4; cursor: not-allowed; }

      /* â”€â”€ Action Sheet â”€â”€ */
      .gd-sheet-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.6);
        z-index: 400;
        display: flex; align-items: flex-end; justify-content: center;
      }
      .gd-sheet {
        background: #1A1A2E; border-radius: 20px 20px 0 0;
        width: 100%; max-width: 500px;
        padding-bottom: 8px;
      }
      .gd-sheet-handle { width: 36px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin: 12px auto 4px; }
      .gd-sheet-header { display: flex; align-items: center; gap: 14px; padding: 12px 18px 14px; border-bottom: 1px solid rgba(255,255,255,0.07); }
      .gd-sheet-name { font-size: 15px; font-weight: 500; color: #E2E8F0; }
      .gd-sheet-meta { font-size: 12px; color: #64748B; margin-top: 2px; }
      .gd-sheet-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
      .gd-sheet-btn {
        display: flex; flex-direction: column; align-items: center; gap: 6px;
        padding: 16px 8px; background: none; border: none;
        color: #94A3B8; font-size: 12px; cursor: pointer; transition: background 150ms;
      }
      .gd-sheet-btn:hover { background: rgba(255,255,255,0.05); }
      .gd-sheet-btn.danger { color: #EF4444; }
      .gd-sheet-btn-icon { font-size: 22px; }

      /* â”€â”€ Preview â”€â”€ */
      .gd-preview-overlay {
        position: fixed; inset: 0;
        background: #000;
        z-index: 500;
        display: flex; flex-direction: column;
      }
      .gd-preview-modal { width: 100%; height: 100%; display: flex; flex-direction: column; position: relative; }
      .gd-preview-header {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 14px;
        background: rgba(0,0,0,0.6);
        position: absolute; top: 0; left: 0; right: 0; z-index: 10;
      }
      .gd-preview-name { flex: 1; font-size: 14px; color: #FFF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gd-preview-body {
        flex: 1; display: flex; align-items: center; justify-content: center;
        background: #000;
      }
      .gd-preview-img { max-width: 100%; max-height: 100vh; object-fit: contain; }
      .gd-preview-video { max-width: 100%; max-height: 100vh; }
      .gd-preview-footer {
        display: flex; gap: 16px; justify-content: center;
        padding: 12px 16px;
        background: rgba(0,0,0,0.6);
        color: #94A3B8; font-size: 12px;
        position: absolute; bottom: 0; left: 0; right: 0;
      }
      .gd-preview-nav {
        position: absolute; top: 50%; transform: translateY(-50%);
        background: rgba(0,0,0,0.5); border: none;
        color: #FFF; font-size: 36px; cursor: pointer;
        width: 48px; height: 64px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        transition: background 150ms; z-index: 10;
      }
      .gd-preview-nav:hover { background: rgba(0,0,0,0.8); }
      .gd-preview-nav:disabled { opacity: 0.2; cursor: not-allowed; }
      .gd-preview-nav.prev { left: 8px; }
      .gd-preview-nav.next { right: 8px; }

      .gd-spinner { animation: spin 1s linear infinite; display: inline-block; }
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  )
}
