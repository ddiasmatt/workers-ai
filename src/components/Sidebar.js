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
      
      // Debug para ver todas as chaves
      console.log('Todas as chaves no localStorage:', 
        Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)));
      
      // Procurar por conversas salvas no localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // Verificamos tanto as conversas normais quanto conversas de presets
        if (key && key.startsWith('conversation_') && key !== 'conversation_default') {
          const chatId = key.replace('conversation_', '');
          
          try {
            const conversationData = JSON.parse(localStorage.getItem(key));
            
            // Pular se não houver dados ou mensagens vazias
            if (!conversationData || conversationData.length < 2) continue;
            
            // Verificar se é um preset
            const isPresetConversation = presets.some(p => p.id === chatId && p.hasConversation);
            const preset = presets.find(p => p.id === chatId);
            
            // Se for mensagem de um preset, só adicionamos se o preset diz que tem conversa
            if (preset && !preset.hasConversation) {
              console.log('Pulando conversa de preset sem hasConversation:', chatId);
              continue;
            }
            
            // Encontrar a primeira mensagem do usuário para usar como título
            const firstUserMessage = conversationData.find(m => m.role === 'user');
            const title = firstUserMessage 
              ? firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '')
              : isPresetConversation && preset ? preset.name : 'Conversa sem título';
            
            // Encontrar a última mensagem para data de última atividade
            const lastMessage = conversationData[conversationData.length - 1];
            const lastActivity = lastMessage?.timestamp 
              ? new Date(lastMessage.timestamp) 
              : new Date();
            
            // Determinar o modelo usado
            const systemMessage = conversationData.find(m => m.role === 'system');
            let modelInfo = preset?.model || 'GPT-4o';
            
            // Se é uma conversa de preset, adicionamos ao preset
            if (isPresetConversation) {
              // Adicionar conversa ao histórico com informações do preset
              history.push({
                id: chatId,
                title: preset.name,
                lastActivity,
                messageCount: conversationData.filter(m => m.role !== 'system').length,
                modelInfo: preset.model,
                isPreset: true
              });
              
              console.log(`Conversa de preset adicionada: ${preset.name} (ID: ${chatId})`);
            } 
            // Se não for um preset (é uma conversa normal)
            else if (!preset) {
              // Adicionar conversa ao histórico
              history.push({
                id: chatId,
                title,
                lastActivity,
                messageCount: conversationData.filter(m => m.role !== 'system').length,
                modelInfo,
                isPreset: false
              });
              
              console.log(`Conversa normal adicionada: ${title} (ID: ${chatId})`);
            }
          } catch (e) {
            console.error(`Erro processando conversa ${chatId}:`, e);
          }
        }
      }
      
      // Ordenar por data da última atividade (mais recente primeiro)
      history.sort((a, b) => b.lastActivity - a.lastActivity);
      console.log('Histórico final de conversas:', history);
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
                  sx={chat.isPreset ? { 
                    borderLeft: '2px solid rgba(16, 163, 127, 0.5)'
                  } : {}}
                >
                  <ListItemIcon>
                    <Avatar 
                      sx={{ 
                        width: 28, 
                        height: 28, 
                        bgcolor: chat.isPreset 
                          ? (chat.modelInfo?.includes('4') 
                              ? 'rgba(75, 0, 130, 0.1)' 
                              : 'rgba(16, 163, 127, 0.1)')
                          : 'rgba(25, 118, 210, 0.1)',
                        color: chat.isPreset 
                          ? (chat.modelInfo?.includes('4') 
                              ? 'rgba(75, 0, 130, 0.8)' 
                              : 'rgba(16, 163, 127, 0.8)')
                          : 'rgba(25, 118, 210, 0.8)'
                      }}
                    >
                      {chat.isPreset 
                        ? chat.title.substring(0, 1).toUpperCase()
                        : <ChatIcon fontSize="small" />
                      }
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                          {chat.title}
                        </Typography>
                        {chat.isPreset && (
                          <Chip 
                            size="small" 
                            label="Modelo" 
                            variant="outlined"
                            sx={{ height: 16, fontSize: '0.6rem', ml: 1 }}
                          />
                        )}
                      </Box>
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
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {chat.modelInfo || 'GPT-4o'} · {chat.messageCount} msgs
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