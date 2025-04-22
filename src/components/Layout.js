import React, { useContext } from 'react';
import { Box, Button, Container, Tooltip } from '@mui/material';
import Sidebar from './Sidebar';
import { ApiKeyContext } from '../App';
import KeyIcon from '@mui/icons-material/Key';

const Layout = ({ children }) => {
  const { openApiKeyDialog, isApiKeySet } = useContext(ApiKeyContext);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
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