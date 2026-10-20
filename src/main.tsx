import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initTheme } from './store/uiStore';
import './index.css';

// Apply the saved theme before React paints, so there is no light-mode flash.
initTheme();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root was not found in index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
