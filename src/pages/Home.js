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
  IconButton
} from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import MessageIcon from '@mui/icons-material/Message';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import TuneIcon from '@mui/icons-material/Tune';
import { useNavigate } from 'react-router-dom';
import { hasApiKey } from '../services/prompt';

const Home = () => {
  const { openApiKeyDialog, isApiKeySet } = useContext(ApiKeyContext);
  const [presets, setPresets] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, presetId: null });
  const [isLoading, setIsLoading] = useState(true);
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

  // Lidar com clique de excluir
  const handleDeleteClick = (id) => {
    setDeleteDialog({ open: true, presetId: id });
  };

  // Confirmar exclusão
  const confirmDelete = () => {
    try {
      const updatedPresets = presets.filter(p => p.id !== deleteDialog.presetId);
      localStorage.setItem('chat_presets', JSON.stringify(updatedPresets));
      setPresets(updatedPresets);
      
      // Remover dados da conversa associados ao preset
      localStorage.removeItem(`conversation_${deleteDialog.presetId}`);
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
          Modelos de Conversa
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
            startIcon={<AddIcon />}
            onClick={() => navigate('/prompt-chat')}
          >
            Nova Conversa
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

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
              Comece uma Nova Conversa
            </Typography>
            <Paper sx={{ p: 3, mb: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ mb: { xs: 2, md: 0 } }}>
                <Typography variant="h6" gutterBottom>
                  Chat com IA Avançada
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use os modelos mais recentes da OpenAI como GPT-4.1, GPT-4.5, GPT-o3 e GPT-4o
                </Typography>
              </Box>
              <Button 
                variant="contained" 
                size="large"
                endIcon={<MessageIcon />}
                onClick={() => navigate('/prompt-chat')}
                disabled={!isApiKeySet}
              >
                Iniciar Conversa
              </Button>
            </Paper>
          </Box>

          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Modelos Salvos
          </Typography>
          
          {presets.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <TuneIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                  Nenhum modelo salvo
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mb: 3 }}>
                  Inicie uma conversa e salve suas configurações como modelo para reutilização.
                  Modelos salvos permitem configurar o prompt do sistema, modelo de IA, ferramentas e outras configurações.
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
                            color="error"
                            onClick={() => handleDeleteClick(preset.id)}
                          >
                            <DeleteIcon fontSize="small" />
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
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        variant="contained"
                        fullWidth
                        onClick={() => navigate(`/prompt-chat/${preset.id}`)}
                        disabled={!isApiKeySet}
                      >
                        {preset.hasConversation ? 'Continuar Conversa' : 'Usar Modelo'}
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
            Tem certeza que deseja excluir este modelo de conversa? 
            {presets.find(p => p.id === deleteDialog.presetId)?.hasConversation && 
              ' A conversa salva com este modelo também será excluída.'}
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
    </Box>
  );
};

export default Home;