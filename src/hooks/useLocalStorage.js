import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook for localStorage with JSON support
 * @param {string} key - Storage key
 * @param {*} initialValue - Default value if not found
 * @returns {[*, Function]} - [value, setValue]
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
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
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

  return [storedValue, setValue, removeValue]
}

/**
 * Hook untuk menyimpan data encrypted di localStorage
 * (Basic encryption dengan XOR + Base64 — bukan AES, tapi cukup untuk local)
 * @param {string} key - Storage key
 * @param {*} initialValue - Default value
 * @param {string} passphrase - Passphrase untuk encryption
 */
export function useEncryptedStorage(key, initialValue, passphrase = '') {
  const encrypt = useCallback((data) => {
    try {
      const json = JSON.stringify(data)
      const encoded = btoa(json)
      if (!passphrase) return encoded
      
      // Simple XOR obfuscation (not military-grade, but sufficient for local)
      let result = ''
      for (let i = 0; i < encoded.length; i++) {
        const charCode = encoded.charCodeAt(i) ^ passphrase.charCodeAt(i % passphrase.length)
        result += String.fromCharCode(charCode)
      }
      return btoa(result)
    } catch {
      return null
    }
  }, [passphrase])

  const decrypt = useCallback((encrypted) => {
    try {
      if (!passphrase) return JSON.parse(atob(encrypted))
      
      const decoded = atob(encrypted)
      let result = ''
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ passphrase.charCodeAt(i % passphrase.length)
        result += String.fromCharCode(charCode)
      }
      return JSON.parse(atob(result))
    } catch {
      return initialValue
    }
  }, [passphrase, initialValue])

  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? decrypt(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      const encrypted = encrypt(valueToStore)
      if (encrypted) {
        window.localStorage.setItem(key, encrypted)
      }
    } catch (error) {
      console.error(`Error setting encrypted storage key "${key}":`, error)
    }
  }, [key, storedValue, encrypt])

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.error(`Error removing encrypted storage key "${key}":`, error)
    }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue]
}