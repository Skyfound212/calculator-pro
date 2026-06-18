import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function SkyRoom() {
  const [showTransition, setShowTransition] = useState(true)
  const [glitchPhase, setGlitchPhase] = useState(0)
  const navigate = useNavigate()

  // Glitch transition effect
  useEffect(() => {
    const phases = [
      { delay: 0, phase: 1 },      // Start glitch
      { delay: 200, phase: 2 },     // Intense glitch
      { delay: 400, phase: 3 },     // Freeze/crash
      { delay: 600, phase: 4 },     // Blackout
      { delay: 800, phase: 5 },     // Fade in SkyRoom
    ]

    phases.forEach(({ delay, phase }) => {
      setTimeout(() => setGlitchPhase(phase), delay)
    })

    const timer = setTimeout(() => {
      setShowTransition(false)
    }, 1200)

    return () => clearTimeout(timer)
  }, [])

  const goToGudang = () => navigate('/gudang')
  const goToRuangKerja = () => navigate('/ruang-kerja')
  const goBack = () => navigate('/')

  // Transition overlay
  if (showTransition) {
    return (
      <div className={`transition-overlay phase-${glitchPhase}`}>
        <div className="glitch-lines" />
        <div className="glitch-color-shift" />
        <div className="glitch-static" />
        <div className="crash-screen">
          <div className="crash-icon">⚠️</div>
          <div className="crash-text">System Error</div>
          <div className="crash-code">0xC0000005</div>
        </div>
        <style>{`
          .transition-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #0D0D0D;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .glitch-lines {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255, 107, 0, 0.03) 2px,
              rgba(255, 107, 0, 0.03) 4px
            );
            opacity: 0;
            transition: opacity 0.1s;
          }

          .glitch-color-shift {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 107, 0, 0.1);
            mix-blend-mode: color;
            opacity: 0;
            transition: opacity 0.1s;
          }

          .glitch-static {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E");
            opacity: 0;
            transition: opacity 0.1s;
          }

          .crash-screen {
            text-align: center;
            opacity: 0;
            transform: scale(0.8);
            transition: all 0.2s ease;
          }

          .crash-icon {
            font-size: 48px;
            margin-bottom: 12px;
          }

          .crash-text {
            font-size: 20px;
            color: #FFFFFF;
            font-weight: 600;
            margin-bottom: 8px;
          }

          .crash-code {
            font-size: 14px;
            color: #8E8E93;
            font-family: monospace;
          }

          /* Phase animations */
          .phase-1 .glitch-lines { opacity: 1; animation: glitchLines 0.1s infinite; }
          .phase-2 .glitch-color-shift { opacity: 1; animation: glitchShift 0.05s infinite; }
          .phase-2 .glitch-static { opacity: 0.3; }
          .phase-3 .glitch-lines { opacity: 0.5; }
          .phase-3 .glitch-color-shift { opacity: 0.2; }
          .phase-3 .crash-screen { opacity: 1; transform: scale(1); }
          .phase-4 { background: #000000; }
          .phase-4 .glitch-lines, .phase-4 .glitch-color-shift, .phase-4 .glitch-static { opacity: 0; }
          .phase-4 .crash-screen { opacity: 0; }
          .phase-5 { opacity: 0; }

          @keyframes glitchLines {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }

          @keyframes glitchShift {
            0% { transform: translateX(-2px); }
            50% { transform: translateX(2px); }
            100% { transform: translateX(0); }
          }
        `}</style>
      </div>
    )
  }

  // Main SkyRoom content
  return (
    <div className="skyroom-page animate-fade-in">
      {/* Header */}
      <div className="skyroom-header">
        <div className="skyroom-title">
          <span className="skyroom-lock">🔒</span>
          <span>Sky_Room</span>
        </div>
        <button className="skyroom-settings" onClick={() => {}}>⋮</button>
      </div>

      {/* Main Content */}
      <div className="skyroom-content">
        {/* Welcome Text */}
        <div className="skyroom-welcome">
          <h2>Selamat Datang</h2>
          <p>Pilih jalur yang Anda inginkan</p>
        </div>

        {/* Two Path Cards */}
        <div className="skyroom-cards">
          {/* Card 1: Gudang */}
          <button className="skyroom-card" onClick={goToGudang}>
            <div className="card-icon">📦</div>
            <div className="card-title">Ke Gudang</div>
            <div className="card-desc">Penyimpanan File & Folder</div>
            <div className="card-arrow">→</div>
          </button>

          {/* Card 2: Ruang Kerja */}
          <button className="skyroom-card" onClick={goToRuangKerja}>
            <div className="card-icon">📝</div>
            <div className="card-title">Ke Ruang Kerja</div>
            <div className="card-desc">Generate Teks & Export File</div>
            <div className="card-arrow">→</div>
          </button>
        </div>
      </div>

      {/* Bottom: Back to Calculator */}
      <div className="skyroom-footer">
        <button className="skyroom-back" onClick={goBack}>
          <span>⬅</span>
          <span>Kembali ke CalculatorPro</span>
        </button>
      </div>

      <style>{`
        .skyroom-page {
          width: 100%;
          height: 100%;
          background: linear-gradient(180deg, #0A0E1A 0%, #0F1420 100%);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: fadeIn 400ms ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Header */
        .skyroom-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          height: 56px;
          flex-shrink: 0;
        }

        .skyroom-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .skyroom-lock {
          font-size: 16px;
        }

        .skyroom-settings {
          background: none;
          border: none;
          color: #8B92A8;
          font-size: 20px;
          cursor: pointer;
          padding: 8px;
        }

        /* Content */
        .skyroom-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          gap: 32px;
        }

        .skyroom-welcome {
          text-align: center;
        }

        .skyroom-welcome h2 {
          font-size: 24px;
          font-weight: 600;
          color: #FFFFFF;
          margin: 0 0 8px 0;
        }

        .skyroom-welcome p {
          font-size: 14px;
          color: #8B92A8;
          margin: 0;
        }

        /* Cards */
        .skyroom-cards {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          max-width: 360px;
        }

        .skyroom-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 32px 24px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          cursor: pointer;
          transition: all 250ms ease;
          position: relative;
          overflow: hidden;
        }

        .skyroom-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255, 107, 0, 0.05) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 250ms ease;
        }

        .skyroom-card:hover::before,
        .skyroom-card:active::before {
          opacity: 1;
        }

        .skyroom-card:hover,
        .skyroom-card:active {
          border-color: rgba(255, 107, 0, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(255, 107, 0, 0.1);
        }

        .card-icon {
          font-size: 48px;
          position: relative;
          z-index: 1;
        }

        .card-title {
          font-size: 20px;
          font-weight: 600;
          color: #FFFFFF;
          position: relative;
          z-index: 1;
        }

        .card-desc {
          font-size: 13px;
          color: #8B92A8;
          position: relative;
          z-index: 1;
        }

        .card-arrow {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          color: rgba(255, 107, 0, 0.5);
          transition: all 250ms ease;
        }

        .skyroom-card:hover .card-arrow,
        .skyroom-card:active .card-arrow {
          color: #FF6B00;
          transform: translateY(-50%) translateX(4px);
        }

        /* Footer */
        .skyroom-footer {
          padding: 16px 20px;
          flex-shrink: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .skyroom-back {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          color: #8B92A8;
          font-size: 14px;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .skyroom-back:hover,
        .skyroom-back:active {
          background: rgba(255, 255, 255, 0.06);
          color: #FFFFFF;
        }

        @media (min-width: 768px) {
          .skyroom-page {
            max-width: 430px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  )
}

export default SkyRoom