import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const API = '/api'

function Gudang() {
  const navigate = useNavigate()

  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([{ id: 'root', name: 'Semua File', parentId: null }])
  const [currentFolder, setCurrentFolder] = useState('root')
  const [viewMode, setViewMode] = useState('grid')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [showUpload, setShowUpload] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [previewFile, setPreviewFile] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [filesRes, foldersRes] = await Promise.all([
          fetch(`${API}/files`),
          fetch(`${API}/folders`)
        ])
        if (filesRes.ok) setFiles(await filesRes.json())
        if (foldersRes.ok) setFolders(await foldersRes.json())
      } catch (err) {
        setUploadError('Gagal memuat data. Cek koneksi internet.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleFileUpload = useCallback(async (event) => {
    const uploadedFiles = Array.from(event.target.files || [])
    if (!uploadedFiles.length) return

    setUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i]
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folderId', currentFolder)

      try {
        const res = await fetch(`${API}/files`, { method: 'POST', body: formData })
        if (res.ok) {
          const newFile = await res.json()
          setFiles(prev => [...prev, newFile])
        } else {
          const err = await res.json().catch(() => ({}))
          setUploadError(err.error || `Gagal upload "${file.name}"`)
        }
      } catch (err) {
        setUploadError(`Gagal upload "${file.name}": ${err.message}`)
      }
      setUploadProgress(Math.round(((i + 1) / uploadedFiles.length) * 100))
    }

    setUploading(false)
    setUploadProgress(0)
    setShowUpload(false)
    event.target.value = ''
  }, [currentFolder])

  const deleteFile = useCallback(async (fileId) => {
    try {
      await fetch(`${API}/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTrashed: true })
      })
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isTrashed: true } : f))
      setSelectedFiles(prev => prev.filter(id => id !== fileId))
    } catch {
      setUploadError('Gagal menghapus file.')
    }
  }, [])

  const restoreFile = useCallback(async (fileId) => {
    try {
      await fetch(`${API}/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTrashed: false })
      })
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isTrashed: false } : f))
    } catch {
      setUploadError('Gagal memulihkan file.')
    }
  }, [])

  const permanentDelete = useCallback(async (fileId) => {
    try {
      await fetch(`${API}/files/${fileId}`, { method: 'DELETE' })
      setFiles(prev => prev.filter(f => f.id !== fileId))
    } catch {
      setUploadError('Gagal menghapus permanen.')
    }
  }, [])

  const toggleStar = useCallback(async (fileId) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return
    const newStarred = !file.isStarred
    try {
      await fetch(`${API}/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: newStarred })
      })
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isStarred: newStarred } : f))
    } catch {
      setUploadError('Gagal memperbarui bintang.')
    }
  }, [files])

  const createFolder = useCallback(async (name) => {
    try {
      const res = await fetch(`${API}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || 'Folder Baru' })
      })
      if (res.ok) {
        const newFolder = await res.json()
        setFolders(prev => [...prev, newFolder])
      }
    } catch {
      setUploadError('Gagal membuat folder.')
    }
  }, [])

  const isImage = (type) => type?.startsWith('image/')
  const isVideo = (type) => type?.startsWith('video/')

  const getFileIcon = (type) => {
    if (isImage(type)) return '🖼️'
    if (isVideo(type)) return '🎬'
    if (type?.startsWith('text/')) return '📄'
    if (type?.includes('pdf')) return '📕'
    if (type?.includes('json') || type?.includes('javascript')) return '💻'
    if (type?.includes('zip') || type?.includes('rar') || type?.includes('7z')) return '📦'
    if (type?.includes('audio')) return '🎵'
    return '📎'
  }

  const handleFileClick = (file) => {
    if (showTrash) return
    if (isImage(file.type) || isVideo(file.type)) {
      setPreviewFile(file)
    } else {
      window.open(`${API}/files/${file.id}`, '_blank')
    }
  }

  const filteredFiles = files.filter(f => {
    if (showTrash) return f.isTrashed
    if (f.isTrashed) return false
    if (currentFolder !== 'root' && f.folderId !== currentFolder) return false
    if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const starredFiles = files.filter(f => f.isStarred && !f.isTrashed)

  const FileCard = ({ file }) => (
    <div
      className={`gudang-file ${selectedFiles.includes(file.id) ? 'selected' : ''} ${file.isStarred ? 'starred' : ''}`}
      onClick={() => handleFileClick(file)}
    >
      {/* Thumbnail */}
      <div className="file-thumb">
        {isImage(file.type) ? (
          <img
            src={`${API}/files/${file.id}`}
            alt={file.name}
            className="thumb-img"
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
        ) : isVideo(file.type) ? (
          <video
            src={`${API}/files/${file.id}`}
            className="thumb-video"
            preload="metadata"
            muted
            playsInline
          />
        ) : null}
        <div className="thumb-icon" style={{ display: (isImage(file.type) || isVideo(file.type)) ? 'none' : 'flex' }}>
          {getFileIcon(file.type)}
        </div>
        {isVideo(file.type) && <div className="thumb-play">▶</div>}
      </div>

      <div className="file-info">
        <span className="file-name">{file.name}</span>
        <span className="file-meta">{formatSize(file.size)}</span>
      </div>

      <div className="file-actions-row" onClick={e => e.stopPropagation()}>
        {!showTrash && (
          <button className={`file-star ${file.isStarred ? 'active' : ''}`} onClick={() => toggleStar(file.id)}>
            {file.isStarred ? '⭐' : '☆'}
          </button>
        )}
        {showTrash ? (
          <button className="file-restore" onClick={() => restoreFile(file.id)}>Restore</button>
        ) : (
          <button
            className="file-delete"
            onClick={(e) => {
              if (selectedFiles.includes(file.id)) {
                setSelectedFiles(prev => prev.filter(id => id !== file.id))
              } else {
                setSelectedFiles(prev => [...prev, file.id])
              }
            }}
          >
            {selectedFiles.includes(file.id) ? '✓' : '🗑️'}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="gudang-page">
      {/* Header */}
      <div className="gudang-header">
        <div className="gudang-header-left">
          <button className="gudang-back" onClick={() => navigate('/skyroom')}>⬅</button>
          <h1 className="gudang-title">📦 Gudang</h1>
        </div>
        <div className="gudang-header-right">
          <button className={`gudang-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>⊞</button>
          <button className={`gudang-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>☰</button>
        </div>
      </div>

      {/* Search */}
      <div className="gudang-search">
        <input
          type="text"
          placeholder="Cari file..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="gudang-search-input"
        />
      </div>

      {/* Folders */}
      <div className="gudang-folders">
        {folders.map(folder => (
          <button
            key={folder.id}
            className={`gudang-folder ${currentFolder === folder.id ? 'active' : ''}`}
            onClick={() => setCurrentFolder(folder.id)}
          >
            📁 <span>{folder.name}</span>
          </button>
        ))}
        <button className="gudang-folder" onClick={() => createFolder()}>
          <span>+ Folder</span>
        </button>
      </div>

      {/* Error */}
      {uploadError && (
        <div className="gudang-error" onClick={() => setUploadError(null)}>
          ⚠️ {uploadError} <span style={{ opacity: 0.6, fontSize: 11 }}>(tap untuk tutup)</span>
        </div>
      )}

      {/* Content */}
      <div className="gudang-scroll">
        {loading && <div className="gudang-empty">Memuat dari cloud ☁️</div>}

        {/* Starred */}
        {!loading && !showTrash && starredFiles.length > 0 && (
          <div className="gudang-section">
            <h3 className="gudang-section-title">⭐ Favorit</h3>
            <div className={`gudang-files ${viewMode}`}>
              {starredFiles.map(file => <FileCard key={file.id} file={file} />)}
            </div>
          </div>
        )}

        {/* Files */}
        <div className="gudang-section">
          <h3 className="gudang-section-title">{showTrash ? '🗑️ Sampah' : '📁 File'}</h3>
          {!loading && filteredFiles.length === 0 ? (
            <div className="gudang-empty">{showTrash ? 'Sampah kosong' : 'Belum ada file — tap Upload ⬆'}</div>
          ) : (
            <div className={`gudang-files ${viewMode}`}>
              {filteredFiles.map(file => <FileCard key={file.id} file={file} />)}
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="gudang-actions">
        <button className="gudang-action-btn" onClick={() => setShowUpload(true)} disabled={uploading}>
          📤 <span>Upload</span>
        </button>
        <button className={`gudang-action-btn ${showTrash ? 'active' : ''}`} onClick={() => setShowTrash(!showTrash)}>
          🗑️ <span>{showTrash ? 'File' : 'Sampah'}</span>
        </button>
        {selectedFiles.length > 0 && (
          <button className="gudang-action-btn danger" onClick={() => { selectedFiles.forEach(id => deleteFile(id)); setSelectedFiles([]) }}>
            🗑️ <span>Hapus ({selectedFiles.length})</span>
          </button>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUpload(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>📤 Upload File</h3>
            <p>Foto, video, dokumen — tersimpan di cloud Cloudflare R2</p>
            <label className="upload-area">
              <input type="file" multiple onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} />
              <div className={`upload-dropzone ${uploading ? 'disabled' : ''}`}>
                <span style={{ fontSize: 36 }}>📤</span>
                <span>{uploading ? 'Mengupload...' : 'Tap untuk pilih file'}</span>
              </div>
            </label>
            {uploading && (
              <div className="upload-modal-progress">
                <div className="upload-modal-bar">
                  <div className="upload-modal-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
                <span>{uploadProgress}%</span>
              </div>
            )}
            <button className="modal-cancel" onClick={() => !uploading && setShowUpload(false)} disabled={uploading}>Batal</button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <div className="preview-header">
              <span className="preview-name">{previewFile.name}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={`${API}/files/${previewFile.id}`}
                  download={previewFile.name}
                  className="preview-download"
                  onClick={e => e.stopPropagation()}
                >
                  ⬇ Download
                </a>
                <button className="preview-close" onClick={() => setPreviewFile(null)}>✕</button>
              </div>
            </div>
            <div className="preview-body">
              {isImage(previewFile.type) ? (
                <img
                  src={`${API}/files/${previewFile.id}`}
                  alt={previewFile.name}
                  className="preview-img"
                />
              ) : isVideo(previewFile.type) ? (
                <video
                  src={`${API}/files/${previewFile.id}`}
                  controls
                  autoPlay
                  className="preview-video"
                />
              ) : null}
            </div>
            <div className="preview-meta">
              {formatSize(previewFile.size)} · {previewFile.type}
            </div>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }

        .gudang-page {
          width: 100%;
          height: 100%;
          background: #0D0D0D;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: #FFFFFF;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* Header */
        .gudang-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          height: 56px;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .gudang-header-left { display: flex; align-items: center; gap: 12px; }
        .gudang-header-right { display: flex; gap: 8px; }
        .gudang-back { background: none; border: none; color: #8B92A8; font-size: 20px; cursor: pointer; padding: 4px 8px; }
        .gudang-title { font-size: 18px; font-weight: 600; color: #FFFFFF; margin: 0; }
        .gudang-view-btn { background: none; border: none; color: #8B92A8; font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
        .gudang-view-btn.active { color: #FF6B00; background: rgba(255,107,0,0.1); }

        /* Search */
        .gudang-search { padding: 10px 16px; flex-shrink: 0; }
        .gudang-search-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 10px 16px;
          color: #FFFFFF;
          font-size: 14px;
          outline: none;
        }
        .gudang-search-input::placeholder { color: #8B92A8; }

        /* Folders */
        .gudang-folders {
          display: flex;
          gap: 8px;
          padding: 0 16px 10px;
          overflow-x: auto;
          flex-shrink: 0;
        }
        .gudang-folder {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          color: #8B92A8;
          font-size: 13px;
          white-space: nowrap;
          cursor: pointer;
          transition: all 200ms;
        }
        .gudang-folder.active { background: rgba(255,107,0,0.15); border-color: rgba(255,107,0,0.3); color: #FF6B00; }

        /* Error */
        .gudang-error {
          margin: 0 16px 8px;
          padding: 10px 14px;
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 10px;
          color: #EF4444;
          font-size: 13px;
          cursor: pointer;
          flex-shrink: 0;
        }

        /* Scroll area */
        .gudang-scroll { flex: 1; overflow-y: auto; padding: 0 16px 8px; }
        .gudang-section { margin-bottom: 16px; }
        .gudang-section-title { font-size: 13px; color: #8B92A8; margin: 10px 0 8px; font-weight: 500; }
        .gudang-empty { color: #8B92A8; text-align: center; padding: 40px 16px; font-size: 14px; }

        /* File grid */
        .gudang-files { display: grid; gap: 10px; }
        .gudang-files.grid { grid-template-columns: repeat(2, 1fr); }
        .gudang-files.list { grid-template-columns: 1fr; }

        /* File card */
        .gudang-file {
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          transition: all 200ms;
        }
        .gudang-file:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); }
        .gudang-file.selected { border-color: rgba(255,107,0,0.4); background: rgba(255,107,0,0.06); }
        .gudang-file.starred { border-color: rgba(255,107,0,0.2); }

        /* List mode override */
        .gudang-files.list .gudang-file { flex-direction: row; align-items: center; padding: 10px 12px; }
        .gudang-files.list .file-thumb { width: 44px; height: 44px; border-radius: 8px; flex-shrink: 0; margin-right: 4px; }
        .gudang-files.list .file-info { flex: 1; }
        .gudang-files.list .file-name { font-size: 14px; }

        /* Thumbnail */
        .file-thumb {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          background: rgba(255,255,255,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .thumb-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
        }
        .thumb-icon { font-size: 32px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
        .thumb-play {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0,0,0,0.55);
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          pointer-events: none;
        }

        /* File info & actions */
        .file-info { padding: 8px 10px 2px; }
        .file-name { display: block; color: #FFFFFF; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .file-meta { display: block; color: #8B92A8; font-size: 11px; margin-top: 2px; }
        .file-actions-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 4px 8px 8px;
          gap: 4px;
        }
        .file-star { background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px; color: #8B92A8; }
        .file-star.active { color: #FF6B00; }
        .file-delete { background: none; border: none; cursor: pointer; font-size: 15px; padding: 4px; color: #EF4444; opacity: 0; transition: opacity 200ms; }
        .gudang-file:hover .file-delete { opacity: 1; }
        .gudang-file.selected .file-delete { opacity: 1; color: #FF6B00; }
        .file-restore {
          background: rgba(59,130,246,0.15);
          border: none;
          color: #3B82F6;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }

        /* Action Bar */
        .gudang-actions {
          display: flex;
          gap: 8px;
          padding: 10px 16px;
          border-top: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
          overflow-x: auto;
        }
        .gudang-action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: #FFFFFF;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 200ms;
        }
        .gudang-action-btn:hover { background: rgba(255,255,255,0.1); }
        .gudang-action-btn.active { background: rgba(255,107,0,0.15); color: #FF6B00; border-color: rgba(255,107,0,0.3); }
        .gudang-action-btn.danger { background: rgba(239,68,68,0.15); color: #EF4444; border-color: rgba(239,68,68,0.3); }
        .gudang-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Modals */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .modal-content {
          background: #1C1C2E;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 24px;
          width: 100%;
          max-width: 400px;
        }
        .modal-content h3 { color: #FFFFFF; font-size: 18px; margin: 0 0 8px; }
        .modal-content p { color: #8B92A8; font-size: 13px; margin-bottom: 16px; }

        .upload-area { display: block; cursor: pointer; }
        .upload-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 40px 24px;
          background: rgba(255,255,255,0.03);
          border: 2px dashed rgba(255,255,255,0.1);
          border-radius: 16px;
          color: #8B92A8;
          transition: all 200ms;
        }
        .upload-dropzone:hover { border-color: rgba(255,107,0,0.4); background: rgba(255,107,0,0.03); }
        .upload-dropzone.disabled { opacity: 0.5; cursor: not-allowed; }

        .upload-modal-progress { margin-top: 16px; display: flex; align-items: center; gap: 10px; }
        .upload-modal-bar { flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
        .upload-modal-fill { height: 100%; background: linear-gradient(90deg,#FF6B00,#FF8C00); border-radius: 3px; transition: width 300ms; }

        .modal-cancel {
          width: 100%;
          padding: 12px;
          margin-top: 16px;
          background: rgba(255,255,255,0.05);
          border: none;
          border-radius: 12px;
          color: #8B92A8;
          font-size: 14px;
          cursor: pointer;
        }
        .modal-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Preview Modal */
        .preview-modal {
          background: #0D0D0D;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
          gap: 8px;
        }
        .preview-name { color: #FFFFFF; font-size: 14px; font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .preview-download {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: rgba(255,107,0,0.15);
          border: 1px solid rgba(255,107,0,0.3);
          border-radius: 8px;
          color: #FF6B00;
          font-size: 12px;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .preview-close {
          background: rgba(255,255,255,0.08);
          border: none;
          color: #8B92A8;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .preview-body {
          flex: 1;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          min-height: 200px;
        }
        .preview-img { max-width: 100%; max-height: 70vh; object-fit: contain; display: block; }
        .preview-video { max-width: 100%; max-height: 70vh; display: block; }
        .preview-meta {
          padding: 10px 16px;
          color: #8B92A8;
          font-size: 12px;
          border-top: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .gudang-page { max-width: 430px; margin: 0 auto; }
        }
        @media (max-width: 380px) {
          .gudang-files.grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

export default Gudang
