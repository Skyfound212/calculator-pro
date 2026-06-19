import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const API = '/api'

function Gudang() {
  const navigate = useNavigate()

  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([
    { id: 'root', name: 'Semua File', parentId: null }
  ])
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

  // Load data from R2 via Pages Functions
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

  // Upload file to R2
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

  // Move file to trash (soft delete)
  const deleteFile = useCallback(async (fileId) => {
    try {
      await fetch(`${API}/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTrashed: true })
      })
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isTrashed: true } : f))
      setSelectedFiles(prev => prev.filter(id => id !== fileId))
    } catch (err) {
      setUploadError('Gagal menghapus file.')
    }
  }, [])

  // Restore from trash
  const restoreFile = useCallback(async (fileId) => {
    try {
      await fetch(`${API}/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTrashed: false })
      })
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isTrashed: false } : f))
    } catch (err) {
      setUploadError('Gagal memulihkan file.')
    }
  }, [])

  // Permanent delete from R2
  const permanentDelete = useCallback(async (fileId) => {
    try {
      await fetch(`${API}/files/${fileId}`, { method: 'DELETE' })
      setFiles(prev => prev.filter(f => f.id !== fileId))
    } catch (err) {
      setUploadError('Gagal menghapus permanen.')
    }
  }, [])

  // Toggle star
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
    } catch (err) {
      setUploadError('Gagal memperbarui bintang.')
    }
  }, [files])

  // Create folder
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
    } catch (err) {
      setUploadError('Gagal membuat folder.')
    }
  }, [])

  // Get file icon
  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return '🖼️'
    if (type.startsWith('text/')) return '📄'
    if (type.includes('json') || type.includes('javascript')) return '💻'
    return '📎'
  }

  // Filter files
  const filteredFiles = files.filter(f => {
    if (showTrash) return f.isTrashed
    if (f.isTrashed) return false
    if (currentFolder !== 'root' && f.folderId !== currentFolder) return false
    if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const starredFiles = files.filter(f => f.isStarred && !f.isTrashed)

  return (
    <div className="gudang-page">
      {/* Header */}
      <div className="gudang-header">
        <div className="gudang-header-left">
          <button className="gudang-back" onClick={() => navigate('/skyroom')}>
            ⬅
          </button>
          <h1 className="gudang-title">📦 Gudang</h1>
        </div>
        <div className="gudang-header-right">
          <button 
            className={`gudang-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            ⊞
          </button>
          <button 
            className={`gudang-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Search Bar */}
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
            📁
            <span>{folder.name}</span>
          </button>
        ))}
        <button className="gudang-folder" onClick={() => createFolder()}>
          <span>+</span>
          <span>Folder</span>
        </button>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="gudang-error" onClick={() => setUploadError(null)}>
          ⚠️ {uploadError}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="gudang-empty">Memuat dari cloud... ☁️</div>
      )}

      {/* Starred Section */}
      {!loading && !showTrash && starredFiles.length > 0 && (
        <div className="gudang-section">
          <h3 className="gudang-section-title">⭐ Favorit</h3>
          <div className={`gudang-files ${viewMode}`}>
            {starredFiles.map(file => (
              <div key={file.id} className="gudang-file starred">
                <div className="file-icon">{getFileIcon(file.type)}</div>
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-meta">{formatSize(file.size)}</span>
                </div>
                <button className="file-star active" onClick={() => toggleStar(file.id)}>
                  ⭐
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div className="gudang-section">
        <h3 className="gudang-section-title">
          {showTrash ? '🗑️ Sampah' : '📁 File'}
        </h3>
        
        {!loading && filteredFiles.length === 0 ? (
          <div className="gudang-empty">
            {showTrash ? 'Sampah kosong' : 'Belum ada file'}
          </div>
        ) : (
          <div className={`gudang-files ${viewMode}`}>
            {filteredFiles.map(file => (
              <div 
                key={file.id} 
                className={`gudang-file ${selectedFiles.includes(file.id) ? 'selected' : ''}`}
                onClick={() => {
                  if (selectedFiles.includes(file.id)) {
                    setSelectedFiles(prev => prev.filter(id => id !== file.id))
                  } else {
                    setSelectedFiles(prev => [...prev, file.id])
                  }
                }}
              >
                <div className="file-icon">{getFileIcon(file.type)}</div>
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-meta">{formatSize(file.size)}</span>
                </div>
                
                {!showTrash && (
                  <button 
                    className={`file-star ${file.isStarred ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleStar(file.id) }}
                  >
                    {file.isStarred ? '⭐' : '☆'}
                  </button>
                )}
                
                {showTrash ? (
                  <button 
                    className="file-restore"
                    onClick={(e) => { e.stopPropagation(); restoreFile(file.id) }}
                  >
                    Restore
                  </button>
                ) : (
                  <button 
                    className="file-delete"
                    onClick={(e) => { e.stopPropagation(); deleteFile(file.id) }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="gudang-actions">
        <button 
          className="gudang-action-btn"
          onClick={() => setShowUpload(true)}
          disabled={uploading}
        >
          📤
          <span>Upload</span>
        </button>
        
        <button 
          className={`gudang-action-btn ${showTrash ? 'active' : ''}`}
          onClick={() => setShowTrash(!showTrash)}
        >
          🗑️
          <span>{showTrash ? 'File' : 'Sampah'}</span>
        </button>
        
        {selectedFiles.length > 0 && (
          <button 
            className="gudang-action-btn danger"
            onClick={() => {
              selectedFiles.forEach(id => deleteFile(id))
              setSelectedFiles([])
            }}
          >
            🗑️
            <span>Hapus ({selectedFiles.length})</span>
          </button>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUpload(false)}>
          <div className="modal-content upload-modal" onClick={e => e.stopPropagation()}>
            <h3>📤 Upload File</h3>
            <p>Upload file ke cloud — tidak ada batas ukuran harian</p>
            
            <label className="upload-area">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <div className={`upload-dropzone ${uploading ? 'disabled' : ''}`}>
                <span style={{ fontSize: '32px' }}>📤</span>
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
            
            <button 
              className="modal-cancel" 
              onClick={() => !uploading && setShowUpload(false)}
              disabled={uploading}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <style>{`
        .gudang-page {
          width: 100%;
          height: 100%;
          background: #0D0D0D;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          color: #FFFFFF;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .gudang-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          height: 56px;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .gudang-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .gudang-header-right {
          display: flex;
          gap: 8px;
        }

        .gudang-back {
          background: none;
          border: none;
          color: #8B92A8;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
        }

        .gudang-title {
          font-size: 18px;
          font-weight: 600;
          color: #FFFFFF;
          margin: 0;
        }

        .gudang-view-btn {
          background: none;
          border: none;
          color: #8B92A8;
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .gudang-view-btn.active {
          color: #FF6B00;
          background: rgba(255, 107, 0, 0.1);
        }

        .gudang-search {
          padding: 12px 16px;
          flex-shrink: 0;
        }

        .gudang-search-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 10px 16px;
          color: #FFFFFF;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
        }

        .gudang-search-input::placeholder {
          color: #8B92A8;
        }

        .gudang-folders {
          display: flex;
          gap: 8px;
          padding: 0 16px 12px;
          overflow-x: auto;
          flex-shrink: 0;
        }

        .gudang-folder {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          color: #8B92A8;
          font-size: 13px;
          white-space: nowrap;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .gudang-folder.active {
          background: rgba(255, 107, 0, 0.15);
          border-color: rgba(255, 107, 0, 0.3);
          color: #FF6B00;
        }

        .gudang-error {
          margin: 0 16px 8px;
          padding: 10px 14px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          color: #EF4444;
          font-size: 13px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .gudang-section {
          flex: 1;
          overflow-y: auto;
          padding: 0 16px;
        }

        .gudang-section-title {
          font-size: 14px;
          color: #8B92A8;
          margin: 12px 0 8px;
          font-weight: 500;
        }

        .gudang-empty {
          color: #8B92A8;
          text-align: center;
          padding: 40px;
          font-size: 14px;
        }

        .gudang-files {
          display: grid;
          gap: 8px;
        }

        .gudang-files.grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .gudang-files.list {
          grid-template-columns: 1fr;
        }

        .gudang-file {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .gudang-file:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .gudang-file.selected {
          border-color: rgba(255, 107, 0, 0.3);
          background: rgba(255, 107, 0, 0.05);
        }

        .gudang-file.starred {
          border-color: rgba(255, 107, 0, 0.15);
        }

        .file-icon {
          color: #8B92A8;
          flex-shrink: 0;
          font-size: 20px;
        }

        .file-info {
          flex: 1;
          min-width: 0;
        }

        .file-name {
          display: block;
          color: #FFFFFF;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-meta {
          display: block;
          color: #8B92A8;
          font-size: 11px;
          margin-top: 2px;
        }

        .file-star {
          background: none;
          border: none;
          color: #8B92A8;
          cursor: pointer;
          padding: 4px;
          flex-shrink: 0;
          font-size: 16px;
        }

        .file-star.active {
          color: #FF6B00;
        }

        .file-delete {
          background: none;
          border: none;
          color: #EF4444;
          cursor: pointer;
          padding: 4px;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity 200ms ease;
          font-size: 16px;
        }

        .gudang-file:hover .file-delete {
          opacity: 1;
        }

        .file-restore {
          background: rgba(59, 130, 246, 0.15);
          border: none;
          color: #3B82F6;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
        }

        .gudang-actions {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          flex-shrink: 0;
          overflow-x: auto;
        }

        .gudang-action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: #FFFFFF;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 200ms ease;
        }

        .gudang-action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .gudang-action-btn.active {
          background: rgba(255, 107, 0, 0.15);
          color: #FF6B00;
          border-color: rgba(255, 107, 0, 0.3);
        }

        .gudang-action-btn.danger {
          background: rgba(239, 68, 68, 0.15);
          color: #EF4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .gudang-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .modal-content {
          background: #1C1C2E;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px;
          width: 100%;
          max-width: 400px;
        }

        .modal-content h3 {
          color: #FFFFFF;
          font-size: 18px;
          margin: 0 0 8px 0;
        }

        .modal-content p {
          color: #8B92A8;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .upload-area {
          display: block;
          cursor: pointer;
        }

        .upload-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 40px 24px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px dashed rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          color: #8B92A8;
          transition: all 200ms ease;
        }

        .upload-dropzone:hover {
          border-color: rgba(255, 107, 0, 0.3);
          background: rgba(255, 107, 0, 0.03);
        }

        .upload-dropzone.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .upload-modal-progress {
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .upload-modal-bar {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .upload-modal-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF6B00, #FF8C00);
          border-radius: 3px;
          transition: width 300ms ease;
        }

        .modal-cancel {
          width: 100%;
          padding: 12px;
          margin-top: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: none;
          border-radius: 12px;
          color: #8B92A8;
          font-size: 14px;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .modal-cancel:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .modal-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (min-width: 768px) {
          .gudang-page {
            max-width: 430px;
            margin: 0 auto;
          }
        }

        @media (max-width: 380px) {
          .gudang-files.grid {
            grid-template-columns: 1fr;
          }
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
