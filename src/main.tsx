import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/GalaxyApp';
import './app/base.css';
import './app/live.css';
import './app/galaxy.css';
import './app/reactive.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Private browsing or policy can disable caching. The online app still works.
    });
  });
}
