import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  Box,
  Typography,
  Chip
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { setApiKey, hasApiKey, getMaskedApiKey } from '../services/prompt';

const ApiKeyDialog = ({ open, onClose }) => {
  const [apiKey, setApiKeyState] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState('');
  const [hasKey, setHasKey] = useState(hasApiKey());
  const [maskedKey, setMaskedKey] = useState('');

  useEffect(() => {
    setHasKey(hasApiKey());
    setMaskedKey(getMaskedApiKey());
  }, [open]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setError('A chave da API é obrigatória');
      return;
    }

    // Validação básica do formato (começa com "sk-")
    if (!apiKey.startsWith('sk-')) {
      setError('Formato de chave inválido. A chave da API deve começar com "sk-"');
      return;
    }

    try {
      setApiKey(apiKey);
      setHasKey(true);
      setMaskedKey(getMaskedApiKey());
      setApiKeyState('');
      setShowApiKey(false);
      setError('');
      onClose(apiKey);
    } catch (err) {
      setError(err.message || 'Erro ao salvar a chave da API');
    }
  };

  const handleChange = (e) => {
    setApiKeyState(e.target.value);
    if (error) setError('');
  };

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  const handleReset = () => {
    setApiKeyState('');
    setHasKey(false);
    setApiKey(''); // Limpa a chave real
    localStorage.removeItem('openai-api-key');
    setMaskedKey('');
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Configurar Chave da API OpenAI</DialogTitle>
      <DialogContent>
        <DialogContentText gutterBottom>
          Para utilizar os modelos avançados de IA, é necessário fornecer uma chave de API válida da OpenAI.
          Sua chave é armazenada apenas localmente no seu navegador.
        </DialogContentText>

        {hasKey && (
          <Box sx={{ mb: 3, mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Chave atual:
            </Typography>
            <Box display="flex" alignItems="center">
              <Chip 
                label={maskedKey} 
                color="success" 
                sx={{ mr: 1 }} 
              />
              <Button 
                size="small" 
                variant="outlined" 
                color="error"
                onClick={handleReset}
              >
                Redefinir
              </Button>
            </Box>
          </Box>
        )}

        <TextField
          autoFocus
          margin="dense"
          label={hasKey ? "Nova chave da API" : "Chave da API OpenAI"}
          type={showApiKey ? 'text' : 'password'}
          fullWidth
          variant="outlined"
          value={apiKey}
          onChange={handleChange}
          error={!!error}
          helperText={error || 'Exemplo: sk-xxxxxxxxxxxxxxxxxxxx'}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={toggleShowApiKey}
                  edge="end"
                >
                  {showApiKey ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        
        <Alert severity="info" sx={{ mt: 2 }}>
          Você pode obter sua chave de API em 
          <Button 
            href="https://platform.openai.com/api-keys" 
            target="_blank" 
            rel="noopener noreferrer"
            size="small"
          >
            platform.openai.com/api-keys
          </Button>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApiKeyDialog;
