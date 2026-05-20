import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Theme bootstrap — runs before React mounts so the page never paints in
// the wrong palette. Two ways to opt in:
//   1. URL param  ?theme=nude  (also persists to localStorage)
//   2. localStorage.setItem('theme', 'nude')   (devtools)
// To revert: localStorage.removeItem('theme') and reload, OR ?theme=default
(() => {
  const url = new URL(window.location.href);
  const urlTheme = url.searchParams.get('theme');
  if (urlTheme === 'nude' || urlTheme === 'default') {
    if (urlTheme === 'default') localStorage.removeItem('theme');
    else localStorage.setItem('theme', urlTheme);
    // strip the query so the URL stays clean after the first load
    url.searchParams.delete('theme');
    window.history.replaceState({}, '', url.toString());
  }
  const theme = localStorage.getItem('theme');
  if (theme === 'nude') document.documentElement.dataset.theme = 'nude';
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
