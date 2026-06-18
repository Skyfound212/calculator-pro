import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSecretCode } from '../hooks/useSecretCode'
import { 
  evaluateExpression, 
  formatNumber, 
  scientificFunctions,
  memoryOperations, 
  historyManager 
} from '../utils/calculator'

function CalculatorScientific() {
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [previousValue, setPreviousValue] = useState(null)
  const [operator, setOperator] = useState(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)
  const [memory, setMemory] = useState(memoryOperations.get())
  const [isRadians, setIsRadians] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState(historyManager.get())
  
  const { addToBuffer } = useSecretCode()
  const navigate = useNavigate()

  const updateDisplay = useCallback((value) => {
    setDisplay(value)
  }, [])

  // Input number
  const inputNumber = useCallback((num) => {
    if (waitingForOperand) {
      updateDisplay(num.toString())
      setWaitingForOperand(false)
    } else {
      updateDisplay(display === '0' ? num.toString() : display + num)
    }
    addToBuffer(num.toString())
  }, [display, waitingForOperand, updateDisplay, addToBuffer])

  // Input decimal
  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      updateDisplay('0.')
      setWaitingForOperand(false)
      addToBuffer('.')
      return
    }
    if (!display.includes('.')) {
      updateDisplay(display + '.')
      addToBuffer('.')
    }
  }, [display, waitingForOperand, updateDisplay, addToBuffer])

  // Scientific functions
  const applyScientific = useCallback((func) => {
    const value = parseFloat(display.replace(/\./g, '').replace(',', '.'))
    let result = null
    let expr = ''

    switch (func) {
      case 'sin':
        result = isRadians ? scientificFunctions.sin(value) : scientificFunctions.sin(scientificFunctions.rad(value))
        expr = `sin(${value})`
        break