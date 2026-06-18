import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSecretCode } from '../hooks/useSecretCode'
import { 
  evaluateExpression, 
  formatNumber, 
  scientificFunctions,
  memoryOperations, 
  historyManager 
} from '../utils/calculator'

// Parse number dari display string (handle locale id-ID)
const parseLocaleNumber = (str) => {
  if (str === 'Error' || str === '∞' || str === '-∞') return NaN
  const cleaned = str.replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned)
}

function CalculatorScientific() {
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [previousValue, setPreviousValue] = useState(null)
  const [operator, setOperator] = useState(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)
  const [memory, setMemory] = useState(memoryOperations.get())
  const [isRadians, setIsRadians] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [history, setHistory] = useState(historyManager.get())
  const [parenStack, setParenStack] = useState(0)
  
  const { addToBuffer } = useSecretCode()
  const navigate = useNavigate()
  const displayRef = useRef(null)

  const updateDisplay = useCallback((value) => {
    setDisplay(value)
  }, [])

  // Input number
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

  // Input decimal
  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      updateDisplay('0,')
      setWaitingForOperand(false)
      setExpression('')
      addToBuffer('.')
      return
    }
    
    // Cek apakah sudah ada koma desimal di angka terakhir
    const parts = display.split(/[\+\-\×\÷\(\)]/)
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

  // Scientific functions
  const applyScientific = useCallback((func) => {
    const value = parseLocaleNumber(display)
    if (isNaN(value)) return
    
    let result = null
    let expr = ''

    switch (func) {
      case 'sin':
        result = isRadians ? scientificFunctions.sin(value) : scientificFunctions.sin(scientificFunctions.rad(value))
        expr = `sin(${display})`
        break
      case 'cos':
        result = isRadians ? scientificFunctions.cos(value) : scientificFunctions.cos(scientificFunctions.rad(value))
        expr = `cos(${display})`
        break
      case 'tan':
        result = isRadians ? scientificFunctions.tan(value) : scientificFunctions.tan(scientificFunctions.rad(value))
        expr = `tan(${display})`
        break
      case 'asin':
        result = scientificFunctions.asin(value)
        expr = `asin(${display})`
        break
      case 'acos':
        result = scientificFunctions.acos(value)
        expr = `acos(${display})`
        break
      case 'atan':
        result = scientificFunctions.atan(value)
        expr = `atan(${display})`
        break
      case 'log':
        result = scientificFunctions.log(value)
        expr = `log(${display})`
        break
      case 'ln':
        result = scientificFunctions.ln(value)
        expr = `ln(${display})`
        break
      case 'sqrt':
        if (value < 0) { updateDisplay('Error'); setWaitingForOperand(true); return }
        result = scientificFunctions.sqrt(value)
        expr = `√(${display})`
        break
      case 'cbrt':
        result = scientificFunctions.cbrt(value)
        expr = `∛(${display})`
        break
      case 'square':
        result = scientificFunctions.square(value)
        expr = `sqr(${display})`
        break
      case 'cube':
        result = scientificFunctions.cube(value)
        expr = `cube(${display})`
        break
      case 'inv':
        if (value === 0) { updateDisplay('Error'); setWaitingForOperand(true); return }
        result = scientificFunctions.inv(value)
        expr = `1/(${display})`
        break
      case 'abs':
        result = scientificFunctions.abs(value)
        expr = `abs(${display})`
        break
      case 'factorial':
        if (value < 0 || value > 170) { updateDisplay('Error'); setWaitingForOperand(true); return }
        result = scientificFunctions.factorial(Math.floor(value))
        expr = `fact(${display})`
        break
      case '10x':
        result = scientificFunctions.pow10(value)
        expr = `10^(${display})`
        break
      case 'ex':
        result = scientificFunctions.exp(value)
        expr = `e^(${display})`
        break
      case 'pi':
        updateDisplay(formatNumber(Math.PI))
        setWaitingForOperand(true)
        setExpression('π')
        return
      case 'e':
        updateDisplay(formatNumber(Math.E))
        setWaitingForOperand(true)
        setExpression('e')
        return
      default:
        return
    }

    if (result !== null) {
      updateDisplay(formatNumber(result))
      setExpression(expr)
      setWaitingForOperand(true)
      setPreviousValue(null)
      setOperator(null)
      setParenStack(0)
      
      historyManager.add(expr, result)
      setHistory(historyManager.get())
    }
  }, [display, isRadians, updateDisplay])

  // Standard operators
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

  const inputEquals = useCallback(() => {
    const inputValue = parseLocaleNumber(display)

    if (operator && previousValue !== null) {
      const result = calculate(previousValue, inputValue, operator)
      const fullExpression = `${previousValue} ${operator} ${inputValue}`
      historyManager.add(fullExpression, result)
      setHistory(historyManager.get())
      
      updateDisplay(formatNumber(result))
      setExpression(`${fullExpression} =`)
      setPreviousValue(null)
      setOperator(null)
      setWaitingForOperand(true)
      setParenStack(0)
    }
    addToBuffer('=')
  }, [display, operator, previousValue, updateDisplay, addToBuffer])

  const clearAll = useCallback(() => {
    setDisplay('0')
    setExpression('')
    setPreviousValue(null)
    setOperator(null)
    setWaitingForOperand(false)
    setParenStack(0)
  }, [])

  const toggleSign = useCallback(() => {
    if (display === '0' || display === 'Error') return
    if (display.startsWith('-')) {
      updateDisplay(display.slice(1))
    } else {
      updateDisplay('-' + display)
    }
  }, [display, updateDisplay])

  const inputPercent = useCallback(() => {
    const value = parseLocaleNumber(display)
    if (isNaN(value)) return
    updateDisplay(formatNumber(value / 100))
  }, [display, updateDisplay])

  // Memory
  const handleMemory = useCallback((action) => {
    const currentValue = parseLocaleNumber(display)
    if (isNaN(currentValue)) return
    
    switch (action) {
      case 'MC': memoryOperations.clear(); break
      case 'MR': 
        updateDisplay(formatNumber(memoryOperations.get()))
        setWaitingForOperand(true)
        break
      case 'M+': memoryOperations.add(currentValue); break
      case 'M-': memoryOperations.subtract(currentValue); break
      case 'MS': memoryOperations.set(currentValue); break
      default: break
    }
    setMemory(memoryOperations.get())
  }, [display, updateDisplay])

  const toggleHistory = useCallback(() => {
    setShowHistory(prev => !prev)
    setShowMenu(false)
  }, [])
  
  const toggleMenu = useCallback(() => {
    setShowMenu(prev => !prev)
    setShowHistory(false)
  }, [])
  
  const goToBasic = useCallback(() => navigate('/'), [navigate])
  const toggleRadians = useCallback(() => setIsRadians(prev => !prev), [])

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key
      if (key >= '0' && key <= '9') inputNumber(parseInt(key))
      else if (key === '.') inputDecimal()
      else if (key === '+' || key === '-') inputOperator(key)
      else if (key === '*') inputOperator('×')
      else if (key === '/') { e.preventDefault(); inputOperator('÷') }
      else if (key === 'Enter' || key === '=') inputEquals()
      else if (key === 'Escape') clearAll()
      else if (key === 'Backspace') {
        setDisplay(prev => {
          if (prev.length > 1 && prev !== 'Error') return prev.slice(0, -1)
          return '0'
        })
      } else if (key === '(' || key === ')') inputParentheses()
      else if (key === '^') inputOperator('^')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inputNumber, inputDecimal, inputOperator, inputEquals, clearAll, inputParentheses])

  const CalcButton = ({ label, onClick, variant = 'number', className = '', small = false }) => {
    const variants = {
      number: 'sci-btn-number',
      operator: 'sci-btn-operator',
      function: 'sci-btn-function',
      equals: 'sci-btn-equals',
      memory: 'sci-btn-memory',
      sci: 'sci-btn-sci'
    }
    return (
      <button
        className={`sci-btn ${variants[variant]} ${className} ${small ? 'small' : ''}`}
        onClick={onClick}
        onTouchStart={(e) => e.currentTarget.classList.add('pressed')}
        onTouchEnd={(e) => e.currentTarget.classList.remove('pressed')}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="scientific-page">
      {/* Header */}
      <div className="sci-header">
        <button className="sci-header-btn" onClick={toggleMenu}>☰</button>
        <div className="sci-mode-toggle">
          <span className="sci-mode-inactive" onClick={goToBasic}>Basic</span>
          <span className="sci-mode-active">Scientific</span>
        </div>
        <div className="sci-rad-toggle" onClick={toggleRadians}>
          {isRadians ? 'RAD' : 'DEG'}
        </div>
        <button className="sci-header-btn" onClick={toggleHistory}>⏱</button>
      </div>

      {/* Display */}
      <div className="sci-display">
        <div className="sci-expression">{expression}</div>
        <div className="sci-main" ref={displayRef}>{display}</div>
      </div>

      {/* Scientific Functions Row 1 */}
      <div className="sci-sci-row">
        <CalcButton label="sin" onClick={() => applyScientific('sin')} variant="sci" small />
        <CalcButton label="cos" onClick={() => applyScientific('cos')} variant="sci" small />
        <CalcButton label="tan" onClick={() => applyScientific('tan')} variant="sci" small />
        <CalcButton label="log" onClick={() => applyScientific('log')} variant="sci" small />
        <CalcButton label="ln" onClick={() => applyScientific('ln')} variant="sci" small />
        <CalcButton label="π" onClick={() => applyScientific('pi')} variant="sci" small />
      </div>

      {/* Scientific Functions Row 2 */}
      <div className="sci-sci-row">
        <CalcButton label="asin" onClick={() => applyScientific('asin')} variant="sci" small />
        <CalcButton label="acos" onClick={() => applyScientific('acos')} variant="sci" small />
        <CalcButton label="atan" onClick={() => applyScientific('atan')} variant="sci" small />
        <CalcButton label="x²" onClick={() => applyScientific('square')} variant="sci" small />
        <CalcButton label="x³" onClick={() => applyScientific('cube')} variant="sci" small />
        <CalcButton label="e" onClick={() => applyScientific('e')} variant="sci" small />
      </div>

      {/* Scientific Functions Row 3 */}
      <div className="sci-sci-row">
        <CalcButton label="xʸ" onClick={() => inputOperator('^')} variant="sci" small />
        <CalcButton label="10ˣ" onClick={() => applyScientific('10x')} variant="sci" small />
        <CalcButton label="eˣ" onClick={() => applyScientific('ex')} variant="sci" small />
        <CalcButton label="n!" onClick={() => applyScientific('factorial')} variant="sci" small />
        <CalcButton label="√" onClick={() => applyScientific('sqrt')} variant="sci" small />
        <CalcButton label="∛" onClick={() => applyScientific('cbrt')} variant="sci" small />
      </div>

      {/* Memory Row */}
      <div className="sci-memory-row">
        <CalcButton label="MC" onClick={() => handleMemory('MC')} variant="memory" small />
        <CalcButton label="MR" onClick={() => handleMemory('MR')} variant="memory" small />
        <CalcButton label="M+" onClick={() => handleMemory('M+')} variant="memory" small />
        <CalcButton label="M-" onClick={() => handleMemory('M-')} variant="memory" small />
        <CalcButton label="MS" onClick={() => handleMemory('MS')} variant="memory" small />
        <CalcButton label="AC" onClick={clearAll} variant="function" small />
      </div>

      {/* Main Button Grid */}
      <div className="sci-button-grid">
        <CalcButton label="(" onClick={() => inputParentheses('(')} variant="function" />
        <CalcButton label=")" onClick={() => inputParentheses(')')} variant="function" />
        <CalcButton label="%" onClick={inputPercent} variant="function" />
        <CalcButton label="÷" onClick={() => inputOperator('÷')} variant="operator" />

        <CalcButton label="7" onClick={() => inputNumber(7)} variant="number" />
        <CalcButton label="8" onClick={() => inputNumber(8)} variant="number" />
        <CalcButton label="9" onClick={() => inputNumber(9)} variant="number" />
        <CalcButton label="×" onClick={() => inputOperator('×')} variant="operator" />

        <CalcButton label="4" onClick={() => inputNumber(4)} variant="number" />
        <CalcButton label="5" onClick={() => inputNumber(5)} variant="number" />
        <CalcButton label="6" onClick={() => inputNumber(6)} variant="number" />
        <CalcButton label="−" onClick={() => inputOperator('-')} variant="operator" />

        <CalcButton label="1" onClick={() => inputNumber(1)} variant="number" />
        <CalcButton label="2" onClick={() => inputNumber(2)} variant="number" />
        <CalcButton label="3" onClick={() => inputNumber(3)} variant="number" />
        <CalcButton label="+" onClick={() => inputOperator('+')} variant="operator" />

        <CalcButton label="+/-" onClick={toggleSign} variant="function" />
        <CalcButton label="0" onClick={() => inputNumber(0)} variant="number" />
        <CalcButton label="." onClick={inputDecimal} variant="function" />
        <CalcButton label="=" onClick={inputEquals} variant="equals" />
      </div>

      {/* Menu Panel */}
      {showMenu && (
        <div className="sci-menu-panel animate-slide-up">
          <div className="sci-menu-header">
            <h3>Menu</h3>
            <button onClick={() => setShowMenu(false)}>✕</button>
          </div>
          <div className="sci-menu-list">
            <button onClick={() => { navigate('/skyroom'); setShowMenu(false) }}>
              <span>🌌</span> Sky Room
            </button>
            <button onClick={() => { navigate('/gudang'); setShowMenu(false) }}>
              <span>📦</span> Gudang
            </button>
            <button onClick={() => { navigate('/ruang-kerja'); setShowMenu(false) }}>
              <span>📝</span> Ruang Kerja
            </button>
            <button onClick={() => { navigate('/'); setShowMenu(false) }}>
              <span>🧮</span> Basic
            </button>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="sci-history-panel animate-slide-up">
          <div className="sci-history-header">
            <h3>Riwayat</h3>
            <button onClick={() => { historyManager.clear(); setHistory([]) }}>Hapus</button>
          </div>
          <div className="sci-history-list">
            {history.length === 0 ? (
              <p className="sci-history-empty">Belum ada riwayat</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="sci-history-item">
                  <span className="sci-history-expr">{item.expression}</span>
                  <span className="sci-history-result">= {formatNumber(item.result)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .scientific-page {
          width: 100%;
          height: 100%;
          background: #0D0D0D;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        .sci-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          height: 48px;
          flex-shrink: 0;
        }

        .sci-header-btn {
          background: none;
          border: none;
          color: #8E8E93;
          font-size: 18px;
          cursor: pointer;
          padding: 6px;
        }

        .sci-mode-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 12px;
          border-radius: 16px;
        }

        .sci-mode-active {
          color: #FF6B00;
          font-size: 13px;
          font-weight: 600;
        }

        .sci-mode-inactive {
          color: #8E8E93;
          font-size: 13px;
          cursor: pointer;
        }

        .sci-rad-toggle {
          color: #8E8E93;
          font-size: 12px;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 10px;
          border-radius: 12px;
          cursor: pointer;
        }

        .sci-display {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: flex-end;
          padding: 8px 20px;
          min-height: 80px;
        }

        .sci-expression {
          font-size: 16px;
          color: #A1A1A6;
          min-height: 22px;
        }

        .sci-main {
          font-size: 48px;
          font-weight: 300;
          color: #FFFFFF;
          line-height: 1;
        }

        .sci-sci-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
          padding: 2px 12px;
        }

        .sci-memory-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
          padding: 2px 12px;
        }

        .sci-button-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 8px 12px;
          padding-bottom: 16px;
          flex: 1;
        }

        .sci-btn {
          aspect-ratio: 1;
          border-radius: 50%;
          border: none;
          font-size: 24px;
          font-weight: 400;
          cursor: pointer;
          transition: all 150ms ease;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
        }

        .sci-btn.small {
          font-size: 14px;
          aspect-ratio: auto;
          height: 36px;
          border-radius: 18px;
        }

        .sci-btn.pressed,
        .sci-btn:active {
          transform: scale(0.92);
        }

        .sci-btn-number {
          background: #1C1C1E;
          color: #FFFFFF;
        }

        .sci-btn-number:active {
          background: #2C2C2E;
        }

        .sci-btn-operator {
          background: #FF6B00;
          color: #FFFFFF;
          font-size: 28px;
        }

        .sci-btn-operator:active {
          background: #E55A00;
        }

        .sci-btn-function {
          background: #2C2C2E;
          color: #FFFFFF;
          font-size: 18px;
        }

        .sci-btn-function:active {
          background: #3C3C3E;
        }

        .sci-btn-equals {
          background: linear-gradient(180deg, #FF6B00 0%, #FF8C00 100%);
          color: #FFFFFF;
          font-size: 28px;
        }

        .sci-btn-equals:active {
          background: linear-gradient(180deg, #E55A00 0%, #E57A00 100%);
        }

        .sci-btn-memory {
          background: transparent;
          color: #8E8E93;
          font-size: 13px;
        }

        .sci-btn-memory:active {
          color: #FFFFFF;
        }

        .sci-btn-sci {
          background: rgba(255, 107, 0, 0.15);
          color: #FF6B00;
          font-size: 13px;
          font-weight: 500;
        }

        .sci-btn-sci:active {
          background: rgba(255, 107, 0, 0.3);
        }

        /* Menu Panel */
        .sci-menu-panel {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: #1C1C1E;
          border-radius: 24px 24px 0 0;
          max-height: 60%;
          z-index: 100;
          animation: slideUp 300ms ease;
        }

        .sci-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .sci-menu-header h3 {
          color: #FFFFFF;
          font-size: 16px;
          margin: 0;
        }

        .sci-menu-header button {
          background: none;
          border: none;
          color: #8E8E93;
          font-size: 18px;
          cursor: pointer;
        }

        .sci-menu-list {
          padding: 8px 16px;
        }

        .sci-menu-list button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: none;
          border: none;
          color: #FFFFFF;
          font-size: 16px;
          cursor: pointer;
          border-radius: 12px;
        }

        .sci-menu-list button:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .sci-menu-list button span {
          font-size: 20px;
        }

        .sci-history-panel {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: #1C1C1E;
          border-radius: 24px 24px 0 0;
          max-height: 40%;
          z-index: 100;
          animation: slideUp 300ms ease;
        }

        .sci-history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .sci-history-header h3 {
          color: #FFFFFF;
          font-size: 16px;
          margin: 0;
        }

        .sci-history-header button {
          background: none;
          border: none;
          color: #FF6B00;
          font-size: 13px;
          cursor: pointer;
        }

        .sci-history-list {
          padding: 12px 20px;
          overflow-y: auto;
          max-height: 250px;
        }

        .sci-history-empty {
          color: #8E8E93;
          text-align: center;
          padding: 20px;
          font-size: 14px;
        }

        .sci-history-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .sci-history-expr {
          color: #8E8E93;
          font-size: 13px;
        }

        .sci-history-result {
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 500;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @media (max-width: 380px) {
          .sci-main { font-size: 36px; }
          .sci-btn { font-size: 20px; }
          .sci-btn.small { font-size: 12px; height: 32px; }
        }

        @media (min-width: 768px) {
          .scientific-page {
            max-width: 430px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  )
}

export default CalculatorScientific