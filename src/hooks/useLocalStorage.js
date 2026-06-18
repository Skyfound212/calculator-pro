import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook for localStorage with JSON support
 * @param {string} key - Storage key
 * @param {*} initialValue - Default value if not found
 * @returns {[*, Function, Function]} - [value, setValue, removeValue]
 */
export function useLocalStorage(key, initialValue) {
  // Get initial value from localStorage or use initialValue
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Update localStorage when value changes
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function (like useState)
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      
      // Cek storage quota sebelum save
      const data = JSON.stringify(valueToStore)
      const bytes = new Blob([data]).size
      const limit = 4.5 * 1024 * 1024 // 4.5MB safety limit
      
      let used = 0
      for (let k in localStorage) {
        if (localStorage.hasOwnProperty(k)) {
          used += localStorage[k].length * 2
        }
      }
      
      if (used + bytes > limit) {
        console.warn(`Storage quota exceeded for key "${key}"`)
        throw new Error('Storage quota exceeded')
      }
      
      window.localStorage.setItem(key, data)
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
      // Alert user kalau storage penuh
      if (error.name === 'QuotaExceededError' || error.message === 'Storage quota exceeded') {
        alert('⚠️ Storage penuh! Hapus data lama terlebih dahulu.')
      }
    }
  }, [key, storedValue])

  // Remove from localStorage
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch {
          setStoredValue(initialValue)
        }
      }
    }
    
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [key, initialValue])

  return [storedValue, setValue, removeValue]
}

/**
 * ⚠️ PERINGATAN: Ini BUKAN enkripsi nyata!
 * 
 * Hook untuk menyimpan data dengan obfuscation sederhana di localStorage.
 * XOR + Base64 adalah obfuscation, bukan enkripsi — data bisa dengan mudah
 * dibalik oleh siapa saja yang punya akses ke source code.
 * 
 * Untuk keamanan nyata, gunakan Web Crypto API atau library seperti crypto-js.
 * 
 * @param {string} key - Storage key
 * @param {*} initialValue - Default value
 * @param {string} passphrase - Passphrase untuk obfuscation (bukan enkripsi!)
 */
export function useEncryptedStorage(key, initialValue, passphrase = '') {
  // Encode/Decode aman dengan UTF-8 support
  const safeBtoa = (str) => {
    try {
      return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => 
        String.fromCharCode('0x' + p1)
      ))
    } catch {
      return null
    }
  }

  const safeAtob = (str) => {
    try {
      return decodeURIComponent(atob(str).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''))
    } catch {
      return null
    }
  }

  // Obfuscation (bukan enkripsi!) dengan XOR
  const obfuscate = useCallback((data) => {
    try {
      const json = JSON.stringify(data)
      const encoded = safeBtoa(json)
      if (!encoded || !passphrase) return encoded
      
      let result = ''
      for (let i = 0; i < encoded.length; i++) {
        const charCode = encoded.charCodeAt(i) ^ passphrase.charCodeAt(i % passphrase.length)
        result += String.fromCharCode(charCode)
      }
      return safeBtoa(result)
    } catch {
      return null
    }
  }, [passphrase])

  const deobfuscate = useCallback((encrypted) => {
    try {
      if (!encrypted) return initialValue
      
      if (!passphrase) {
        const decoded = safeAtob(encrypted)
        return decoded ? JSON.parse(decoded) : initialValue
      }
      
      const decoded = safeAtob(encrypted)
      if (!decoded) return initialValue
      
      let result = ''
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ passphrase.charCodeAt(i % passphrase.length)
        result += String.fromCharCode(charCode)
      }
      
      const final = safeAtob(result)
      return final ? JSON.parse(final) : initialValue
    } catch {
      return initialValue
    }
  }, [passphrase, initialValue])

  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? deobfuscate(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      
      // Cek storage quota
      const encrypted = obfuscate(valueToStore)
      if (!encrypted) {
        throw new Error('Obfuscation failed')
      }
      
      const bytes = encrypted.length * 2
      const limit = 4.5 * 1024 * 1024
      
      let used = 0
      for (let k in localStorage) {
        if (localStorage.hasOwnProperty(k)) {
          used += localStorage[k].length * 2
        }
      }
      
      if (used + bytes > limit) {
        throw new Error('Storage quota exceeded')
      }
      
      window.localStorage.setItem(key, encrypted)
    } catch (error) {
      console.error(`Error setting encrypted storage key "${key}":`, error)
      if (error.message === 'Storage quota exceeded') {
        alert('⚠️ Storage penuh! Hapus data lama terlebih dahulu.')
      }
    }
  }, [key, storedValue, obfuscate])

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.error(`Error removing encrypted storage key "${key}":`, error)
    }
  }, [key, initialValue])

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(deobfuscate(e.newValue))
        } catch {
          setStoredValue(initialValue)
        }
      }
    }
    
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [key, initialValue, deobfuscate])

  return [storedValue, setValue, removeValue]
}