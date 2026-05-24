import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <DataProvider>
          <App />
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: '#24201C',
                color: '#EDE8DF',
                border: '1px solid #3A342D',
                borderRadius: '99px',
                fontSize: '13px',
                fontWeight: 500,
                padding: '10px 18px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
              },
              success: { iconTheme: { primary: '#22C55E', secondary: '#0B0A08' } },
              error:   { iconTheme: { primary: '#EF4444', secondary: '#0B0A08' } },
            }}
          />
        </DataProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>
);
