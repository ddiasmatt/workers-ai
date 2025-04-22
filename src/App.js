import React, { useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AssistantsProvider, AssistantsContext } from './contexts/AssistantsContext';
import ApiKeyDialog from './components/ApiKeyDialog';

// Componentes
import Layout from './components/Layout';
import Home from './pages/Home';
import CreateAssistant from './pages/CreateAssistant';
import ChatInterface from './pages/ChatInterface';
import EditAssistant from './pages/EditAssistant';
import PromptChat from './pages/PromptChat';

// Tema personalizado
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#10a37f',
    },
    secondary: {
      main: '#8e44ad',
    },
    background: {
      default: '#202123',
      paper: '#343541',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

// Componente que gerencia o diálogo de API key
const ApiKeyManager = () => {
  const { apiKeyDialogOpen, closeApiKeyDialog } = useContext(AssistantsContext);
  
  return (
    <ApiKeyDialog 
      open={apiKeyDialogOpen} 
      onClose={closeApiKeyDialog} 
    />
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AssistantsProvider>
        <Layout>
          <ApiKeyManager />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateAssistant />} />
            <Route path="/edit/:id" element={<EditAssistant />} />
            <Route path="/chat/:id" element={<ChatInterface />} />
            <Route path="/prompt-chat/:id?" element={<PromptChat />} />
          </Routes>
        </Layout>
      </AssistantsProvider>
    </ThemeProvider>
  );
}

export default App;