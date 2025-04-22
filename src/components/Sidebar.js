import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Button,
  ListItemButton,
  Typography,
  Chip,
  Avatar,
  Badge,
  Collapse
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HomeIcon from '@mui/icons-material/Home';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ChatIcon from '@mui/icons-material/Chat';
import MessageIcon from '@mui/icons-material/Message';
import HistoryIcon from '@mui/icons-material/History';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import { AssistantsContext } from '../contexts/AssistantsContext';

const drawerWidth = 260;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { assistants, isApiKeySet } = useContext(AssistantsContext);
  const [chatHistory, setChatHistory] = useState([]);
  const [presets, setPresets] = useState([]);
  const [presetsOpen, setPresetsOpen] = useState(true);
  
  // Carregar histórico de chats
  useEffect(() => {
    const loadChatHistory = () => {
      const history = [];
      
      // Encontrar todos os itens localStorage que contêm 'thread_'
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('thread_')) {
          const assistantId = key.replace('thread_', '');
          const threadId = localStorage.getItem(key);
          
          // Buscar o assistente correspondente
          const assistant = assistants.find(a => a.id === assistantId);
          if (assistant && threadId) {
            // Verificar se existem mensagens para este chat
            const messagesKey = `chat_${assistantId}`;
            const hasMessages = localStorage.getItem(messagesKey) !== null;
            
            // Obter a data da última mensagem
            let lastActivity = new Date();
            const messages = localStorage.getItem(messagesKey);
            if (messages) {
              try {
                const parsedMessages = JSON.parse(messages);
                if (parsedMessages.length > 0) {
                  const lastMessage = parsedMessages[parsedMessages.length - 1];
                  lastActivity = new Date(lastMessage.timestamp);
                }
              } catch (e) {
                console.error('Error parsing chat messages:', e);
              }
            }
            
            if (hasMessages) {
              history.push({
                assistantId,
                threadId,
                name: assistant.name,
                model: assistant.model,
                lastActivity,
                messageCount: messages ? JSON.parse(messages).length : 0
              });
            }
          }
        }
      }
      
      // Ordenar por data da última atividade (mais recente primeiro)
      history.sort((a, b) => b.lastActivity - a.lastActivity);
      
      setChatHistory(history);
    };
    
    if (assistants.length > 0) {
      loadChatHistory();
    }
  }, [assistants]);
  
  // Carregar presets
  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem('chat_presets');
      if (savedPresets) {
        const parsedPresets = JSON.parse(savedPresets);
        // Ordenar por data de criação (mais recente primeiro)
        parsedPresets.sort((a, b) => {
          // Se lastUpdated existe, usá-lo para ordenação
          const dateA = a.lastUpdated ? new Date(a.lastUpdated) : new Date(a.createdAt);
          const dateB = b.lastUpdated ? new Date(b.lastUpdated) : new Date(b.createdAt);
          return dateB - dateA;
        });
        setPresets(parsedPresets);
      }
    } catch (e) {
      console.error('Error loading presets:', e);
    }
  }, [location.pathname]); // Recarregar ao mudar de página
  
  // Certifique-se de que assistants é um array ou inicialize como vazio
  const safeAssistants = Array.isArray(assistants) ? assistants : [];
  
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' }
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <List>
          <ListItem disablePadding>
            <ListItemButton 
              selected={location.pathname === '/'}
              onClick={() => navigate('/')}
            >
              <ListItemIcon>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText primary="Home" />
            </ListItemButton>
          </ListItem>
          
          <ListItem disablePadding>
            <ListItemButton 
              selected={location.pathname === '/prompt-chat' || location.pathname === '/prompt-chat/default'}
              onClick={() => navigate('/prompt-chat')}
            >
              <ListItemIcon>
                <MessageIcon />
              </ListItemIcon>
              <ListItemText primary="Chat Direto" />
              <Chip 
                label="Novo" 
                size="small" 
                color="primary" 
                sx={{ height: 20, fontSize: '0.65rem' }} 
              />
            </ListItemButton>
          </ListItem>
          
          {/* Lista de Presets - Cabeçalho */}
          <ListItem disablePadding>
            <ListItemButton onClick={() => setPresetsOpen(!presetsOpen)}>
              <ListItemIcon>
                <TuneIcon />
              </ListItemIcon>
              <ListItemText primary="Configurações Salvas" />
              {presetsOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          
          {/* Lista de Presets - Conteúdo */}
          <Collapse in={presetsOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {presets.length > 0 ? (
                presets.map((preset) => (
                  <ListItem key={preset.id} disablePadding>
                    <ListItemButton 
                      onClick={() => navigate(`/prompt-chat/${preset.id}`)}
                      selected={location.pathname === `/prompt-chat/${preset.id}`}
                      sx={{ pl: 4 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Avatar 
                          sx={{ 
                            width: 24, 
                            height: 24, 
                            bgcolor: preset.model?.startsWith('gpt-4') ? 'rgba(75, 0, 130, 0.1)' : 'rgba(0, 120, 212, 0.1)',
                            color: preset.model?.startsWith('gpt-4') ? 'rgba(75, 0, 130, 0.8)' : 'rgba(0, 120, 212, 0.8)',
                            fontSize: '0.8rem'
                          }}
                        >
                          {preset.name?.substring(0, 1) || 'P'}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Typography variant="body2" noWrap>
                            {preset.name}
                          </Typography>
                        } 
                        secondary={
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {preset.model || 'GPT-3.5'}
                          </Typography>
                        }
                      />
                      {preset.hasConversation && (
                        <Chip 
                          size="small" 
                          label="Conversa" 
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.6rem' }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                ))
              ) : (
                <ListItem sx={{ pl: 4, opacity: 0.7 }}>
                  <ListItemText 
                    primary={
                      <Typography variant="caption">
                        Nenhum preset salvo
                      </Typography>
                    }
                  />
                </ListItem>
              )}
            </List>
          </Collapse>
        </List>
        
        <Divider sx={{ mt: 2, mb: 2 }} />
        
        <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>
          Histórico de Conversas
        </Typography>
        
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {chatHistory.length > 0 ? (
            chatHistory.map((chat) => (
              <ListItem key={chat.threadId} disablePadding>
                <ListItemButton 
                  onClick={() => navigate(`/chat/${chat.assistantId}`)}
                  selected={location.pathname === `/chat/${chat.assistantId}`}
                  sx={{ borderLeft: chat.threadId ? '3px solid #2196f3' : 'none' }}
                >
                  <ListItemIcon>
                    <Badge 
                      badgeContent={chat.messageCount > 0 ? chat.messageCount : null} 
                      color="primary"
                      sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem' } }}
                    >
                      <Avatar 
                        sx={{ 
                          width: 34, 
                          height: 34, 
                          bgcolor: chat.model?.startsWith('gpt-4') ? 'rgba(75, 0, 130, 0.1)' : 'rgba(0, 120, 212, 0.1)',
                          color: chat.model?.startsWith('gpt-4') ? 'rgba(75, 0, 130, 0.8)' : 'rgba(0, 120, 212, 0.8)'
                        }}
                      >
                        <ChatIcon fontSize="small" />
                      </Avatar>
                    </Badge>
                  </ListItemIcon>
                  <ListItemText 
                    primary={chat.name || 'Chat sem nome'}
                    secondaryTypographyProps={{ component: 'div' }}
                    secondary={
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {new Date(chat.lastActivity).toLocaleString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))
          ) : (
            <ListItem sx={{ opacity: 0.6 }}>
              <ListItemIcon>
                <HistoryIcon color="disabled" />
              </ListItemIcon>
              <ListItemText 
                primary="Nenhuma conversa" 
                secondaryTypographyProps={{ component: 'div' }}
                secondary="Inicie um chat com um assistente" 
              />
            </ListItem>
          )}
        </List>
        
        {!isApiKeySet && (
          <Box sx={{ p: 2, bgcolor: 'background.paper', boxShadow: 1, mt: 'auto' }}>
            <Typography variant="body2" color="error" gutterBottom>
              Chave de API não configurada
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Configure sua chave da OpenAI para criar e usar assistentes.
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default Sidebar;