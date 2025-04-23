import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  ListItemButton,
  Typography,
  Avatar,
  Button,
  Menu,
  MenuItem,
  IconButton
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import HistoryIcon from '@mui/icons-material/History';
import KeyIcon from '@mui/icons-material/Key';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { ApiKeyContext, ChatHistoryContext } from '../App';
import { hasApiKey } from '../services/prompt';

const drawerWidth = 260;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openApiKeyDialog } = useContext(ApiKeyContext);
  const { chatHistory, setChatHistory, refreshChatHistory } = useContext(ChatHistoryContext);
  const [presets, setPresets] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(null);
  
  // Função para abrir o menu de contexto
  const handleContextMenu = (event, chat) => {
    event.preventDefault();
    setContextMenu({ 
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
    setSelectedChatId(chat.id);
  };
  
  // Função para fechar o menu de contexto
  const handleCloseContextMenu = () => {
    setContextMenu(null);
    setSelectedChatId(null);
  };
  
  // Função para excluir uma conversa
  const handleDeleteConversation = () => {
    if (!selectedChatId) return;
    
    // Remover do localStorage
    localStorage.removeItem(`conversation_${selectedChatId}`);
    
    // Remover do estado compartilhado
    setChatHistory(prevHistory => 
      prevHistory.filter(chat => chat.id !== selectedChatId)
    );
    
    // Fechar o menu
    handleCloseContextMenu();
  };
  
  // Atualizar o histórico de conversas quando a localização ou presets mudam
  useEffect(() => {
    // Usamos a função do contexto compartilhado para atualizar o histórico
    refreshChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  
  // Função para carregar presets
  const loadPresets = () => {
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
  };
  
  // Carregar presets
  useEffect(() => {
    loadPresets();
  }, [location.pathname]); // Recarregar quando a rota mudar (após edição)
  
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' }
      }}
    >
      <Box sx={{ overflow: 'auto', height: '100%', display: 'flex', flexDirection: 'column', pt: 1 }}>
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
                  onContextMenu={(e) => handleContextMenu(e, chat)}
                  selected={location.pathname === `/prompt-chat/${chat.id}`}
                  sx={{
                    ...(chat.isPreset ? { borderLeft: '2px solid rgba(16, 163, 127, 0.5)' } : {}),
                    pr: 0.5,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
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
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, chat);
                    }}
                    sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
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
                secondary="Selecione um worker para iniciar" 
              />
            </ListItem>
          )}
        </List>
        
        <Box sx={{ p: 2, bgcolor: 'background.paper', boxShadow: 1, mt: 'auto' }}>
          {!hasApiKey() ? (
            <>
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
            </>
          ) : (
            <Button 
              variant="text" 
              startIcon={<KeyIcon color="success" />}
              onClick={openApiKeyDialog}
              sx={{ width: '100%' }}
            >
              Configurações da API
            </Button>
          )}
        </Box>
        
        {/* Menu de contexto para ações nas conversas */}
        <Menu
          open={Boolean(contextMenu)}
          onClose={handleCloseContextMenu}
          anchorReference="anchorPosition"
          anchorPosition={contextMenu ? 
            { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
        >
          <MenuItem onClick={handleDeleteConversation}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Excluir conversa</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Drawer>
  );
};

export default Sidebar;