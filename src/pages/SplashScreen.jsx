import React from 'react'
import { APP } from '../utils/constants'

function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        {/* Logo Container */}
        <div className="splash-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Calculator body */}
              <rect x="10" y="10" width="100" height="100" rx="24" fill="#1C1C1E"/>
              {/* Screen area */}
              <rect x="20" y="20" width="80" height="30" rx="8" fill="#0D0D0D"/>
              {/* Orange accent bar */}
              <rect x="20" y="58" width="80" height="4" rx="2" fill="#FF6B00"/>
              {/* Button grid representation */}
              <circle cx="35" cy="78" r="8" fill="#2C2C2E"/>
              <circle cx="60" cy="78" r="8" fill="#2C2C2E"/>
              <circle cx="85" cy="78" r="8" fill="#2C2C2E"/>
              <circle cx="35" cy="98" r="8" fill="#2C2C2E"/>
              <circle cx="60" cy="98" r="8" fill="#FF6B00"/>
              <circle cx="85" cy="98" r="8" fill="#2C2C2E"/>
            </svg>
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="splash-title">
          <span className="title-calc">Calculator</span>
          <span className="title-pro">Pro</span>
        </h1>

        {/* Tagline */}
        <p className="splash-tagline">Calculate Smarter</p>

        {/* Progress Bar */}
        <div className="splash-progress">
          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ animationDuration: `${APP.SPLASH_DURATION}ms` }}
            />
          </div>
        </div>

        {/* Version */}
        <p className="splash-version">v{APP.VERSION}</p>
      </div>

      <style>{`
        .splash-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #0D0D0D;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 300ms ease;
        }

        .splash-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          animation: fadeInUp 600ms ease 200ms both;
        }

        .splash-logo {
          width: 120px;
          height: 120px;
          animation: pulse 2s ease-in-out infinite;
        }

        .logo-icon {
          width: 100%;
          height: 100%;
        }

        .logo-icon svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 4px 16px rgba(255, 107, 0, 0.2));
        }

        .splash-title {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.5px;
          margin: 0;
          display: flex;
          gap: 2px;
        }

        .title-calc {
          color: #FFFFFF;
        }

        .title-pro {
          color: #FF6B00;
        }

        .splash-tagline {
          font-size: 14px;
          color: #8E8E93;
          margin: 0;
          letter-spacing: 0.5px;
          animation: fadeIn 400ms ease 600ms both;
        }

        .splash-progress {
          width: 160px;
          margin-top: 24px;
        }

        .progress-track {
          width: 100%;
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF6B00, #FF8C00);
          border-radius: 2px;
          animation: progressFill linear forwards;
        }

        @keyframes progressFill {
          from { width: 0%; }
          to { width: 100%; }
        }

        .splash-version {
          font-size: 11px;
          color: rgba(142, 142, 147, 0.6);
          margin: 0;
          margin-top: 8px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeInUp {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}

export default SplashScreen