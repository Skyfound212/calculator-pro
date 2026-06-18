// ============================================
// CALCULATORPRO - CALCULATION ENGINE
// ============================================

/**
 * Evaluates a mathematical expression safely
 * Supports: +, -, *, /, %, ^, sqrt, parentheses
 * @param {string} expression - Math expression string
 * @returns {number|null} - Result or null if invalid
 */
export function evaluateExpression(expression) {
  if (!expression || expression.trim() === '') return null
  
  try {
    // Replace display symbols with JS operators
    let sanitized = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/\^/g, '**')
      .replace(/√/g, 'Math.sqrt')
      .replace(/π/g, Math.PI.toString())
      .replace(/e(?![a-zA-Z])/g, Math.E.toString())
    
    // Handle percentage: 50% → 50/100
    sanitized = sanitized.replace(/(\d+(\.\d+)?)%/g, '($1/100)')
    
    // Validate: only allow safe characters
    const validPattern = /^[0-9+\-*/().\s%^Math.sqrtPIE]+$/
    if (!validPattern.test(sanitized)) {
      return null
    }
    
    // Use Function constructor (safer than eval)
    const result = new Function(`return (${sanitized})`)()
    
    // Check for invalid results
    if (!isFinite(result) || isNaN(result)) {
      return null
    }
    
    return roundResult(result)
  } catch (error) {
    return null
  }
}

/**
 * Rounds result to prevent floating point issues
 * @param {number} num - Number to round
 * @returns {number} - Rounded number
 */
export function roundResult(num) {
  const precision = 10000000000 // 10 decimal places
  return Math.round(num * precision) / precision
}

/**
 * Formats number for display
 * @param {number} num - Number to format
 * @returns {string} - Formatted string
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0'
  
  // Handle very large or very small numbers
  if (Math.abs(num) >= 1e15 || (Math.abs(num) < 1e-10 && num !== 0)) {
    return num.toExponential(6)
  }
  
  // Format with locale
  const formatted = num.toLocaleString('id-ID', {
    maximumFractionDigits: 10,
    useGrouping: true
  })
  
  return formatted
}

/**
 * Adds thousands separator to input
 * @param {string} input - Raw input string
 * @returns {string} - Formatted with separators
 */
export function addSeparators(input) {
  if (!input) return ''
  
  // Split by decimal point
  const parts = input.split('.')
  const integerPart = parts[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.')
  const decimalPart = parts[1] ? ',' + parts[1] : ''
  
  return integerPart + decimalPart
}

/**
 * Scientific functions
 */
export const scientificFunctions = {
  sin: (x) => roundResult(Math.sin(x)),
  cos: (x) => roundResult(Math.cos(x)),
  tan: (x) => roundResult(Math.tan(x)),
  asin: (x) => roundResult(Math.asin(x)),
  acos: (x) => roundResult(Math.acos(x)),
  atan: (x) => roundResult(Math.atan(x)),
  log: (x) => roundResult(Math.log10(x)),
  ln: (x) => roundResult(Math.log(x)),
  sqrt: (x) => roundResult(Math.sqrt(x)),
  cbrt: (x) => roundResult(Math.cbrt(x)),
  pow: (x, y) => roundResult(Math.pow(x, y)),
  factorial: (n) => {
    if (n < 0) return null
    if (n === 0 || n === 1) return 1
    let result = 1
    for (let i = 2; i <= n; i++) result *= i
    return result
  },
  abs: (x) => Math.abs(x),
  inv: (x) => x === 0 ? null : roundResult(1 / x),
  square: (x) => roundResult(x * x),
  cube: (x) => roundResult(x * x * x),
  percent: (x) => roundResult(x / 100),
  negate: (x) => -x,
  rad: (deg) => roundResult(deg * (Math.PI / 180)),
  deg: (rad) => roundResult(rad * (180 / Math.PI))
}

/**
 * Memory operations
 */
export const memoryOperations = {
  get: () => {
    const stored = localStorage.getItem('calculatorpro_memory')
    return stored ? parseFloat(stored) : 0
  },
  
  set: (value) => {
    localStorage.setItem('calculatorpro_memory', value.toString())
  },
  
  clear: () => {
    localStorage.removeItem('calculatorpro_memory')
  },
  
  add: (value) => {
    const current = memoryOperations.get()
    memoryOperations.set(current + value)
  },
  
  subtract: (value) => {
    const current = memoryOperations.get()
    memoryOperations.set(current - value)
  }
}

/**
 * History management
 */
export const historyManager = {
  get: () => {
    try {
      const stored = localStorage.getItem('calculatorpro_history')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  },
  
  add: (expression, result) => {
    const history = historyManager.get()
    const entry = {
      id: Date.now(),
      expression,
      result,
      timestamp: new Date().toISOString()
    }
    history.unshift(entry)
    // Keep only last 50
    if (history.length > 50) history.pop()
    localStorage.setItem('calculatorpro_history', JSON.stringify(history))
  },
  
  clear: () => {
    localStorage.removeItem('calculatorpro_history')
  }
}

/**
 * Validates if a string is a valid secret code format
 * @param {string} code - Code to validate
 * @returns {boolean} - Is valid
 */
export function isValidSecretCode(code) {
  if (!code || typeof code !== 'string') return false
  if (code.length < 4 || code.length > 10) return false
  if (!code.endsWith('=')) return false
  // Must contain at least one operator before =
  const operators = ['+', '-', '*', '/', '×', '÷', '^']
  const hasOperator = operators.some(op => code.includes(op))
  return hasOperator
}