import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (err) {
    console.error('Fatal initialization error:', err);
    rootElement.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0a0d11;color:#fff;padding:24px;text-align:center;font-family:sans-serif;">
        <h2 style="font-size:20px;font-weight:bold;margin-bottom:12px;">SoundPulse Yüklenirken Bir Sorun Oluştu</h2>
        <p style="color:#a3a3a3;font-size:14px;max-width:400px;margin-bottom:24px;">Tarayıcı önbelleğiniz veya verileriniz güncellenirken bir aksaklık yaşandı.</p>
        <button onclick="localStorage.clear();window.location.reload();" style="background:#1ed760;color:#000;padding:12px 24px;border:none;border-radius:12px;font-weight:bold;cursor:pointer;">
          Verileri Temizle ve Yeniden Başlat
        </button>
      </div>
    `;
  }
}
