import React, { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import SplashScreen from './pages/SplashScreen'
import Calculator from './pages/Calculator'
import CalculatorScientific from './pages/CalculatorScientific'
import SkyRoom from './pages/SkyRoom'
import Gudang from './pages/Gudang'
import RuangKerja from './pages/RuangKerja'
import InstallGuide from './pages/InstallGuide'

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const location = useLocation()

  // Splash screen logic: show on first load only
  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('calculatorpro_splash_seen')
    if (hasSeenSplash) {
      setShowSplash(false)
    } else {
      const timer = setTimeout(() => {
        setShowSplash(false)
        sessionStorage.setItem('calculatorpro_splash_seen', 'true')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Show splash on initial load
  if (showSplash && location.pathname === '/') {
    return <SplashScreen />
  }

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <Routes>
        <Route path="/" element={<Calculator />} />
        <Route path="/scientific" element={<CalculatorScientific />} />
        <Route path="/skyroom" element={<SkyRoom />} />
        <Route path="/gudang" element={<Gudang />} />
        <Route path="/ruang-kerja" element={<RuangKerja />} />
        <Route path="/install" element={<InstallGuide />} />
      </Routes>
    </div>
  )
}

export default App
