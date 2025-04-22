import React, { useContext } from 'react';
import { Box, AppBar, Toolbar, Typography, Container, Button, Tooltip } from '@mui/material';
import Sidebar from './Sidebar';
import { ApiKeyContext } from '../App';
import KeyIcon from '@mui/icons-material/Key';

const Layout = ({ children }) => {
  const { openApiKeyDialog, isApiKeySet } = useContext(ApiKeyContext);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" noWrap component="div">
            Chat IA Avançado
          </Typography>
          
          <Box>
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