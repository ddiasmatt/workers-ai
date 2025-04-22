import React, { useContext, useState, useEffect } from 'react';
import { AssistantsContext } from '../contexts/AssistantsContext';
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
  Fab,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import KeyIcon from '@mui/icons-material/Key';
import AssistantCard from '../components/AssistantCard';
import { useNavigate } from 'react-router-dom';
import { hasApiKey } from '../services/openai';

const Home = () => {
  const { 
    assistants, 
    deleteAssistant, 
    isLoading, 
    error, 
    openApiKeyDialog, 
    isApiKeySet 
  } = useContext(AssistantsContext);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, assistantId: null });
  const navigate = useNavigate();
  
  // Garantir que assistants é sempre um array
  const safeAssistants = Array.isArray(assistants) ? assistants : [];

  // Verificar se a API key está definida
  useEffect(() => {
    if (!hasApiKey()) {
      openApiKeyDialog();
    }
  }, [openApiKeyDialog]);

  // Lidar com clique de excluir
  const handleDeleteClick = (id) => {
    setDeleteDialog({ open: true, assistantId: id });
  };

  // Confirmar exclusão
  const confirmDelete = () => {
    deleteAssistant(deleteDialog.assistantId);
    setDeleteDialog({ open: false, assistantId: null });
  };

  // Cancelar exclusão
  const cancelDelete = () => {
    setDeleteDialog({ open: false, assistantId: null });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Seus Assistentes
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
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Erro</AlertTitle>
          {error}
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && !isApiKeySet && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>Chave de API necessária</AlertTitle>
            Para utilizar esta aplicação, você precisa fornecer uma chave de API válida da OpenAI.
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

      {!isLoading && isApiKeySet && safeAssistants.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>Nenhum assistente criado</AlertTitle>
            Você ainda não criou nenhum assistente. Crie seu primeiro assistente utilizando o botão no canto inferior direito.
          </Alert>
        </Paper>
      )}

      {!isLoading && safeAssistants.length > 0 && (
        <Grid container spacing={3}>
          {safeAssistants.map((assistant) => (
            <Grid item xs={12} sm={6} md={4} key={assistant.id || `assistant-${Math.random()}`}>
              <AssistantCard 
                assistant={assistant} 
                onDelete={handleDeleteClick} 
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Botão flutuante para criação rápida */}
      {isApiKeySet && (
        <Tooltip title="Criar novo assistente">
          <Fab 
            color="primary" 
            aria-label="add"
            onClick={() => navigate('/create')}
            sx={{ 
              position: 'fixed', 
              bottom: 30, 
              right: 30 
            }}
          >
            <AddIcon />
          </Fab>
        </Tooltip>
      )}

      {/* Diálogo de confirmação de exclusão */}
      <Dialog
        open={deleteDialog.open}
        onClose={cancelDelete}
      >
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir este assistente? Esta ação não pode ser desfeita.
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