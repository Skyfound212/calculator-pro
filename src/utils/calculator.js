// ============================================
// CALCULATORPRO - CALCULATION ENGINE
// ============================================

import { STORAGE_KEYS } from './constants'

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
    
    // Validate: HANYA izinkan angka, operator, parentheses, dan Math.sqrt
    // Bug fix: pattern lama terlalu lemah (M, a, t, h diizinkan terpisah)
    const validPattern = /^(?:\d+\.?\d*|\.\d+|[+\-*/()%^]|\*\*|Math\.sqrt|Math\.PI|Math\.E|\s)+$/
    if (!validPattern.test(sanitized)) {
      return null
    }
    
    // Extra validation: cek tidak ada kata/karakter berbahaya
    const dangerous = /(?:eval|function|constructor|prototype|window|document|alert|fetch|import|require|process|global|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|setTimeout|setInterval|clearTimeout|clearInterval|atob|btoa|Function|Object|Array|String|Number|Boolean|Date|RegExp|Error|Promise|Map|Set|WeakMap|WeakSet|Symbol|BigInt|Proxy|Reflect|JSON|Math|console|this|self|top|parent|frames|location|navigator|history|screen|document|window)/gi
    if (dangerous.test(sanitized)) {
      return null
    }
    
    // Bug fix: Ganti Function constructor dengan parser matematika aman
    const result = safeMathEval(sanitized)
    
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
 * Safe math evaluator using shunting-yard algorithm
 * Tidak pakai eval() atau Function constructor
 */
function safeMathEval(expression) {
  // Tokenize
  const tokens = expression.match(/\d+\.?\d*|\.\d+|[+\-*/()%^]|\*\*|Math\.sqrt|Math\.PI|Math\.E/g) || []
  
  const output = []
  const operators = []
  
  const precedence = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    '%': 2,
    '^': 3,
    '**': 3
  }
  
  const isRightAssociative = { '^': true, '**': true }
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    
    // Number
    if (/^\d+\.?\d*$|^\.\d+$/.test(token)) {
      output.push(parseFloat(token))
      continue
    }
    
    // Math constants
    if (token === 'Math.PI') {
      output.push(Math.PI)
      continue
    }
    if (token === 'Math.E') {
      output.push(Math.E)
      continue
    }
    
    // Math.sqrt function
    if (token === 'Math.sqrt') {
      // Cek apakah diikuti oleh angka atau kurung
      if (tokens[i + 1] === '(') {
        // Find matching closing parenthesis
        let depth = 1
        let j = i + 2
        const subExpr = []
        while (j < tokens.length && depth > 0) {
          if (tokens[j] === '(') depth++
          else if (tokens[j] === ')') depth--
          if (depth > 0) subExpr.push(tokens[j])
          j++
        }
        if (subExpr.length > 0) {
          const subResult = safeMathEval(subExpr.join(' '))
          output.push(Math.sqrt(subResult))
          i = j - 1
        }
      } else if (tokens[i + 1] && /^\d+\.?\d*$/.test(tokens[i + 1])) {
        output.push(Math.sqrt(parseFloat(tokens[i + 1])))
        i++
      }
      continue
    }
    
    // Operator
    if (precedence[token]) {
      while (
        operators.length > 0 &&
        operators[operators.length - 1] !== '(' &&
        (
          precedence[operators[operators.length - 1]] > precedence[token] ||
          (
            precedence[operators[operators.length - 1]] === precedence[token] &&
            !isRightAssociative[token]
          )
        )
      ) {
        output.push(operators.pop())
      }
      operators.push(token)
      continue
    }
    
    // Left parenthesis
    if (token === '(') {
      operators.push(token)
      continue
    }
    
    // Right parenthesis
    if (token === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        output.push(operators.pop())
      }
      operators.pop() // Remove '('
      continue
    }
  }
  
  // Pop remaining operators
  while (operators.length > 0) {
    output.push(operators.pop())
  }
  
  // Evaluate RPN
  const stack = []
  for (const token of output) {
    if (typeof token === 'number') {
      stack.push(token)
      continue
    }
    
    const b = stack.pop()
    const a = stack.pop()
    
    switch (token) {
      case '+': stack.push(a + b); break
      case '-': stack.push(a - b); break
      case '*': stack.push(a * b); break
      case '/': stack.push(b !== 0 ? a / b : 0); break
      case '%': stack.push(a % b); break
      case '^':
      case '**': stack.push(Math.pow(a, b)); break
      default: stack.push(0)
    }
  }
  
  return stack.length > 0 ? stack[0] : 0
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
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
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
  pow10: (x) => roundResult(Math.pow(10, x)),
  exp: (x) => roundResult(Math.exp(x)),
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
 * Bug fix: Ganti hardcode key pakai STORAGE_KEYS
 */
export const memoryOperations = {
  get: () => {
    const stored = localStorage.getItem(STORAGE_KEYS.CALC_MEMORY)
    return stored ? parseFloat(stored) : 0
  },
  
  set: (value) => {
    localStorage.setItem(STORAGE_KEYS.CALC_MEMORY, value.toString())
  },
  
  clear: () => {
    localStorage.removeItem(STORAGE_KEYS.CALC_MEMORY)
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
 * Bug fix: Ganti hardcode key pakai STORAGE_KEYS
 */
export const historyManager = {
  get: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CALC_HISTORY)
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
    localStorage.setItem(STORAGE_KEYS.CALC_HISTORY, JSON.stringify(history))
  },
  
  clear: () => {
    localStorage.removeItem(STORAGE_KEYS.CALC_HISTORY)
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