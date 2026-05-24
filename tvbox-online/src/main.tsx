import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'odometer/themes/odometer-theme-default.css';
import './styles/global.css';
import './tvkit/fonts.css';
import App from './App';
import { LanguageProvider } from './i18n';

// tvbox-online: standalone page that renders only the LiveMonitor.
// No auth, no wallet, no betslip, no my-bets — that's all in the lobby.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
);
