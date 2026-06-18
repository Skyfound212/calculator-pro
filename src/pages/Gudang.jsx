import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FILE_ICONS, STORAGE_KEYS } from '../utils/constants'

function Gudang() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  // State
  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([
    { id: 'root', name: 'Semua File', parentId: null, createdAt: Date.now() }
  ])
  const [currentFolderId, setCurrentFolderId] = useState('root')
  const [selectedItems, setSelectedItems] = useState([])
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [sortBy, setSortBy] = useState('name') // 'name' | 'date' | 'size' | 'type'
  const [sortOrder, setSortOrder] = useState('asc') // 'asc' | 'desc'
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const [previewItem, setPreviewItem] = useState(null)
  const [trash, setTrash] = useState([])
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'starred' | 'shared' | 'trash'
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [storageUsed, setStorageUsed] = useState(0)
  const [storageLimit] = useState(2 * 1024 * 1024 * 1024) // 2GB default

  // Load data from IndexedDB on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Try to load from IndexedDB
      const db = await openDB()
      const storedFiles = await db.getAll('files')
      const storedFolders = await db.getAll('folders')
      const storedTrash = await db.getAll('trash')
      
      if (storedFiles.length > 0) setFiles(storedFiles)
      if (storedFolders.length > 0) setFolders(storedFolders)
      if (storedTrash.length > 0) setTrash(storedTrash)
      
      calculateStorage(storedFiles)
    } catch {
      // Fallback: load from localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.GUDANG_DATA)
        if (stored) {
          const data = JSON.parse(stored)
          if (data.files) setFiles(data.files)
          if (data.folders) setFolders(data.folders)
          if (data.trash) setTrash(data.trash)
          calculateStorage(data.files || [])
        }
      } catch {
        // Use defaults
      }
    }
  }

  const saveData = async () => {
    try {
      const db = await openDB()
      const tx = db.transaction(['files', 'folders', 'trash'], 'readwrite')
      await Promise.all([
        ...files.map(f => tx.objectStore('files').put(f)),
        ...folders.map(f => tx.objectStore('folders').put(f)),
        ...trash.map(f => tx.objectStore('trash').put(f))
      ])
      await tx.done
    } catch {
      // Fallback to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.GUDANG_DATA, JSON.stringify({ files, folders, trash }))
      } catch {
        // Storage full or not available
      }
    }
  }

  // IndexedDB helper
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
        if (!db.objectStoreNames.contains('trash')) {
          db.createObjectStore('trash', { keyPath: 'id' })
        }
      }
    })
  }

  const calculateStorage = (fileList) => {
    const used = fileList.reduce((sum, f) => sum + (f.size || 0), 0)
    setStorageUsed(used)
  }

  // Navigation
  const goBack = () => navigate('/skyroom')
  
  const getBreadcrumb = () => {
    const crumbs = []
    let current = folders.find(f => f.id === currentFolderId)
    while (current) {
      crumbs.unshift(current)
      current = folders.find(f => f.id === current.parentId)
    }
    return crumbs
  }

  // File operations
  const handleFileUpload = useCallback(async (event) => {
    const uploadedFiles = event.target.files
    if (!uploadedFiles.length) return

    const newFiles = []
    for (const file of uploadedFiles) {
      const reader = new FileReader()
      const content = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result)
        reader.readAsDataURL(file)
      })

      const newFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        originalName: file.name,
        type: file.type,
        size: file.size,
        content: content,
        folderId: currentFolderId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isStarred: false,
        isTrashed: false
      }
      newFiles.push(newFile)
    }

    const updatedFiles = [...files, ...newFiles]
    setFiles(updatedFiles)
    calculateStorage(updatedFiles)
    saveData()
  }, [files, currentFolderId])

  const createFolder = useCallback(() => {
    if (!newFolderName.trim()) return
    
    const newFolder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newFolderName.trim(),
      parentId: currentFolderId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    const updatedFolders = [...folders, newFolder]
    setFolders(updatedFolders)
    setNewFolderName('')
    setShowNewFolder(false)
    saveData()
  }, [folders, currentFolderId, newFolderName])

  const deleteItem = useCallback((item) => {
    if (item.type === 'folder') {
      // Move folder to trash (soft delete)
      const updatedFolders = folders.filter(f => f.id !== item.id)
      setFolders(updatedFolders)
    } else {
      // Move file to trash
      const updatedFiles = files.map(f => 
        f.id === item.id ? { ...f, isTrashed: true, trashedAt: Date.now() } : f
      )
      setFiles(updatedFiles)
      setTrash([...trash, { ...item, isTrashed: true, trashedAt: Date.now() }])
    }
    
    setSelectedItems([])
    saveData()
  }, [files, folders, trash])

  const restoreItem = useCallback((item) => {
    if (item.type === 'folder') {
      // Restore folder
      const updatedFolders = [...folders, { ...item, isTrashed: false }]
      setFolders(updatedFolders)
    } else {
      // Restore file
      const updatedFiles = files.map(f => 
        f.id === item.id ? { ...f, isTrashed: false, trashedAt: null } : f
      )
      setFiles(updatedFiles)
    }
    
    const updatedTrash = trash.filter(t => t.id !== item.id)
    setTrash(updatedTrash)
    saveData()
  }, [files, folders, trash])

  const permanentDelete = useCallback((item) => {
    const updatedTrash = trash.filter(t => t.id !== item.id)
    setTrash(updatedTrash)
    
    if (item.type !== 'folder') {
      const updatedFiles = files.filter(f => f.id !== item.id)
      setFiles(updatedFiles)
      calculateStorage(updatedFiles)
    }
    
    saveData()
  }, [files, trash])

  const toggleStar = useCallback((item) => {
    if (item.type === 'folder') {
      const updated = folders.map(f => 
        f.id === item.id ? { ...f, isStarred: !f.isStarred } : f
      )
      setFolders(updated)
    } else {
      const updated = files.map(f => 
        f.id === item.id ? { ...f, isStarred: !f.isStarred } : f
      )
      setFiles(updated)
    }
    saveData()
  }, [files, folders])

  const renameItem = useCallback((item, newName) => {
    if (!newName.trim()) return
    
    if (item.type === 'folder') {
      const updated = folders.map(f => 
        f.id === item.id ? { ...f, name: newName.trim(), updatedAt: Date.now() } : f
      )
      setFolders(updated)
    } else {
      const updated = files.map(f => 
        f.id === item.id ? { ...f, name: newName.trim(), updatedAt: Date.now() } : f
      )
      setFiles(updated)
    }
    saveData()
  }, [files, folders])

  // Get filtered items
  const getCurrentItems = () => {
    let items = []
    
    if (activeTab === 'trash') {
      return trash.map(t => ({ ...t, type: t.type || 'file' }))
    }
    
    if (activeTab === 'starred') {
      items = [
        ...folders.filter(f => f.isStarred && !f.isTrashed),
        ...files.filter(f => f.isStarred && !f.isTrashed)
      ]
    } else if (activeTab === 'shared') {
      items = files.filter(f => f.isShared && !f.isTrashed)
    } else {
      // All files in current folder
      items = [
        ...folders.filter(f => f.parentId === currentFolderId && !f.isTrashed),
        ...files.filter(f => f.folderId === currentFolderId && !f.isTrashed)
      ]
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      items = items.filter(item => item.name.toLowerCase().includes(query))
    }
    
    // Sort
    items.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          comparison = (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
          break
        case 'size':
          comparison = (b.size || 0) - (a.size || 0)
          break
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '')
          break
        default:
          comparison = 0
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return items
  }

  // Get file icon
  const getFileIcon = (item) => {
    if (item.type === 'folder') return FILE_ICONS.folder
    
    const type = item.type || ''
    if (type.startsWith('image/')) return FILE_ICONS.image
    if (type.startsWith('video/')) return FILE_ICONS.video
    if (type.startsWith('audio/')) return FILE_ICONS.audio
    if (type === 'application/pdf') return FILE_ICONS.pdf
    if (type.startsWith('text/') || type.includes('json') || type.includes('javascript')) return FILE_ICONS.text
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return FILE_ICONS.archive
    return FILE_ICONS.unknown
  }

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Context menu
  const handleContextMenu = (e, item) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    })
  }

  // Share functionality
  const shareItem = useCallback((item) => {
    const updated = files.map(f => 
      f.id === item.id ? { ...f, isShared: true, shareId: `share_${Date.now()}` } : f
    )
    setFiles(updated)
    saveData()
    
    // Copy share link to clipboard
    const shareLink = `${window.location.origin}/share/${item.shareId}`
    navigator.clipboard.writeText(shareLink).catch(() => {})
  }, [files])

  // Download
  const downloadItem = (item) => {
    if (!item.content) return
    const link = document.createElement('a')
    link.href = item.content
    link.download = item.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Preview
  const openPreview = (item) => {
    setPreviewItem(item)
  }

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const currentItems = getCurrentItems()
  const breadcrumb = getBreadcrumb()

  return (
    <div className="gudang-page">
      {/* Header */}
      <div className="gudang-header">
        <div className="gudang-header-left">
          <button className="gudang-back" onClick={goBack}>⬅</button>
          <h1 className="gudang-title">📦 Gudang</h1>
        </div>
        <div className="gudang-header-right">
          <button 
            className={`gudang-search-btn ${showSearch ? 'active' : ''}`} 
            onClick={() => setShowSearch(!showSearch)}
          >
            🔍
          </button>
          <button className="gudang-view-btn" onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? '☰' : '⊞'}
          </button>
          <button className="gudang-more-btn" onClick={() => setShowActionMenu(!showActionMenu)}>⋮</button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="gudang-search-bar animate-fade-in">
          <input
            type="text"
            placeholder="Cari file atau folder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="gudang-tabs">
        <button 
          className={`gudang-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          📁 Semua
        </button>
        <button 
          className={`gudang-tab ${activeTab === 'starred' ? 'active' : ''}`}
          onClick={() => setActiveTab('starred')}
        >
          ⭐ Favorit
        </button>
        <button 
          className={`gudang-tab ${activeTab === 'shared' ? 'active' : ''}`}
          onClick={() => setActiveTab('shared')}
        >
          📤 Dibagikan
        </button>
        <button 
          className={`gudang-tab ${activeTab === 'trash' ? 'active' : ''}`}
          onClick={() => setActiveTab('trash')}
        >
          🗑️ Sampah
        </button>
      </div>

      {/* Breadcrumb */}
      {activeTab === 'all' && (
        <div className="gudang-breadcrumb">
          {breadcrumb.map((folder, index) => (
            <React.Fragment key={folder.id}>
              {index > 0 && <span className="breadcrumb-sep">/</span>}
              <button 
                className={`breadcrumb-item ${index === breadcrumb.length - 1 ? 'current' : ''}`}
                onClick={() => index < breadcrumb.length - 1 && setCurrentFolderId(folder.id)}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Sort Bar */}
      <div className="gudang-sort">
        <span className="sort-label">Urutkan:</span>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Nama</option>
          <option value="date">Tanggal</option>
          <option value="size">Ukuran</option>
          <option value="type">Tipe</option>
        </select>
        <button 
          className="sort-order" 
          onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Content */}
      <div className={`gudang-content ${viewMode}`}>
        {currentItems.length === 0 ? (
          <div className="gudang-empty">
            <div className="empty-icon">{activeTab === 'trash' ? '🗑️' : '📂'}</div>
            <p className="empty-text">
              {activeTab === 'trash' 
                ? 'Sampah kosong' 
                : searchQuery 
                  ? 'Tidak ada hasil pencarian' 
                  : 'Folder ini kosong'
              }
            </p>
            {activeTab !== 'trash' && !searchQuery && (
              <button className="empty-action" onClick={() => fileInputRef.current?.click()}>
                Upload File Pertama
              </button>
            )}
          </div>
        ) : (
          currentItems.map(item => (
            <div
              key={item.id}
              className={`gudang-item ${selectedItems.includes(item.id) ? 'selected' : ''}`}
              onClick={() => item.type === 'folder' ? setCurrentFolderId(item.id) : openPreview(item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
            >
              {viewMode === 'grid' ? (
                <>
                  <div className="item-icon">{getFileIcon(item)}</div>
                  <div className="item-name" title={item.name}>{item.name}</div>
                  <div className="item-meta">
                    {item.type === 'folder' 
                      ? `${item.itemCount || 0} item` 
                      : formatSize(item.size)
                    }
                  </div>
                  {item.isStarred && <div className="item-star">⭐</div>}
                </>
              ) : (
                <>
                  <div className="list-icon">{getFileIcon(item)}</div>
                  <div className="list-name">{item.name}</div>
                  <div className="list-type">{item.type === 'folder' ? 'Folder' : (item.type || 'File').split('/')[1] || 'File'}</div>
                  <div className="list-size">{item.type === 'folder' ? '-' : formatSize(item.size)}</div>
                  <div className="list-date">{formatDate(item.updatedAt || item.createdAt)}</div>
                  {item.isStarred && <div className="list-star">⭐</div>}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Storage Bar */}
      <div className="gudang-storage">
        <div className="storage-info">
          <span>💾 {formatSize(storageUsed)} / {formatSize(storageLimit)}</span>
          <span>{Math.round((storageUsed / storageLimit) * 100)}%</span>
        </div>
        <div className="storage-bar">
          <div 
            className="storage-fill" 
            style={{ width: `${Math.min((storageUsed / storageLimit) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="gudang-bottom-bar">
        <button className="bottom-btn" onClick={() => setShowNewFolder(true)}>
          <span>📁</span>
          <span>Baru</span>
        </button>
        <button className="bottom-btn" onClick={() => fileInputRef.current?.click()}>
          <span>⬆️</span>
          <span>Upload</span>
        </button>
        <button className="bottom-btn" onClick={() => {}}>
          <span>📤</span>
          <span>Share</span>
        </button>
        <button className="bottom-btn" onClick={() => setActiveTab('trash')}>
          <span>🗑️</span>
          <span>Sampah</span>
        </button>
        <button className="bottom-btn" onClick={() => setShowActionMenu(true)}>
          <span>➕</span>
          <span>Lainnya</span>
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* New Folder Modal */}
      {showNewFolder && (
        <div className="modal-overlay" onClick={() => setShowNewFolder(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Buat Folder Baru</h3>
            <input
              type="text"
              placeholder="Nama folder..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowNewFolder(false)}>Batal</button>
              <button className="modal-confirm" onClick={createFolder}>Buat</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="preview-overlay" onClick={() => setPreviewItem(null)}>
          <div className="preview-content" onClick={e => e.stopPropagation()}>
            <div className="preview-header">
              <span className="preview-title">{previewItem.name}</span>
              <button className="preview-close" onClick={() => setPreviewItem(null)}>✕</button>
            </div>
            <div className="preview-body">
              {previewItem.type?.startsWith('image/') ? (
                <img src={previewItem.content} alt={previewItem.name} className="preview-image" />
              ) : previewItem.type?.startsWith('video/') ? (
                <video src={previewItem.content} controls className="preview-video" />
              ) : previewItem.type?.startsWith('audio/') ? (
                <audio src={previewItem.content} controls className="preview-audio" />
              ) : previewItem.type === 'application/pdf' ? (
                <iframe src={previewItem.content} className="preview-pdf" title={previewItem.name} />
              ) : (
                <div className="preview-text">
                  <pre>{previewItem.content?.substring(0, 1000) || 'Tidak dapat menampilkan preview'}</pre>
                </div>
              )}
            </div>
            <div className="preview-actions">
              <button onClick={() => downloadItem(previewItem)}>⬇️ Download</button>
              <button onClick={() => shareItem(previewItem)}>📤 Share</button>
              <button onClick={() => { toggleStar(previewItem); setPreviewItem(null) }}>
                {previewItem.isStarred ? '⭐ Batal Favorit' : '⭐ Favorit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => { toggleStar(contextMenu.item); setContextMenu(null) }}>
            {contextMenu.item.isStarred ? '⭐ Batal Favorit' : '⭐ Tambah Favorit'}
          </button>
          <button onClick={() => { downloadItem(contextMenu.item); setContextMenu(null) }}>⬇️ Download</button>
          <button onClick={() => { shareItem(contextMenu.item); setContextMenu(null) }}>📤 Share</button>
          <button onClick={() => { 
            const newName = prompt('Nama baru:', contextMenu.item.name)
            if (newName) renameItem(contextMenu.item, newName)
            setContextMenu(null)
          }}>✏️ Ganti Nama</button>
          <div className="context-divider" />
          <button 
            className="context-danger"
            onClick={() => { deleteItem(contextMenu.item); setContextMenu(null) }}
          >
            🗑️ {activeTab === 'trash' ? 'Hapus Permanen' : 'Pindah ke Sampah'}
          </button>
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

        /* Header */
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
          font-size: 20px;
          cursor: pointer;
          padding: 8px;
        }

        .gudang-title {
          font-size: 18px;
          font-weight: 600;
          color: #FFFFFF;
          margin: 0;
        }

        .gudang-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .gudang-search-btn,
        .gudang-view-btn,
        .gudang-more-btn {
          background: none;
          border: none;
          color: #8B92A8;
          font-size: 18px;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 200ms ease;
        }

        .gudang-search-btn.active,
        .gudang-search-btn:hover,
        .gudang-view-btn:hover,
        .gudang-more-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #FFFFFF;
        }

        /* Search Bar */
        .gudang-search-bar {
          padding: 8px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
        }

        .gudang-search-bar input {
          width: 100%;
          padding: 10px 36px 10px 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: #FFFFFF;
          font-size: 14px;
          outline: none;
        }

        .gudang-search-bar input::placeholder {
          color: #8B92A8;
        }

        .search-clear {
          position: absolute;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #8B92A8;
          cursor: pointer;
          font-size: 14px;
        }

        /* Tabs */
        .gudang-tabs {
          display: flex;
          gap: 4px;
          padding: 8px 16px;
          overflow-x: auto;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .gudang-tab {
          padding: 8px 16px;
          background: none;
          border: none;
          color: #8B92A8;
          font-size: 13px;
          cursor: pointer;
          border-radius: 20px;
          white-space: nowrap;
          transition: all 200ms ease;
        }

        .gudang-tab.active {
          background: rgba(255, 107, 0, 0.15);
          color: #FF6B00;
          font-weight: 500;
        }

        /* Breadcrumb */
        .gudang-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          font-size: 13px;
          flex-shrink: 0;
        }

        .breadcrumb-item {
          background: none;
          border: none;
          color: #8B92A8;
          cursor: pointer;
          font-size: 13px;
        }

        .breadcrumb-item.current {
          color: #FFFFFF;
          font-weight: 500;
          cursor: default;
        }

        .breadcrumb-sep {
          color: #8B92A8;
          opacity: 0.5;
        }

        /* Sort */
        .gudang-sort {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          font-size: 12px;
          color: #8B92A8;
          flex-shrink: 0;
        }

        .gudang-sort select {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          color: #FFFFFF;
          padding: 4px 8px;
          font-size: 12px;
          outline: none;
        }

        .sort-order {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          color: #FFFFFF;
          padding: 4px 8px;
          cursor: pointer;
        }

        /* Content */
        .gudang-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .gudang-content.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 12px;
          padding: 12px;
        }

        .gudang-content.list {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0 12px;
        }

        /* Grid Item */
        .gudang-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          cursor: pointer;
          transition: all 200ms ease;
          position: relative;
        }

        .gudang-item:hover,
        .gudang-item.selected {
          background: rgba(255, 107, 0, 0.08);
          border-color: rgba(255, 107, 0, 0.2);
        }

        .item-icon {
          font-size: 40px;
          line-height: 1;
        }

        .item-name {
          font-size: 12px;
          color: #FFFFFF;
          text-align: center;
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-meta {
          font-size: 11px;
          color: #8B92A8;
        }

        .item-star {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 12px;
        }

        /* List Item */
        .gudang-content.list .gudang-item {
          flex-direction: row;
          padding: 12px 16px;
          border-radius: 12px;
          gap: 12px;
        }

        .list-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .list-name {
          flex: 1;
          font-size: 14px;
          color: #FFFFFF;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .list-type,
        .list-size,
        .list-date {
          font-size: 12px;
          color: #8B92A8;
          flex-shrink: 0;
          width: 80px;
          text-align: right;
        }

        .list-type { width: 100px; text-align: left; }
n        .list-star {
          font-size: 12px;
          flex-shrink: 0;
        }

        /* Empty State */
        .gudang-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 16px;
          padding: 40px;
        }

        .empty-icon {
          font-size: 64px;
          opacity: 0.5;
        }

        .empty-text {
          font-size: 14px;
          color: #8B92A8;
          text-align: center;
        }

        .empty-action {
          padding: 12px 24px;
          background: linear-gradient(180deg, #FF6B00 0%, #FF8C00 100%);
          border: none;
          border-radius: 12px;
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .empty-action:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(255, 107, 0, 0.3);
        }

        /* Storage Bar */
        .gudang-storage {
          padding: 12px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          flex-shrink: 0;
        }

        .storage-info {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #8B92A8;
          margin-bottom: 6px;
        }

        .storage-bar {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
          overflow: hidden;
        }

        .storage-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF6B00, #FF8C00);
          border-radius: 2px;
          transition: width 400ms ease;
        }

        /* Bottom Bar */
        .gudang-bottom-bar {
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 8px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          flex-shrink: 0;
          background: rgba(10, 14, 26, 0.95);
          backdrop-filter: blur(12px);
        }

        .bottom-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          background: none;
          border: none;
          color: #8B92A8;
          font-size: 10px;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 12px;
          transition: all 200ms ease;
        }

        .bottom-btn:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.05);
        }

        .bottom-btn span:first-child {
          font-size: 20px;
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
        }

        .modal-content {
          background: #1C1C2E;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px;
          width: 90%;
n          max-width: 360px;
          animation: scaleIn 200ms ease;
        }

        .modal-content h3 {
          color: #FFFFFF;
          font-size: 18px;
          margin: 0 0 16px 0;
        }

        .modal-content input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: #FFFFFF;
          font-size: 14px;
          outline: none;
          margin-bottom: 16px;
        }

        .modal-content input::placeholder {
          color: #8B92A8;
        }

        .modal-actions {
          display: flex;
          gap: 8px;
        }

        .modal-actions button {
          flex: 1;
          padding: 12px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .modal-cancel {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #8B92A8;
        }

        .modal-confirm {
          background: linear-gradient(180deg, #FF6B00 0%, #FF8C00 100%);
          border: none;
          color: #FFFFFF;
        }

        /* Preview */
        .preview-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          animation: fadeIn 200ms ease;
        }

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .preview-title {
          color: #FFFFFF;
          font-size: 16px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .preview-close {
          background: none;
          border: none;
          color: #8B92A8;
          font-size: 20px;
          cursor: pointer;
          padding: 8px;
        }

        .preview-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
          padding: 16px;
        }

        .preview-image {
          max-width: 100%;
          max-height: 100%;
          border-radius: 12px;
        }

        .preview-video {
          max-width: 100%;
          max-height: 100%;
          border-radius: 12px;
        }

        .preview-audio {
          width: 100%;
        }

        .preview-pdf {
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 12px;
        }

        .preview-text {
          width: 100%;
          max-height: 100%;
          overflow: auto;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 16px;
        }

        .preview-text pre {
          color: #FFFFFF;
          font-size: 13px;
          line-height: 1.6;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .preview-actions {
          display: flex;
          gap: 8px;
          padding: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .preview-actions button {
          flex: 1;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: #FFFFFF;
          font-size: 13px;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .preview-actions button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        /* Context Menu */
        .context-menu {
          position: fixed;
          background: #1C1C2E;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 8px 0;
          min-width: 180px;
          z-index: 1001;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          animation: scaleIn 150ms ease;
        }

        .context-menu button {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          background: none;
          border: none;
          color: #FFFFFF;
          font-size: 14px;
          cursor: pointer;
          text-align: left;
          transition: all 150ms ease;
        }

        .context-menu button:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .context-menu .context-danger {
          color: #EF4444;
        }

        .context-menu .context-danger:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .context-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 6px 0;
        }

        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Responsive */
        @media (min-width: 768px) {
          .gudang-page {
            max-width: 430px;
            margin: 0 auto;
          }
        }

        @media (max-width: 380px) {
          .gudang-content.grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            padding: 8px;
          }
n        }
      `}</style>
    </div>
  )
}

export default Gudang