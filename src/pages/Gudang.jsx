import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Folder, Star, Trash2, Upload, FileText, Image, Code, File } from 'lucide-react'
import { STORAGE_KEYS } from '../utils/constants'

// IDB Helper - wrap native IndexedDB dalam Promise
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
      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'id' })
      }
    }
  })
}

// Wrap IDB transaction dalam Promise
const transactionComplete = (tx) => {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(new Error('Transaction aborted'))
  })
}

// Wrap IDB request dalam Promise
const idbRequest = (request) => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function Gudang() {
  const navigate = useNavigate()
  
  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([
    { id: 'root', name: 'Semua File', parentId: null }
  ])
  const [trash, setTrash] = useState([])
  const [currentFolder, setCurrentFolder] = useState('root')
  const [viewMode, setViewMode] = useState('grid') // grid | list
  const [selectedFiles, setSelectedFiles] = useState([])
  const [showUpload, setShowUpload] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState(null)

  // Load data from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const db = await openDB()
        const tx = db.transaction(['files', 'folders'], 'readonly')
        
        const filesStore = tx.objectStore('files')
        const foldersStore = tx.objectStore('folders')
        
        const allFiles = await idbRequest(filesStore.getAll())
        const allFolders = await idbRequest(foldersStore.getAll())
        
        await transactionComplete(tx)
        db.close()
        
        setFiles(allFiles || [])
        if (allFolders && allFolders.length > 0) {
          setFolders(allFolders)
        }
      } catch (err) {
        console.error('Failed to load from IndexedDB:', err)
        // Fallback to localStorage
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.GUDANG_DATA)
          if (stored) {
            const data = JSON.parse(stored)
            setFiles(data.files || [])
            setFolders(data.folders || [{ id: 'root', name: 'Semua File', parentId: null }])
            setTrash(data.trash || [])
          }
        } catch (e) {
          console.error('Fallback load failed:', e)
        }
      }
    }
    
    loadData()
  }, [])

  // Save data to IndexedDB - menerima data sebagai parameter (Bug 3 fix)
  const saveData = useCallback(async (dataToSave) => {
    const data = dataToSave || { files, folders, trash }
    
    try {
      const db = await openDB()
      const tx = db.transaction(['files', 'folders'], 'readwrite')
      
      const filesStore = tx.objectStore('files')
      const foldersStore = tx.objectStore('folders')
      
      // Clear dan rewrite semua data (Bug 2 fix - wrap dalam Promise)
      await idbRequest(filesStore.clear())
      await idbRequest(foldersStore.clear())
      
      // Wrap tiap .put() dalam Promise
      const putPromises = [
        ...data.files.map(f => idbRequest(filesStore.put(f))),
        ...data.folders.map(f => idbRequest(foldersStore.put(f)))
      ]
      
      await Promise.all(putPromises)
      await transactionComplete(tx) // Bug 1 fix - tx.done ganti jadi Promise wrapper
      db.close()
    } catch (err) {
      console.error('Failed to save to IndexedDB:', err)
      // Fallback to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.GUDANG_DATA, JSON.stringify(data))
      } catch (e) {
        console.error('Fallback save failed:', e)
        setUploadError('Storage penuh! Hapus file lama.')
      }
    }
  }, [files, folders, trash])

  // Upload file handler dengan progress (Bug 4 fix)
  const handleFileUpload = useCallback(async (event) => {
    const uploadedFiles = event.target.files
    if (!uploadedFiles || uploadedFiles.length === 0) return
    
    setUploading(true)
    setUploadProgress(0)
    setUploadError(null)
    
    const newFiles = []
    const totalFiles = uploadedFiles.length
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i]
      
      // Cek ukuran file (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(`File "${file.name}" terlalu besar (maksimal 5MB)`)
        continue
      }
      
      // Cek total storage
      const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0) + file.size
      if (totalSize > 10 * 1024 * 1024) { // 10MB total limit
        setUploadError('Total storage melebihi 10MB. Hapus file lama terlebih dahulu.')
        break
      }
      
      try {
        const content = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target.result)
          reader.onerror = (e) => reject(reader.error)
          reader.readAsDataURL(file)
        })
        
        const newFile = {
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          originalName: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          content: content,
          folderId: currentFolder,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isStarred: false,
          isTrashed: false
        }
        
        newFiles.push(newFile)
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100))
      } catch (err) {
        console.error('Failed to read file:', err)
        setUploadError(`Gagal membaca file "${file.name}"`)
      }
    }
    
    if (newFiles.length > 0) {
      const updatedFiles = [...files, ...newFiles]
      setFiles(updatedFiles)
      // Bug 3 fix - kirim data langsung ke saveData, tidak baca state lama
      await saveData({ files: updatedFiles, folders, trash })
    }
    
    setUploading(false)
    setUploadProgress(0)
    setShowUpload(false)
    
    // Reset input
    event.target.value = ''
  }, [files, folders, trash, currentFolder, saveData])

  // Delete file (move to trash)
  const deleteFile = useCallback(async (fileId) => {
    const fileToDelete = files.find(f => f.id === fileId)
    if (!fileToDelete) return
    
    const updatedFiles = files.filter(f => f.id !== fileId)
    const updatedTrash = [...trash, { ...fileToDelete, isTrashed: true, deletedAt: Date.now() }]
    
    setFiles(updatedFiles)
    setTrash(updatedTrash)
    setSelectedFiles(prev => prev.filter(id => id !== fileId))
    
    // Bug 3 fix - kirim data langsung
    await saveData({ files: updatedFiles, folders, trash: updatedTrash })
  }, [files, trash, saveData])

  // Restore from trash
  const restoreFile = useCallback(async (fileId) => {
    const fileToRestore = trash.find(f => f.id === fileId)
    if (!fileToRestore) return
    
    const { deletedAt, isTrashed, ...restoredFile } = fileToRestore
    const updatedTrash = trash.filter(f => f.id !== fileId)
    const updatedFiles = [...files, restoredFile]
    
    setTrash(updatedTrash)
    setFiles(updatedFiles)
    
    // Bug 3 fix
    await saveData({ files: updatedFiles, folders, trash: updatedTrash })
  }, [files, trash, saveData])

  // Permanent delete
  const permanentDelete = useCallback(async (fileId) => {
    const updatedTrash = trash.filter(f => f.id !== fileId)
    setTrash(updatedTrash)
    
    // Bug 3 fix
    await saveData({ files, folders, trash: updatedTrash })
  }, [files, folders, trash, saveData])

  // Toggle star
  const toggleStar = useCallback(async (fileId) => {
    const updatedFiles = files.map(f => 
      f.id === fileId ? { ...f, isStarred: !f.isStarred } : f
    )
    setFiles(updatedFiles)
    
    // Bug 3 fix
    await saveData({ files: updatedFiles, folders, trash })
  }, [files, folders, trash, saveData])

  // Create folder
  const createFolder = useCallback(async (name) => {
    const newFolder = {
      id: `folder_${Date.now()}`,
      name: name || 'Folder Baru',
      parentId: currentFolder,
      createdAt: Date.now()
    }
    
    const updatedFolders = [...folders, newFolder]
    setFolders(updatedFolders)
    
    // Bug 3 fix
    await saveData({ files, folders: updatedFolders, trash })
  }, [files, folders, trash, currentFolder, saveData])

  // Get file icon
  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image size={20} />
    if (type.startsWith('text/')) return <FileText size={20} />
    if (type.includes('json') || type.includes('javascript')) return <Code size={20} />
    return <File size={20} />
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
            <ArrowLeft size={20} />
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
            <Folder size={16} />
            <span>{folder.name}</span>
          </button>
        ))}
        <button className="gudang-folder" onClick={() => createFolder()}>
          <span>+</span>
          <span>Baru</span>
        </button>
      </div>

      {/* Upload Progress Bar (Bug 4 fix) */}
      {uploading && (
        <div className="upload-progress-container">
          <div className="upload-progress-bar">
            <div 
              className="upload-progress-fill" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="upload-progress-text">{uploadProgress}%</span>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="gudang-error">
          ⚠️ {uploadError}
          <button onClick={() => setUploadError(null)}>✕</button>
        </div>
      )}

      {/* Starred Section */}
      {starredFiles.length > 0 && !showTrash && !searchQuery && (
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
                  <Star size={16} fill="#FF6B00" />
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
        
        {filteredFiles.length === 0 ? (
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
                    <Star size={16} fill={file.isStarred ? '#FF6B00' : 'none'} />
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
                    <Trash2 size={16} />
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
          <Upload size={18} />
          <span>Upload</span>
        </button>
        
        <button 
          className={`gudang-action-btn ${showTrash ? 'active' : ''}`}
          onClick={() => setShowTrash(!showTrash)}
        >
          <Trash2 size={18} />
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
            <Trash2 size={18} />
            <span>Hapus ({selectedFiles.length})</span>
          </button>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUpload(false)}>
          <div className="modal-content upload-modal" onClick={e => e.stopPropagation()}>
            <h3>📤 Upload File</h3>
            <p>Maksimal 5MB per file, total 10MB</p>
            
            <label className="upload-area">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <div className={`upload-dropzone ${uploading ? 'disabled' : ''}`}>
                <Upload size={32} />
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
          background: linear-gradient(180deg, #0A0E1A 0%, #0F1420 100%);
          display: flex;
          flex-direction: column;
          overflow: hidden;
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

        .gudang-back {
          background: none;
          border: none;
          color: #8B92A8;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
        }

        .gudang-title {
          font-size: 18px;
          font-weight: 600;
          color: #FFFFFF;
          margin: 0;
        }

        .gudang-header-right {
          display: flex;
          gap: 8px;
        }

        .gudang-view-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: #8B92A8;
          font-size: 16px;
          cursor: pointer;
          padding: 6px 10px;
        }

        .gudang-view-btn.active {
          background: rgba(255, 107, 0, 0.15);
          color: #FF6B00;
          border-color: rgba(255, 107, 0, 0.3);
        }

        .gudang-search {
          padding: 8px 16px;
          flex-shrink: 0;
        }

        .gudang-search-input {
          width: 100%;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: #FFFFFF;
          font-size: 14px;
          outline: none;
        }

        .gudang-search-input::placeholder {
          color: #8B92A8;
        }

        .gudang-folders {
          display: flex;
          gap: 8px;
          padding: 8px 16px;
          overflow-x: auto;
          flex-shrink: 0;
        }

        .gudang-folder {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          color: #8B92A8;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 200ms ease;
        }

        .gudang-folder.active {
          background: rgba(255, 107, 0, 0.15);
          color: #FF6B00;
          border-color: rgba(255, 107, 0, 0.3);
        }

        /* Upload Progress Bar (Bug 4) */
        .upload-progress-container {
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .upload-progress-bar {
          flex: 1;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .upload-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF6B00, #FF8C00);
          border-radius: 2px;
          transition: width 300ms ease;
        }

        .upload-progress-text {
          font-size: 11px;
          color: #FF6B00;
          font-weight: 500;
          min-width: 32px;
        }

        .gudang-error {
          padding: 10px 16px;
          background: rgba(239, 68, 68, 0.1);
          color: #EF4444;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .gudang-error button {
          background: none;
          border: none;
          color: #EF4444;
          cursor: pointer;
          font-size: 14px;
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

        /* Modal */
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
          animation: fadeIn 200ms ease;
          padding: 16px;
        }

        .modal-content {
          background: #1C1C2E;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px;
          width: 100%;
          max-width: 400px;
          animation: scaleIn 200ms ease;
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

        .upload-dropzone svg {
          color: #FF6B00;
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

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
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
  const sizes = ['B', 'KB', 'MB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 2)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

export default Gudang