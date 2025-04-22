import React, { useContext } from 'react';
import { Box, AppBar, Toolbar, Typography, Container, Button, Tooltip } from '@mui/material';
import Sidebar from './Sidebar';
import { AssistantsContext } from '../contexts/AssistantsContext';
import KeyIcon from '@mui/icons-material/Key';
import RefreshIcon from '@mui/icons-material/Refresh';

const Layout = ({ children }) => {
  const { openApiKeyDialog, isApiKeySet, refreshAssistants, isLoading } = useContext(AssistantsContext);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" noWrap component="div">
            Criador de Assistentes IA
          </Typography>
          
          <Box>
            <Tooltip title="Recarregar assistentes">
              <span>
                <Button 
                  startIcon={<RefreshIcon />} 
                  color="inherit" 
                  sx={{ mr: 1 }}
                  onClick={refreshAssistants}
                  disabled={isLoading || !isApiKeySet}
                >
                  Atualizar
                </Button>
              </span>
            </Tooltip>
            
            <Tooltip title={isApiKeySet ? 'Editar chave da API' : 'Configurar chave da API'}>
              <Button 
                startIcon={<KeyIcon />} 
                color="inherit"
                variant={isApiKeySet ? "text" : "outlined"}
                onClick={openApiKeyDialog}
              >
                {isApiKeySet ? 'Chave API' : 'Definir Chave API'}
              </Button>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Sidebar />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pt: 10,
          height: '100vh',
          overflow: 'auto',
          backgroundColor: 'background.default'
        }}
      >
        <Container>{children}</Container>
      </Box>
    </Box>
  );
};

export default Layout;