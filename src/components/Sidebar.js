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
  ListItemButton,
  Typography,
  Chip,
  Avatar,
  Button,
  Tooltip
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import MessageIcon from '@mui/icons-material/Message';
import HistoryIcon from '@mui/icons-material/History';
import KeyIcon from '@mui/icons-material/Key';
import SettingsIcon from '@mui/icons-material/Settings';
import { ApiKeyContext } from '../App';
import { hasApiKey } from '../services/prompt';

const drawerWidth = 260;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openApiKeyDialog, isApiKeySet } = useContext(ApiKeyContext);
  const [chatHistory, setChatHistory] = useState([]);
  const [presets, setPresets] = useState([]);
  
  // Carregar histórico de conversas diretas
  useEffect(() => {
    try {
      const history = [];
      // Procurar por conversas salvas no localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('conversation_') && key !== 'conversation_default') {
          const chatId = key.replace('conversation_', '');
          
          // Verificar se é um preset ou uma conversa independente
          const isPreset = presets.some(p => p.id === chatId);
          
          if (!isPreset) {
            // Tentar obter os dados da conversa
            try {
              const conversationData = JSON.parse(localStorage.getItem(key));
              
              // Encontrar a primeira mensagem do usuário para usar como título
              const firstUserMessage = conversationData.find(m => m.role === 'user');
              const title = firstUserMessage 
                ? firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '')
                : 'Conversa sem título';
              
              // Encontrar a última mensagem para data de última atividade
              const lastMessage = conversationData[conversationData.length - 1];
              const lastActivity = lastMessage?.timestamp 
                ? new Date(lastMessage.timestamp) 
                : new Date();
              
              // Determinar o modelo usado
              const systemMessage = conversationData.find(m => m.role === 'system');
              let modelInfo = 'GPT-4o';
              
              history.push({
                id: chatId,
                title,
                lastActivity,
                messageCount: conversationData.length,
                modelInfo
              });
            } catch (e) {
              console.error('Error parsing conversation data:', e);
            }
          }
        }
      }
      
      // Ordenar por data da última atividade (mais recente primeiro)
      history.sort((a, b) => b.lastActivity - a.lastActivity);
      setChatHistory(history);
    } catch (e) {
      console.error('Error loading chat history:', e);
    }
  }, [location.pathname, presets]);
  
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
              <ListItemText primary="Modelos de Conversa" />
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
              <ListItemText primary="Nova Conversa" />
            </ListItemButton>
          </ListItem>
          
          <Divider sx={{ my: 1 }} />
          
          <ListItem disablePadding>
            <ListItemButton onClick={openApiKeyDialog}>
              <ListItemIcon>
                <KeyIcon color={isApiKeySet ? "success" : "error"} />
              </ListItemIcon>
              <ListItemText 
                primary="Configurar API" 
                secondary={isApiKeySet ? "Chave configurada" : "Chave não configurada"}
              />
            </ListItemButton>
          </ListItem>
        </List>
        
        <Divider sx={{ my: 1 }} />
        
        {/* Presets (modelos de conversa) */}
        <Typography variant="overline" sx={{ px: 2, color: 'text.secondary', mt: 1 }}>
          Modelos Salvos
        </Typography>
        
        <List sx={{ pb: 1, maxHeight: '35%', overflow: 'auto' }}>
          {presets.length > 0 ? (
            presets.map((preset) => (
              <ListItem key={preset.id} disablePadding>
                <ListItemButton 
                  onClick={() => navigate(`/prompt-chat/${preset.id}`)}
                  selected={location.pathname === `/prompt-chat/${preset.id}`}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Avatar 
                      sx={{ 
                        width: 24, 
                        height: 24, 
                        bgcolor: preset.model?.includes('4') ? 'rgba(75, 0, 130, 0.1)' : 'rgba(0, 120, 212, 0.1)',
                        color: preset.model?.includes('4') ? 'rgba(75, 0, 130, 0.8)' : 'rgba(0, 120, 212, 0.8)',
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
            <ListItem sx={{ opacity: 0.7 }}>
              <ListItemText 
                primary={
                  <Typography variant="caption">
                    Nenhum modelo salvo
                  </Typography>
                }
              />
            </ListItem>
          )}
        </List>
        
        <Divider sx={{ mb: 1 }} />
        
        {/* Histórico de Conversas */}
        <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>
          Conversas Recentes
        </Typography>
        
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {chatHistory.length > 0 ? (
            chatHistory.map((chat) => (
              <ListItem key={chat.id} disablePadding>
                <ListItemButton 
                  onClick={() => navigate(`/prompt-chat/${chat.id}`)}
                  selected={location.pathname === `/prompt-chat/${chat.id}`}
                >
                  <ListItemIcon>
                    <Avatar 
                      sx={{ 
                        width: 28, 
                        height: 28, 
                        bgcolor: 'rgba(16, 163, 127, 0.1)',
                        color: 'rgba(16, 163, 127, 0.8)'
                      }}
                    >
                      <ChatIcon fontSize="small" />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography variant="body2" noWrap>
                        {chat.title}
                      </Typography>
                    }
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
                secondary="Inicie uma nova conversa" 
              />
            </ListItem>
          )}
        </List>
        
        {!hasApiKey() && (
          <Box sx={{ p: 2, bgcolor: 'background.paper', boxShadow: 1, mt: 'auto' }}>
            <Typography variant="body2" color="error" gutterBottom>
              Chave de API não configurada
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Configure sua chave da OpenAI para usar os modelos de IA.
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<KeyIcon />}
              onClick={openApiKeyDialog}
              sx={{ mt: 1, width: '100%' }}
            >
              Configurar API
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default Sidebar;