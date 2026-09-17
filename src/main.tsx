import { initialiseNative } from './native/platform';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './appUpdate';
import App from './App';
import './styles.css';
import { startDiagnostics } from './diagnostics';

void initialiseNative()
  .then(() => {
    if (import.meta.env.VITE_NATIVE_ACCEPTANCE === 'true') void import('./native/acceptance');
    startDiagnostics();

    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  })
  .catch((error) => {
    document.getElementById('root')!.textContent =
      `Could not open Fieldbook: ${String(error)}. Please reopen the app.`;
  });
