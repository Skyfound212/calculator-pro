import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SECRET_CODE, STORAGE_KEYS } from '../utils/constants'

/**
 * Hook untuk mendeteksi kode rahasia dari input kalkulator
 * @returns {Object} - Buffer state dan fungsi untuk menambah karakter
 */
export function useSecretCode() {
  const [buffer, setBuffer] = useState('')
  const [isTriggered, setIsTriggered] = useState(false)
  const timeoutRef = useRef(null)
  const navigate = useNavigate()

  // Get stored secret code or use default
  const getSecretCode = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SECRET_CODE)
      return stored || SECRET_CODE.DEFAULT
    } catch {
      return SECRET_CODE.DEFAULT
    }
  }, [])

  // Reset buffer after timeout
  const resetBuffer = useCallback(() => {
    setBuffer('')
    setIsTriggered(false)
  }, [])

  // Add character to buffer
  const addToBuffer = useCallback((char) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setBuffer(prev => {
      const newBuffer = prev + char
      const secretCode = getSecretCode()

      // Check if buffer matches secret code
      if (newBuffer === secretCode) {
        // Trigger!
        setIsTriggered(true)
        return newBuffer
      }

      // Check if buffer could still match (partial match)
      if (!secretCode.startsWith(newBuffer)) {
        // No match possible, but don't reset yet
        // Let user continue typing (might be normal calculation)
      }

      return newBuffer
    })

    // Set timeout to reset buffer
    timeoutRef.current = setTimeout(() => {
      resetBuffer()
    }, SECRET_CODE.TIMEOUT_MS)
  }, [getSecretCode, resetBuffer])

  // Handle trigger effect
  useEffect(() => {
    if (isTriggered) {
      // Small delay to show result first, then transition
      const timer = setTimeout(() => {
        navigate('/skyroom')
        setBuffer('')
        setIsTriggered(false)
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [isTriggered, navigate])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    buffer,
    addToBuffer,
    resetBuffer,
    isTriggered
  }
}

/**
 * Hook untuk mengatur dan mengganti kode rahasia
 * @returns {Object} - Current code dan fungsi update
 */
export function useSecretCodeSettings() {
  const [code, setCode] = useState(SECRET_CODE.DEFAULT)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SECRET_CODE)
      if (stored) setCode(stored)
    } catch {
      // Ignore
    }
  }, [])

  const updateCode = useCallback((newCode) => {
    // Validate
    if (!newCode || newCode.length < 4 || newCode.length > 10) {
      return { success: false, error: 'Kode harus 4-10 karakter' }
    }
    if (!newCode.endsWith('=')) {
      return { success: false, error: 'Kode harus diakhiri dengan =' }
    }
    
    try {
      localStorage.setItem(STORAGE_KEYS.SECRET_CODE, newCode)
      setCode(newCode)
      return { success: true }
    } catch {
      return { success: false, error: 'Gagal menyimpan kode' }
    }
  }, [])

  const resetToDefault = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.SECRET_CODE)
      setCode(SECRET_CODE.DEFAULT)
      return { success: true }
    } catch {
      return { success: false, error: 'Gagal reset kode' }
    }
  }, [])

  return { code, updateCode, resetToDefault }
}