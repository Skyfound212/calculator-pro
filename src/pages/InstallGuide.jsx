import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function InstallGuide() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('android')

  const steps = {
    android: [
      { icon: '🌐', title: 'Buka di Chrome', desc: 'Buka link app di browser Chrome (bukan browser lain)' },
      { icon: '⋮', title: 'Tap menu titik tiga', desc: 'Tap ikon ⋮ di pojok kanan atas Chrome' },
      { icon: '📲', title: 'Pilih "Tambahkan ke layar utama"', desc: 'Tap opsi "Add to Home screen" atau "Tambahkan ke layar utama"' },
      { icon: '✅', title: 'Konfirmasi', desc: 'Tap "Tambah" — app langsung muncul di home screen tanpa header browser' },
    ],
    ios: [
      { icon: '🌐', title: 'Buka di Safari', desc: 'Buka link app di browser Safari (wajib Safari, bukan Chrome)' },
      { icon: '⬆️', title: 'Tap tombol Share', desc: 'Tap ikon Share (kotak dengan panah ke atas) di bagian bawah' },
      { icon: '📲', title: 'Pilih "Add to Home Screen"', desc: 'Scroll ke bawah dan tap "Add to Home Screen"' },
      { icon: '✅', title: 'Konfirmasi', desc: 'Tap "Add" di pojok kanan atas — app langsung tersimpan di home screen' },
    ],
    apk: [
      { icon: '⚙️', title: 'Aktifkan Unknown Sources', desc: 'Buka Pengaturan → Keamanan → aktifkan "Install unknown apps" untuk browser Anda' },
      { icon: '⬇️', title: 'Download APK', desc: 'Download file APK yang dibagikan ke perangkat Anda' },
      { icon: '📂', title: 'Buka file APK', desc: 'Buka File Manager → cari APK yang didownload → tap untuk install' },
      { icon: '✅', title: 'Install & buka', desc: 'Tap "Install" → tunggu selesai → tap "Buka"' },
    ],
  }

  const appUrl = window.location.origin

  const copyLink = () => {
    navigator.clipboard.writeText(appUrl).catch(() => {})
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#0A0A0F',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', color: '#E2E8F0',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', minHeight: '56px',
        background: '#12121A',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none', color: '#94A3B8',
          fontSize: '20px', cursor: 'pointer', padding: '8px',
          borderRadius: '10px', display: 'flex', alignItems: 'center',
        }}>⬅</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#FFF', letterSpacing: '-0.3px' }}>📲 Cara Install</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '1px' }}>CalculatorPro</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* App link card */}
        <div style={{
          background: 'rgba(255,107,0,0.08)',
          border: '1px solid rgba(255,107,0,0.2)',
          borderRadius: '16px', padding: '16px',
          display: 'flex', alignItems: 'center', gap: '12px',
          marginBottom: '20px',
        }}>
          <img src="/icons/icon-96.png" alt="icon" style={{ width: 48, height: 48, borderRadius: 12 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#FFF' }}>CalculatorPro</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appUrl}</div>
          </div>
          <button onClick={copyLink} style={{
            background: '#FF6B00', border: 'none', borderRadius: '10px',
            color: '#FFF', fontSize: '12px', fontWeight: 600,
            padding: '8px 14px', cursor: 'pointer', flexShrink: 0,
          }}>Salin</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '6px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '14px', padding: '4px',
          marginBottom: '20px',
        }}>
          {[
            { key: 'android', label: '🤖 Android' },
            { key: 'ios', label: '🍎 iPhone' },
            { key: 'apk', label: '📦 APK' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '9px 4px',
              background: tab === t.key ? '#FF6B00' : 'none',
              border: 'none', borderRadius: '10px',
              color: tab === t.key ? '#FFF' : '#64748B',
              fontSize: '13px', fontWeight: tab === t.key ? 600 : 400,
              cursor: 'pointer', transition: 'all 150ms',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {steps[tab].map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '14px',
              background: '#16162A',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px', padding: '16px',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,107,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', flexShrink: 0,
              }}>{step.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#FF6B00', color: '#FFF',
                    fontSize: '11px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFF' }}>{step.title}</span>
                </div>
                <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.5', margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Note for APK */}
        {tab === 'apk' && (
          <div style={{
            marginTop: '12px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '12px', padding: '14px',
          }}>
            <div style={{ fontSize: '13px', color: '#FCA5A5', lineHeight: '1.5' }}>
              ⚠️ APK hanya untuk Android. Setelah install, nonaktifkan kembali "Unknown sources" untuk keamanan perangkat.
            </div>
          </div>
        )}

        {/* Share button */}
        <button onClick={() => {
          if (navigator.share) {
            navigator.share({ title: 'CalculatorPro', text: 'Coba CalculatorPro — kalkulator profesional!', url: appUrl })
          } else copyLink()
        }} style={{
          width: '100%', marginTop: '20px', padding: '14px',
          background: 'linear-gradient(180deg,#FF6B00,#FF8C00)',
          border: 'none', borderRadius: '14px',
          color: '#FFF', fontSize: '15px', fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          🔗 Bagikan App
        </button>

        <div style={{ height: 24 }} />
      </div>
    </div>
  )
}
