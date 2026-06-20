import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSecretCode } from '../hooks/useSecretCode'
import { evaluateExpression, formatNumber, memoryOperations, historyManager } from '../utils/calculator'

// Parse number dari display string (handle locale id-ID)
const parseLocaleNumber = (str) => {
  // Untuk id-ID: titik = separator ribuan, koma = desimal
  // Contoh: "1.234,56" → 1234.56
  const cleaned = str.replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned)
}

function Calculator() {
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [previousValue, setPreviousValue] = useState(null)
  const [operator, setOperator] = useState(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)
  const [memory, setMemory] = useState(memoryOperations.get())
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState(historyManager.get())
  const [parenStack, setParenStack] = useState(0)
  
  const { addToBuffer } = useSecretCode()
  const navigate = useNavigate()
  const displayRef = useRef(null)

  // Update display with animation
  const updateDisplay = useCallback((value) => {
    setDisplay(value)
  }, [])

  // Handle number input
  const inputNumber = useCallback((num) => {
    if (waitingForOperand) {
      updateDisplay(num.toString())
      setWaitingForOperand(false)
      setExpression('') // Clear expression after equals
    } else {
      updateDisplay(display === '0' ? num.toString() : display + num)
    }
    
    addToBuffer(num.toString())
  }, [display, waitingForOperand, updateDisplay, addToBuffer])

  // Handle decimal point
  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      updateDisplay('0.')
      setWaitingForOperand(false)
      setExpression('')
      addToBuffer('.')
      return
    }
    
    // Cek apakah sudah ada koma desimal di angka terakhir
    const parts = display.split(/[\+\-\×\÷]/)
    const lastPart = parts[parts.length - 1]
    if (!lastPart.includes(',')) {
      updateDisplay(display + ',')
      addToBuffer('.')
    }
  }, [display, waitingForOperand, updateDisplay, addToBuffer])

  // Handle parentheses
  const inputParentheses = useCallback(() => {
    if (waitingForOperand) {
      setWaitingForOperand(false)
      setExpression('')
      updateDisplay('(')
      setParenStack(1)
      addToBuffer('(')
      return
    }

    const lastChar = display.slice(-1)
    const isOpen = parenStack > 0 && (lastChar === '(' || /[\+\-\×\÷]/.test(lastChar))
    
    if (isOpen || parenStack === 0) {
      // Buka kurung
      updateDisplay(display === '0' ? '(' : display + ' × (')
      setParenStack(prev => prev + 1)
      addToBuffer('(')
    } else {
      // Tutup kurung
      updateDisplay(display + ')')
      setParenStack(prev => prev - 1)
      addToBuffer(')')
    }
  }, [display, parenStack, waitingForOperand, updateDisplay, addToBuffer])

  // Handle square root
  const inputSquareRoot = useCallback(() => {
    const value = parseLocaleNumber(display)
    if (value < 0) {
      updateDisplay('Error')
      setWaitingForOperand(true)
      return
    }
    const result = Math.sqrt(value)
    const formatted = formatNumber(result)
    setExpression(`√(${display})`)
    updateDisplay(formatted)
    setWaitingForOperand(true)
    setPreviousValue(null)
    setOperator(null)
    addToBuffer('√')
  }, [display, updateDisplay, addToBuffer])

  // Handle operator
  const inputOperator = useCallback((nextOperator) => {
    const inputValue = parseLocaleNumber(display)

    if (previousValue === null) {
      setPreviousValue(inputValue)
    } else if (operator && !waitingForOperand) {
      const currentValue = previousValue || 0
      const newValue = calculate(currentValue, inputValue, operator)
      
      setPreviousValue(newValue)
      updateDisplay(formatNumber(newValue))
    }

    setWaitingForOperand(true)
    setOperator(nextOperator)
    setExpression(`${display} ${nextOperator}`)
    
    addToBuffer(nextOperator)
  }, [display, previousValue, operator, waitingForOperand, updateDisplay, addToBuffer])

  // Calculate result
  const calculate = (left, right, op) => {
    switch (op) {
      case '+': return left + right
      case '-': return left - right
      case '×': return left * right
      case '÷': return right !== 0 ? left / right : left
      case '^': return Math.pow(left, right)
      default: return right
    }
  }

  // Handle equals
  const inputEquals = useCallback(() => {
    const inputValue = parseLocaleNumber(display)

    if (operator && previousValue !== null) {
      const result = calculate(previousValue, inputValue, operator)
      const formattedResult = formatNumber(result)
      
      const fullExpression = `${previousValue} ${operator} ${inputValue}`
      historyManager.add(fullExpression, result)
      setHistory(historyManager.get())
      
      updateDisplay(formattedResult)
      setExpression(`${fullExpression} =`)
      setPreviousValue(null)
      setOperator(null)
      setWaitingForOperand(true)
      setParenStack(0)
    }
    
    addToBuffer('=')
  }, [display, operator, previousValue, updateDisplay, addToBuffer])

  // Clear all
  const clearAll = useCallback(() => {
    setDisplay('0')
    setExpression('')
    setPreviousValue(null)
    setOperator(null)
    setWaitingForOperand(false)
    setParenStack(0)
  }, [])

  // Clear entry
  const clearEntry = useCallback(() => {
    setDisplay('0')
  }, [])

  // Toggle sign
  const toggleSign = useCallback(() => {
    if (display === '0') return
    if (display.startsWith('-')) {
      updateDisplay(display.slice(1))
    } else {
      updateDisplay('-' + display)
    }
  }, [display, updateDisplay])

  // Percentage
  const inputPercent = useCallback(() => {
    const value = parseLocaleNumber(display)
    updateDisplay(formatNumber(value / 100))
  }, [display, updateDisplay])

  // Memory functions
  const handleMemory = useCallback((action) => {
    const currentValue = parseLocaleNumber(display)
    
    switch (action) {
      case 'MC':
        memoryOperations.clear()
        break
      case 'MR':
        updateDisplay(formatNumber(memoryOperations.get()))
        setWaitingForOperand(true)
        break
      case 'M+':
        memoryOperations.add(currentValue)
        break
      case 'M-':
        memoryOperations.subtract(currentValue)
        break
      case 'MS':
        memoryOperations.set(currentValue)
        break
      default:
        break
    }
    
    setMemory(memoryOperations.get())
  }, [display, updateDisplay])

  // Toggle history panel
  const toggleHistory = useCallback(() => {
    setShowHistory(prev => !prev)
  }, [])

  // Navigate to scientific mode
  const goToScientific = useCallback(() => {
    navigate('/scientific')
  }, [navigate])

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key
      
      if (key >= '0' && key <= '9') {
        inputNumber(parseInt(key))
      } else if (key === '.') {
        inputDecimal()
      } else if (key === '+' || key === '-') {
        inputOperator(key)
      } else if (key === '*') {
        inputOperator('×')
      } else if (key === '/') {
        e.preventDefault()
        inputOperator('÷')
      } else if (key === 'Enter' || key === '=') {
        inputEquals()
      } else if (key === 'Escape') {
        clearAll()
      } else if (key === 'Backspace') {
        setDisplay(prev => {
          if (prev.length > 1 && prev !== 'Error') {
            return prev.slice(0, -1)
          }
          return '0'
        })
      } else if (key === '(' || key === ')') {
        inputParentheses()
      } else if (key === '^') {
        inputOperator('^')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inputNumber, inputDecimal, inputOperator, inputEquals, clearAll, inputParentheses])

  // Button component
  const CalcButton = ({ label, onClick, variant = 'number', className = '' }) => {
    const variants = {
      number: 'btn-number',
      operator: 'btn-operator',
      function: 'btn-function',
      equals: 'btn-equals',
      memory: 'btn-memory'
    }
    
    return (
      <button
        className={`calc-btn ${variants[variant]} ${className}`}
        onClick={onClick}
        onTouchStart={(e) => e.currentTarget.classList.add('pressed')}
        onTouchEnd={(e) => e.currentTarget.classList.remove('pressed')}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="calculator-page">
      {/* Header */}
      <div className="calc-header">
        <div className="mode-toggle">
          <span className="mode-active">Basic</span>
          <span className="mode-inactive" onClick={goToScientific}>Scientific</span>
        </div>
        <button className="header-btn" onClick={toggleHistory}>
          <span>⏱</span>
        </button>
      </div>

      {/* Display */}
      <div className="calc-display">
        <div className="display-expression">{expression}</div>
        <div className="display-main" ref={displayRef}>
          {display}
        </div>
      </div>

      {/* Memory Row */}
      <div className="calc-memory-row">
        <CalcButton label="MC" onClick={() => handleMemory('MC')} variant="memory" />
        <CalcButton label="MR" onClick={() => handleMemory('MR')} variant="memory" />
        <CalcButton label="M+" onClick={() => handleMemory('M+')} variant="memory" />
        <CalcButton label="M-" onClick={() => handleMemory('M-')} variant="memory" />
        <CalcButton label="MS" onClick={() => handleMemory('MS')} variant="memory" />
      </div>

      {/* Button Grid — standard 4×5 layout */}
      <div className="calc-button-grid">
        {/* Row 1 */}
        <CalcButton label="AC" onClick={clearAll} variant="function" />
        <CalcButton label="+/-" onClick={toggleSign} variant="function" />
        <CalcButton label="%" onClick={inputPercent} variant="function" />
        <CalcButton label="÷" onClick={() => inputOperator('÷')} variant="operator" />

        {/* Row 2 */}
        <CalcButton label="7" onClick={() => inputNumber(7)} variant="number" />
        <CalcButton label="8" onClick={() => inputNumber(8)} variant="number" />
        <CalcButton label="9" onClick={() => inputNumber(9)} variant="number" />
        <CalcButton label="×" onClick={() => inputOperator('×')} variant="operator" />

        {/* Row 3 */}
        <CalcButton label="4" onClick={() => inputNumber(4)} variant="number" />
        <CalcButton label="5" onClick={() => inputNumber(5)} variant="number" />
        <CalcButton label="6" onClick={() => inputNumber(6)} variant="number" />
        <CalcButton label="−" onClick={() => inputOperator('-')} variant="operator" />

        {/* Row 4 */}
        <CalcButton label="1" onClick={() => inputNumber(1)} variant="number" />
        <CalcButton label="2" onClick={() => inputNumber(2)} variant="number" />
        <CalcButton label="3" onClick={() => inputNumber(3)} variant="number" />
        <CalcButton label="+" onClick={() => inputOperator('+')} variant="operator" />

        {/* Row 5 */}
        <CalcButton label="0" onClick={() => inputNumber(0)} variant="number" className="wide" />
        <CalcButton label="." onClick={inputDecimal} variant="function" />
        <CalcButton label="=" onClick={inputEquals} variant="equals" />
      </div>

      {/* History Panel (Slide-up) */}
      {showHistory && (
        <div className="history-panel animate-slide-up">
          <div className="history-header">
            <h3>Riwayat</h3>
            <button onClick={() => { historyManager.clear(); setHistory([]) }}>
              Hapus
            </button>
          </div>
          <div className="history-list">
            {history.length === 0 ? (
              <p className="history-empty">Belum ada riwayat</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="history-item">
                  <span className="history-expr">{item.expression}</span>
                  <span className="history-result">= {formatNumber(item.result)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .calculator-page {
          width: 100%;
          height: 100%;
          background: #0D0D0D;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        /* Header */
        .calc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          height: 56px;
          flex-shrink: 0;
        }

        .header-btn {
          background: none;
          border: none;
          color: #8E8E93;
          font-size: 20px;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mode-toggle {
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(255, 255, 255, 0.05);
          padding: 6px 16px;
          border-radius: 20px;
        }

        .mode-active {
          color: #FF6B00;
          font-size: 14px;
          font-weight: 600;
        }

        .mode-inactive {
          color: #8E8E93;
          font-size: 14px;
          cursor: pointer;
        }

        /* Display */
        .calc-display {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: flex-end;
          padding: 16px 24px;
          min-height: 120px;
        }

        .display-expression {
          font-size: 20px;
          color: #A1A1A6;
          margin-bottom: 8px;
          min-height: 28px;
          word-break: break-all;
        }

        .display-main {
          font-size: 64px;
          font-weight: 300;
          color: #FFFFFF;
          line-height: 1;
          word-break: break-all;
        }

        /* Memory Row */
        .calc-memory-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          padding: 0 12px 8px;
        }

        /* Button Grid */
        .calc-button-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          padding: 12px;
          padding-bottom: 24px;
        }

        .calc-btn {
          aspect-ratio: 1;
          border-radius: 50%;
          border: none;
          font-size: 28px;
          font-weight: 400;
          cursor: pointer;
          transition: all 150ms ease;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          -webkit-user-select: none;
        }

        .calc-btn.pressed,
        .calc-btn:active {
          transform: scale(0.92);
        }

        .btn-number {
          background: #1C1C1E;
          color: #FFFFFF;
        }

        .btn-number:active {
          background: #2C2C2E;
        }

        .btn-operator {
          background: #FF6B00;
          color: #FFFFFF;
          font-size: 32px;
        }

        .btn-operator:active {
          background: #E55A00;
        }

        .btn-function {
          background: #2C2C2E;
          color: #FFFFFF;
          font-size: 22px;
        }

        .btn-function:active {
          background: #3C3C3E;
        }

        .btn-equals {
          background: linear-gradient(180deg, #FF6B00 0%, #FF8C00 100%);
          color: #FFFFFF;
          font-size: 32px;
        }

        .btn-equals:active {
          background: linear-gradient(180deg, #E55A00 0%, #E57A00 100%);
        }

        .btn-memory {
          background: transparent;
          color: #8E8E93;
          font-size: 16px;
        }

        .btn-memory:active {
          color: #FFFFFF;
        }

        .calc-btn.wide {
          grid-column: span 2;
          aspect-ratio: auto;
          border-radius: 50px;
          justify-content: flex-start;
          padding-left: 28px;
        }

        /* History Panel */
        .history-panel {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: #1C1C1E;
          border-radius: 24px 24px 0 0;
          max-height: 50%;
          z-index: 100;
          animation: slideUp 300ms ease;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .history-header h3 {
          color: #FFFFFF;
          font-size: 18px;
          margin: 0;
        }

        .history-header button {
          background: none;
          border: none;
          color: #FF6B00;
          font-size: 14px;
          cursor: pointer;
        }

        .history-list {
          padding: 16px 24px;
          overflow-y: auto;
          max-height: 300px;
        }

        .history-empty {
          color: #8E8E93;
          text-align: center;
          padding: 24px;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .history-expr {
          color: #8E8E93;
          font-size: 14px;
        }

        .history-result {
          color: #FFFFFF;
          font-size: 16px;
          font-weight: 500;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        /* Responsive */
        @media (max-width: 380px) {
          .display-main { font-size: 48px; }
          .calc-btn { font-size: 24px; }
          .btn-operator, .btn-equals { font-size: 28px; }
        }

        @media (min-width: 768px) {
          .calculator-page {
            max-width: 430px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  )
}

export default Calculator