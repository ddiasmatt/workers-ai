import React, { useContext, useState, useEffect } from 'react';
import { ApiKeyContext } from '../App';
import {
  Typography,
  Grid,
  Box,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  Paper,
  Card,
  CardContent,
  CardActions,
  Divider,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import MessageIcon from '@mui/icons-material/Message';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import TuneIcon from '@mui/icons-material/Tune';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { hasApiKey } from '../services/prompt';

const Home = () => {
  const { openApiKeyDialog, isApiKeySet } = useContext(ApiKeyContext);
  const [presets, setPresets] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, presetId: null });
  const [isLoading, setIsLoading] = useState(true);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const navigate = useNavigate();
  
  // Carregar presets
  useEffect(() => {
    try {
      setIsLoading(true);
      const savedPresets = localStorage.getItem('chat_presets');
      if (savedPresets) {
        const parsedPresets = JSON.parse(savedPresets);
        // Ordenar por data de criação (mais recente primeiro)
        parsedPresets.sort((a, b) => {
          const dateA = a.lastUpdated ? new Date(a.lastUpdated) : new Date(a.createdAt);
          const dateB = b.lastUpdated ? new Date(b.lastUpdated) : new Date(b.createdAt);
          return dateB - dateA;
        });
        setPresets(parsedPresets);
      }
      setIsLoading(false);
    } catch (e) {
      console.error('Error loading presets:', e);
      setIsLoading(false);
    }
  }, []);

  // Verificar se a API key está definida
  useEffect(() => {
    if (!hasApiKey()) {
      openApiKeyDialog();
    }
  }, [openApiKeyDialog]);

  // Abrir menu de opções
  const handleMenuOpen = (event, id) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedPresetId(id);
  };

  // Fechar menu de opções
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedPresetId(null);
  };
  
  // Navegar para editar worker - referencia direta à tela de criar worker
  const handleEditPreset = () => {
    if (selectedPresetId) {
      // Usar a tela de criar para editar, passando o ID do worker
      navigate(`/create-assistant?edit=${selectedPresetId}`);
    }
    handleMenuClose();
  };

  // Lidar com clique de excluir
  const handleDeleteClick = () => {
    if (selectedPresetId) {
      setDeleteDialog({ open: true, presetId: selectedPresetId });
    }
    handleMenuClose();
  };

  // Confirmar exclusão
  const confirmDelete = () => {
    try {
      const presetId = deleteDialog.presetId;
      const updatedPresets = presets.filter(p => p.id !== presetId);
      localStorage.setItem('chat_presets', JSON.stringify(updatedPresets));
      setPresets(updatedPresets);
      
      // Remover dados da conversa associados ao preset
      localStorage.removeItem(`conversation_${presetId}`);
    } catch (e) {
      console.error('Error deleting preset:', e);
    } finally {
      setDeleteDialog({ open: false, presetId: null });
    }
  };

  // Cancelar exclusão
  const cancelDelete = () => {
    setDeleteDialog({ open: false, presetId: null });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Workers Salvos
        </Typography>
        
        <Box>
          {!isApiKeySet && (
            <Button 
              variant="outlined" 
              startIcon={<KeyIcon />} 
              onClick={openApiKeyDialog}
              sx={{ mr: 2 }}
            >
              Configurar API
            </Button>
          )}
          
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<TuneIcon />}
            onClick={() => navigate('/create-assistant')}
          >
            Criar Worker
          </Button>
        </Box>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {!isApiKeySet && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Chave de API necessária</AlertTitle>
                Para utilizar os modelos de IA, você precisa fornecer uma chave de API válida da OpenAI.
              </Alert>
              <Button 
                variant="contained" 
                startIcon={<KeyIcon />} 
                onClick={openApiKeyDialog}
              >
                Configurar Chave da API
              </Button>
            </Paper>
          )}
          
          {presets.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <TuneIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                  Nenhum worker salvo
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mb: 3 }}>
                  Inicie uma conversa e salve suas configurações como worker para reutilização.
                  Workers permitem configurar o prompt do sistema, modelo de IA, ferramentas e outras configurações.
                </Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/prompt-chat')}
                >
                  Iniciar Conversa
                </Button>
              </Box>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {presets.map((preset) => (
                <Grid item xs={12} sm={6} md={4} key={preset.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar 
                          sx={{ 
                            mr: 1,
                            bgcolor: preset.model?.includes('4') ? 'rgba(75, 0, 130, 0.1)' : 'rgba(16, 163, 127, 0.1)',
                            color: preset.model?.includes('4') ? 'rgba(75, 0, 130, 0.8)' : 'rgba(16, 163, 127, 0.8)'
                          }}
                        >
                          {preset.name?.substring(0, 1) || 'M'}
                        </Avatar>
                        <Typography variant="h6" noWrap>
                          {preset.name}
                        </Typography>
                        
                        <Box sx={{ ml: 'auto' }}>
                          <IconButton 
                            size="small" 
                            onClick={(e) => handleMenuOpen(e, preset.id)}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      
                      <Divider sx={{ mb: 2 }} />
                      
                      <Box sx={{ mb: 2 }}>
                        <Chip 
                          label={preset.model || "GPT-4o"} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                          sx={{ mr: 1, mb: 1 }}
                        />
                        
                        {preset.tools && preset.tools.length > 0 && preset.tools.map(tool => (
                          <Chip 
                            key={tool}
                            label={tool.replace('_', ' ')} 
                            size="small"
                            sx={{ mr: 1, mb: 1, textTransform: 'capitalize' }}
                          />
                        ))}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>System Prompt:</strong>
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          mb: 1,
                          display: '-webkit-box',
                          overflow: 'hidden',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 3,
                          textOverflow: 'ellipsis',
                          maxHeight: '4.5em'
                        }}
                      >
                        {preset.systemPrompt || "Não definido"}
                      </Typography>
                      
                      {/* Arquivos anexados */}
                      {preset.attachedFiles && preset.attachedFiles.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                            <AttachFileIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />
                            <span>{preset.attachedFiles.length} arquivo{preset.attachedFiles.length > 1 ? 's' : ''} anexado{preset.attachedFiles.length > 1 ? 's' : ''}</span>
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        variant="contained"
                        fullWidth
                        onClick={() => navigate(`/prompt-chat/${preset.id}?new=true&t=${Date.now()}`)}
                        disabled={!isApiKeySet}
                      >
                        Iniciar Novo Chat
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Diálogo de confirmação de exclusão */}
      <Dialog
        open={deleteDialog.open}
        onClose={cancelDelete}
      >
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir este worker? 
            {presets.find(p => p.id === deleteDialog.presetId)?.hasConversation && 
              ' Todas as conversas salvas com este worker também serão excluídas.'}
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Cancelar</Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu de opções do preset */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditPreset}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Home;