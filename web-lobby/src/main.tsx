import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'odometer/themes/odometer-theme-default.css';
import './tvkit/fonts.css';
import './styles/global.css';
import App from './App';
import { LanguageProvider } from './i18n';
import { BetslipProvider } from './state/betslip';
import { AuthProvider } from './state/auth';
import { WalletProvider } from './state/wallet';
import { MyBetsProvider } from './state/myBets';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <WalletProvider>
          <MyBetsProvider>
            <BetslipProvider>
              <App />
            </BetslipProvider>
          </MyBetsProvider>
        </WalletProvider>
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>
);
