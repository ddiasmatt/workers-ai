import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Avatar,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatIcon from '@mui/icons-material/Chat';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { AssistantsContext } from '../contexts/AssistantsContext';

const AssistantCard = ({ assistant, onDelete }) => {
  const navigate = useNavigate();
  const { GPT_MODELS } = useContext(AssistantsContext);
  
  // Find model details
  const getModelDetails = (modelId) => {
    return GPT_MODELS.find(model => model.id === modelId) || { 
      name: modelId, 
      description: 'Modelo OpenAI' 
    };
  };
  
  // Formatador de data
  const formatDate = (dateString) => {
    if (!dateString) return 'Data desconhecida';
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('pt-BR', options);
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Data inválida';
    }
  };

  // Garantir valores padrão para propriedades que podem estar ausentes
  const safeAssistant = {
    name: assistant.name || 'Assistente sem nome',
    model: assistant.model || 'Modelo desconhecido',
    instructions: assistant.instructions || 'Sem instruções',
    created_at: assistant.created_at,
    tools: Array.isArray(assistant.tools) ? assistant.tools : [],
    id: assistant.id,
    ...assistant
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: 'primary.main', 
              mr: 2,
              width: 50,
              height: 50 
            }}
          >
            <SmartToyIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" component="div" gutterBottom>
              {safeAssistant.name}
            </Typography>
            <Tooltip title={getModelDetails(safeAssistant.model).description}>
              <Chip 
                label={getModelDetails(safeAssistant.model).name} 
                size="small" 
                sx={{ 
                  mr: 1, 
                  bgcolor: safeAssistant.model.startsWith('gpt-4') ? 'rgba(75, 0, 130, 0.1)' : 'rgba(0, 120, 212, 0.1)',
                  borderColor: safeAssistant.model.startsWith('gpt-4') ? 'rgba(75, 0, 130, 0.5)' : 'rgba(0, 120, 212, 0.5)',
                  borderWidth: 1,
                  borderStyle: 'solid'
                }}
              />
            </Tooltip>
            <Typography variant="caption" color="text.secondary">
              Criado em {formatDate(safeAssistant.created_at)}
            </Typography>
          </Box>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {safeAssistant.instructions.substring(0, 150)}...
        </Typography>
        
        {safeAssistant.tools && safeAssistant.tools.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Ferramentas:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {safeAssistant.tools.map((tool, index) => {
                const toolName = typeof tool === 'object' && tool.type ? tool.type : tool;
                return <Chip key={index} label={toolName} size="small" variant="outlined" />;
              })}
            </Box>
          </Box>
        )}
      </CardContent>
      
      <CardActions>
        <Button 
          size="small" 
          startIcon={<ChatIcon />}
          onClick={() => navigate(`/chat/${safeAssistant.id}`)}
        >
          Chat
        </Button>
        <Button 
          size="small" 
          startIcon={<EditIcon />}
          onClick={() => navigate(`/edit/${safeAssistant.id}`)}
        >
          Editar
        </Button>
        <Button 
          size="small" 
          color="error" 
          startIcon={<DeleteIcon />}
          onClick={() => onDelete(safeAssistant.id)}
        >
          Excluir
        </Button>
      </CardActions>
    </Card>
  );
};

export default AssistantCard;
