import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ApiKeyDialog from './components/ApiKeyDialog';

// Componentes
import Layout from './components/Layout';
import Home from './pages/Home';
import PromptChat from './pages/PromptChat';
import CreateAssistant from './pages/CreateAssistant';
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

// Context para gerenciar a lista de conversas
export const ChatHistoryContext = React.createContext({
  chatHistory: [],
  setChatHistory: () => {},
  refreshChatHistory: () => {},
  addToHistory: () => {}
});

function App() {
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [isApiKeySet, setIsApiKeySet] = useState(hasApiKey());
  const [chatHistory, setChatHistory] = useState([]);
  
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
  
  // Função para atualizar o histórico de chats a partir do localStorage
  const refreshChatHistory = () => {
    try {
      const history = [];
      
      // Carregar presets para verificar quais são conversas de workers
      const presets = [];
      try {
        const savedPresets = localStorage.getItem('chat_presets');
        if (savedPresets) {
          presets.push(...JSON.parse(savedPresets));
        }
      } catch (e) {
        console.error('Error loading presets:', e);
      }
      
      // Buscar todas as conversas no localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key && key.startsWith('conversation_') && key !== 'conversation_default') {
          const chatId = key.replace('conversation_', '');
          
          try {
            const conversationData = JSON.parse(localStorage.getItem(key));
            
            // Pular se não houver dados ou mensagens vazias
            if (!conversationData || conversationData.length < 2) continue;
            
            // Verificar se é baseado em um worker
            const isWorkerChat = chatId.includes('_chat_');
            const workerId = isWorkerChat ? chatId.split('_chat_')[0] : null;
            const preset = workerId ? presets.find(p => p.id === workerId) : null;
            
            // Encontrar a primeira mensagem do usuário para usar como título
            const firstUserMessage = conversationData.find(m => m.role === 'user');
            const title = firstUserMessage 
              ? firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '')
              : preset ? preset.name : 'Conversa sem título';
            
            // Encontrar a última mensagem para data de última atividade
            const lastMessage = conversationData[conversationData.length - 1];
            const lastActivity = lastMessage?.timestamp 
              ? new Date(lastMessage.timestamp) 
              : new Date();
            
            // Determinar o modelo usado
            let modelInfo = preset?.model || 'GPT-4o';
            
            // Adicionar ao histórico
            history.push({
              id: chatId,
              title,
              lastActivity,
              messageCount: conversationData.filter(m => m.role !== 'system').length,
              modelInfo,
              isPreset: !!preset,
              workerId: workerId
            });
          } catch (e) {
            console.error(`Erro processando conversa ${chatId}:`, e);
          }
        }
      }
      
      // Ordenar por data da última atividade (mais recente primeiro)
      history.sort((a, b) => b.lastActivity - a.lastActivity);
      setChatHistory(history);
    } catch (e) {
      console.error('Error loading chat history:', e);
    }
  };
  
  // Função para adicionar uma nova conversa ao histórico
  const addToHistory = (newChat) => {
    setChatHistory(prevHistory => {
      // Verificar se já existe uma conversa com este ID
      const index = prevHistory.findIndex(chat => chat.id === newChat.id);
      
      if (index >= 0) {
        // Atualizar conversa existente
        const updatedHistory = [...prevHistory];
        updatedHistory[index] = {
          ...updatedHistory[index],
          ...newChat,
          lastActivity: new Date() // Atualizar timestamp
        };
        return updatedHistory;
      } else {
        // Adicionar nova conversa
        return [
          {
            ...newChat,
            lastActivity: new Date()
          },
          ...prevHistory
        ];
      }
    });
  };
  
  // Carregar histórico ao montar o componente
  React.useEffect(() => {
    refreshChatHistory();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ApiKeyContext.Provider value={{
        isApiKeySet,
        apiKeyDialogOpen,
        openApiKeyDialog,
        closeApiKeyDialog
      }}>
        <ChatHistoryContext.Provider value={{
          chatHistory,
          setChatHistory,
          refreshChatHistory,
          addToHistory
        }}>
          <Layout>
            <ApiKeyDialog 
              open={apiKeyDialogOpen} 
              onClose={closeApiKeyDialog} 
            />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/prompt-chat/:id" element={<PromptChat />} />
              <Route path="/create-assistant" element={<CreateAssistant />} />
            </Routes>
          </Layout>
        </ChatHistoryContext.Provider>
      </ApiKeyContext.Provider>
    </ThemeProvider>
  );
}

export default App;