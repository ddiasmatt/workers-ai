import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ApiKeyDialog from './components/ApiKeyDialog';

// Componentes
import Layout from './components/Layout';
import Home from './pages/Home';
import PromptChat from './pages/PromptChat';
import { hasApiKey, setApiKey } from './services/prompt';

// Tema personalizado
const theme = createTheme({
  palette: {
    mode: 'light', // Alterado para light mode para melhor visibilidade
    primary: {
      main: '#10a37f',
    },
    secondary: {
      main: '#8e44ad',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

// Context simplificado para API key
export const ApiKeyContext = React.createContext({
  isApiKeySet: false,
  apiKeyDialogOpen: false,
  openApiKeyDialog: () => {},
  closeApiKeyDialog: () => {}
});

function App() {
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [isApiKeySet, setIsApiKeySet] = useState(hasApiKey());
  
  // Abrir diálogo de configuração da API key
  const openApiKeyDialog = () => {
    setApiKeyDialogOpen(true);
  };
  
  // Fechar diálogo de configuração da API key
  const closeApiKeyDialog = (key) => {
    setApiKeyDialogOpen(false);
    if (key) {
      setApiKey(key);
      setIsApiKeySet(true);
    }
  };
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ApiKeyContext.Provider value={{
        isApiKeySet,
        apiKeyDialogOpen,
        openApiKeyDialog,
        closeApiKeyDialog
      }}>
        <Layout>
          <ApiKeyDialog 
            open={apiKeyDialogOpen} 
            onClose={closeApiKeyDialog} 
          />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/prompt-chat/:id?" element={<PromptChat />} />
          </Routes>
        </Layout>
      </ApiKeyContext.Provider>
    </ThemeProvider>
  );
}

export default App;