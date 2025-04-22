import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Avatar,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert,
  Button,
  AppBar,
  Toolbar,
  Snackbar,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import SettingsIcon from '@mui/icons-material/Settings';
import { 
  hasApiKey, 
  uploadFile,
  ConversationManager,
  sendMessageWithStreaming,
  retrieveFileContent
} from '../services/prompt';

// Modelos disponíveis
const AVAILABLE_MODELS = [
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Rápido e econômico' },
  { id: 'gpt-4', name: 'GPT-4', description: 'Mais capaz e preciso' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Versão mais recente e rápida do GPT-4' }
];

const PromptChat = () => {
  const { id } = useParams(); // ID usado para identificar a conversa no localStorage
  const navigate = useNavigate();
  
  // Estados para controle da interface
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeRunId, setActiveRunId] = useState(null);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isResettingThread, setIsResettingThread] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful assistant. Answer questions clearly and concisely.'
  );
  
  // Referências
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const conversationRef = useRef(new ConversationManager(systemPrompt));
  
  // Inicializar ou carregar conversa
  useEffect(() => {
    const chatId = id || 'default';
    const conversation = conversationRef.current;
    
    // Tentar carregar conversa salva
    const loaded = conversation.load(chatId);
    
    if (loaded) {
      // Converter o histórico para o formato de mensagens da UI
      const uiMessages = conversation.getHistory().map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date().toISOString() // Data aproximada
      }));
      
      // Filtrar mensagens de sistema que não queremos mostrar na UI
      const visibleMessages = uiMessages.filter(msg => msg.role !== 'system');
      setMessages(visibleMessages);
      
      // Recuperar o system prompt se existir
      const systemMessage = conversation.getHistory().find(msg => msg.role === 'system');
      if (systemMessage) {
        setSystemPrompt(systemMessage.content);
      }
    } else {
      // Inicializar nova conversa com o system prompt
      conversation.reset(systemPrompt);
    }
  }, [id, systemPrompt]);
  
  // Rolar para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Enviar mensagem
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || isTyping || activeRunId) return;
    
    if (!hasApiKey()) {
      setSnackbar({
        open: true,
        message: 'Por favor, configure sua chave de API da OpenAI primeiro.'
      });
      return;
    }
    
    const userContent = input.trim();
    setInput('');
    
    // Construir a mensagem do usuário para a UI
    const userMessage = {
      role: 'user',
      content: userContent,
      timestamp: new Date().toISOString(),
      ...(attachedFile ? { attachedFile } : {})
    };
    
    // Limpar arquivo anexado
    const fileToProcess = attachedFile;
    setAttachedFile(null);
    
    // Adicionar mensagem do usuário à UI e uma mensagem temporária do assistente
    setMessages(prev => [
      ...prev, 
      userMessage,
      {
        role: 'assistant',
        content: 'Pensando...',
        timestamp: new Date().toISOString(),
        isStreaming: true,
        isThinking: true
      }
    ]);
    
    setIsTyping(true);
    setError(null);
    
    try {
      // Processar arquivo anexado se existir
      let finalUserContent = userContent;
      
      if (fileToProcess) {
        try {
          // Adicionar informações sobre o arquivo na mensagem para a UI
          finalUserContent = userContent ? 
            `${userContent}\n\n[Arquivo anexado: ${fileToProcess.name}]` : 
            `[Arquivo anexado: ${fileToProcess.name}]`;
          
          // Se temos um ID de arquivo, tentar recuperar seu conteúdo
          if (fileToProcess.id) {
            try {
              const fileContent = await retrieveFileContent(fileToProcess.id);
              
              // Adicionar conteúdo do arquivo como contexto
              const fileContextMsg = `File content:\n${JSON.stringify(fileContent.content)}`;
              
              // Adicionar ao histórico, mas não mostrar na UI
              conversationRef.current.addMessage('user', fileContextMsg);
            } catch (fileErr) {
              console.warn('Could not retrieve file content, continuing with standard message', fileErr);
            }
          }
        } catch (fileErr) {
          console.error('Error processing file:', fileErr);
        }
      }
      
      // Iniciar streaming da resposta
      let currentAssistantMessage = '';
      
      try {
        const streamController = await sendMessageWithStreaming(
          conversationRef.current,
          finalUserContent,
          selectedModel,
          {
            onData: (data) => {
              // Atualizar o texto conforme é recebido
              currentAssistantMessage = data.content || '';
              const deltaText = data.delta || '';
              
              // Atualizar a mensagem na interface em tempo real
              setMessages(prev => {
                const messageIndex = prev.findIndex(msg => 
                  msg.role === 'assistant' && (msg.isThinking || msg.isStreaming)
                );
                
                if (messageIndex !== -1) {
                  const updatedMessages = [...prev];
                  updatedMessages[messageIndex] = {
                    ...updatedMessages[messageIndex],
                    content: currentAssistantMessage,
                    lastDelta: deltaText,
                    isThinking: false,
                    isStreaming: true,
                    timestamp: new Date().toISOString()
                  };
                  return updatedMessages;
                }
                
                return prev;
              });
            },
            onComplete: (result) => {
              // Finalizar a mensagem quando o streaming terminar
              setMessages(prev => {
                const assistantMessageIndex = prev.findIndex(
                  msg => msg.role === 'assistant' && msg.isStreaming
                );
                
                if (assistantMessageIndex > -1) {
                  const updatedMessages = [...prev];
                  updatedMessages[assistantMessageIndex] = {
                    ...updatedMessages[assistantMessageIndex],
                    content: result.content || currentAssistantMessage,
                    isStreaming: false,
                    isThinking: false
                  };
                  return updatedMessages;
                }
                
                return prev;
              });
              
              // Salvar conversa atualizada
              const chatId = id || 'default';
              conversationRef.current.save(chatId);
              
              // Limpar status
              setActiveRunId(null);
              setIsTyping(false);
            },
            onError: (errorMsg) => {
              console.error('Streaming error:', errorMsg);
              setError('Erro durante a resposta: ' + errorMsg);
              setIsTyping(false);
              setActiveRunId(null);
              
              // Atualizar a mensagem "Pensando..." para mostrar o erro
              setMessages(prev => {
                const messageIndex = prev.findIndex(msg => 
                  msg.role === 'assistant' && (msg.isThinking || msg.isStreaming)
                );
                
                if (messageIndex !== -1) {
                  const updatedMessages = [...prev];
                  updatedMessages[messageIndex] = {
                    ...updatedMessages[messageIndex],
                    content: 'Desculpe, ocorreu um erro durante o processamento da resposta.',
                    isThinking: false,
                    isStreaming: false,
                    isError: true
                  };
                  return updatedMessages;
                }
                
                return prev;
              });
            }
          }
        );
        
        // Armazenar referência ao controller para cancelamento
        setActiveRunId(streamController);
        
      } catch (streamError) {
        console.error('Error starting streaming:', streamError);
        setError('Erro ao iniciar streaming: ' + (streamError.message || 'Erro desconhecido'));
        setIsTyping(false);
        setActiveRunId(null);
        throw streamError;
      }
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Erro ao obter resposta: ' + (err.message || 'Erro desconhecido'));
      setIsTyping(false);
      
      // Substituir a mensagem "Pensando..." por uma mensagem de erro
      setMessages(prev => {
        const thinkingIndex = prev.findIndex(
          msg => msg.role === 'assistant' && msg.isThinking
        );
        
        if (thinkingIndex > -1) {
          const newMessages = [...prev];
          newMessages[thinkingIndex] = {
            role: 'assistant',
            content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
            timestamp: new Date().toISOString(),
            isError: true,
            isStreaming: false,
            isThinking: false
          };
          return newMessages;
        }
        
        return prev;
      });
    }
  };
  
  // Abrir o seletor de arquivo
  const handleOpenFileSelector = () => {
    fileInputRef.current?.click();
  };
  
  // Processar os arquivos selecionados
  const handleFileSelected = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Verificar se já existe algum arquivo anexado
    if (attachedFile) {
      setSnackbar({
        open: true,
        message: 'Remova o arquivo atual antes de anexar novos arquivos'
      });
      return;
    }
    
    setUploadingFile(true);
    setSnackbar({
      open: true,
      message: `Enviando ${files.length} arquivo(s)...`
    });
    
    // Apenas processamos o primeiro arquivo para a interface de chat
    const file = files[0];
    
    // Verificar o tipo de arquivo (permitir apenas PDF, CSV, TXT, Markdown)
    const allowedTypes = ['application/pdf', 'text/csv', 'text/plain', 'text/markdown'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && 
        !['pdf', 'csv', 'txt', 'md', 'markdown'].includes(fileExtension)) {
      setSnackbar({
        open: true,
        message: 'Somente arquivos PDF, CSV, TXT e Markdown são suportados'
      });
      setUploadingFile(false);
      return;
    }
    
    try {
      // Se houver mais de um arquivo, avise o usuário que apenas o primeiro será usado
      if (files.length > 1) {
        setSnackbar({
          open: true,
          message: 'Apenas o primeiro arquivo será usado na mensagem.'
        });
      }
      
      const response = await uploadFile(file);
      setAttachedFile({
        id: response.id,
        name: file.name,
        type: file.type,
        extension: fileExtension
      });
      
      setTimeout(() => {
        setSnackbar({
          open: true,
          message: 'Arquivo anexado com sucesso: ' + file.name
        });
      }, 1000);
    } catch (err) {
      console.error('Error uploading file:', err);
      setSnackbar({
        open: true,
        message: 'Erro ao enviar arquivo: ' + (err.message || 'Erro desconhecido')
      });
    } finally {
      setUploadingFile(false);
      // Limpar o input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Remover o arquivo anexado
  const handleRemoveFile = () => {
    setAttachedFile(null);
    setSnackbar({
      open: true,
      message: 'Arquivo removido'
    });
  };
  
  // Abrir diálogo de configurações
  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };
  
  // Salvar configurações
  const handleSaveSettings = () => {
    // Se o system prompt mudou, atualizar a conversa
    const conversation = conversationRef.current;
    const currentSystemPrompt = conversation.getHistory().find(msg => msg.role === 'system')?.content;
    
    if (currentSystemPrompt !== systemPrompt) {
      // Reset da conversa com novo system prompt
      conversation.reset(systemPrompt);
      
      // Limpar mensagens da UI
      setMessages([]);
      
      setSnackbar({
        open: true,
        message: 'Configurações atualizadas e conversa reiniciada'
      });
    } else {
      setSnackbar({
        open: true,
        message: 'Configurações atualizadas'
      });
    }
    
    setSettingsOpen(false);
  };
  
  // Fechar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Abrir diálogo de confirmação para reiniciar conversa
  const handleOpenResetConfirm = () => {
    if (isTyping || activeRunId) {
      setSnackbar({
        open: true,
        message: 'Aguarde o término da resposta atual antes de reiniciar a conversa.'
      });
      return;
    }
    setConfirmResetOpen(true);
  };
  
  // Fechar diálogo de confirmação
  const handleCloseResetConfirm = () => {
    setConfirmResetOpen(false);
  };
  
  // Reiniciar conversa
  const handleResetConversation = () => {
    if (isTyping || activeRunId) {
      setSnackbar({
        open: true,
        message: 'Aguarde o término da resposta atual antes de reiniciar a conversa.'
      });
      return;
    }
    
    setIsResettingThread(true);
    setError(null);
    
    try {
      // Resetar o gerenciador de conversa
      conversationRef.current.reset(systemPrompt);
      
      // Limpar mensagens da UI
      setMessages([]);
      
      // Limpar localStorage para essa conversa
      const chatId = id || 'default';
      localStorage.removeItem(`conversation_${chatId}`);
      
      setSnackbar({
        open: true,
        message: 'Conversa reiniciada com sucesso!'
      });
    } catch (err) {
      console.error('Error resetting conversation:', err);
      setError('Erro ao reiniciar conversa: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsResettingThread(false);
      handleCloseResetConfirm();
    }
  };
  
  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      bgcolor: 'background.default'
    }}>
      {/* Cabeçalho */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={() => navigate('/')}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Tooltip title="Reiniciar conversa">
            <IconButton
              color="inherit"
              onClick={handleOpenResetConfirm}
              disabled={isResettingThread}
              sx={{ mr: 1 }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Configurações">
            <IconButton
              color="inherit"
              onClick={handleOpenSettings}
              sx={{ mr: 1 }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            <SmartToyIcon />
          </Avatar>
          
          <Box>
            <Typography variant="h6">Chat com IA</Typography>
            <Chip 
              label={AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}
              size="small"
              sx={{ fontSize: '0.75rem' }}
            />
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Área de mensagens */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        py: 2, 
        px: { xs: 2, sm: 3 }, 
        display: 'flex',
        flexDirection: 'column'
      }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {messages.length === 0 && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            opacity: 0.8
          }}>
            <SmartToyIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Chat com Modelo de IA
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 500 }}>
              Comece uma conversa enviando uma mensagem. Você pode fazer perguntas, 
              pedir sugestões, ou solicitar ajuda com tarefas.
            </Typography>
          </Box>
        )}
        
        <List sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
          {messages.map((message, index) => (
            <React.Fragment key={index}>
              <ListItem alignItems="flex-start" sx={{ 
                bgcolor: message.role === 'assistant' ? 'background.paper' : 'transparent',
                borderRadius: 2,
                mb: 2,
                p: 2
              }}>
                <ListItemAvatar>
                  <Avatar sx={{ 
                    bgcolor: message.role === 'assistant' ? 'primary.main' : 'secondary.main'
                  }}>
                    {message.role === 'assistant' ? <SmartToyIcon /> : <PersonIcon />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={message.role === 'assistant' ? 'Assistente' : 'Você'}
                  secondaryTypographyProps={{ component: 'div' }}
                  secondary={
                    <Box>
                      <Box 
                        sx={{ 
                          mt: 1,
                          color: message.isError ? "error.main" : "text.primary",
                          '& .markdown': {
                            '& h1': { fontSize: '1.5rem', fontWeight: 'bold', my: 1 },
                            '& h2': { fontSize: '1.3rem', fontWeight: 'bold', my: 1 },
                            '& h3': { fontSize: '1.15rem', fontWeight: 'bold', my: 1 },
                            '& h4': { fontSize: '1.1rem', fontWeight: 'bold', my: 0.8 },
                            '& h5': { fontSize: '1.05rem', fontWeight: 'bold', my: 0.8 },
                            '& h6': { fontSize: '1rem', fontWeight: 'bold', my: 0.8 },
                            '& p': { my: 0.8 },
                            '& a': { color: 'primary.main', textDecoration: 'none' },
                            '& img': { maxWidth: '100%', my: 1 },
                            '& blockquote': { 
                              pl: 2, 
                              borderLeft: '4px solid', 
                              borderColor: 'divider',
                              my: 1,
                              ml: 0,
                              fontStyle: 'italic',
                              bgcolor: 'rgba(0,0,0,0.03)',
                              py: 0.5
                            },
                            '& pre': { 
                              backgroundColor: 'rgba(0,0,0,0.04)', 
                              p: 1, 
                              borderRadius: 1,
                              overflowX: 'auto',
                              '& code': {
                                fontFamily: 'monospace'
                              }
                            },
                            '& code': { 
                              fontFamily: 'monospace',
                              backgroundColor: 'rgba(0,0,0,0.04)',
                              px: 0.5,
                              borderRadius: 0.5
                            },
                            '& ul, & ol': { pl: 3, my: 1 },
                            '& table': {
                              borderCollapse: 'collapse',
                              width: '100%',
                              my: 1,
                              '& th, & td': {
                                border: '1px solid',
                                borderColor: 'divider',
                                p: 1
                              },
                              '& th': {
                                backgroundColor: 'rgba(0,0,0,0.04)'
                              }
                            },
                            '& hr': {
                              border: 'none',
                              height: '1px',
                              backgroundColor: 'divider',
                              my: 2
                            }
                          }
                        }}
                      >
                        {message.isThinking || message.isError ? (
                          <Typography variant="body1">
                            {message.content}
                          </Typography>
                        ) : (
                          <ReactMarkdown 
                            className="markdown"
                            remarkPlugins={[remarkGfm]}
                          >
                            {message.content}
                          </ReactMarkdown>
                        )}
                      </Box>
                      
                      {message.attachedFile && (
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            mt: 1,
                            p: 1,
                            bgcolor: 'rgba(0, 0, 0, 0.04)',
                            borderRadius: 1,
                            maxWidth: 'fit-content'
                          }}
                        >
                          {message.attachedFile.extension === 'pdf' ? (
                            <PictureAsPdfIcon fontSize="small" sx={{ mr: 1, color: '#e53935' }} />
                          ) : message.attachedFile.extension === 'csv' ? (
                            <TableChartIcon fontSize="small" sx={{ mr: 1, color: '#43a047' }} />
                          ) : (
                            <DescriptionIcon fontSize="small" sx={{ mr: 1, color: '#1e88e5' }} />
                          )}
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            {message.attachedFile.name}
                          </Typography>
                        </Box>
                      )}
                      
                      {message.isStreaming && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          {message.isThinking ? (
                            <>
                              <CircularProgress size={12} sx={{ mr: 1 }} />
                              <Typography variant="caption" color="text.secondary" component="span">
                                Pensando...
                              </Typography>
                            </>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box 
                                sx={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%', 
                                  backgroundColor: 'primary.main',
                                  mr: 0.5,
                                  animation: 'pulse 1.5s infinite',
                                  '@keyframes pulse': {
                                    '0%': { opacity: 0.4 },
                                    '50%': { opacity: 1 },
                                    '100%': { opacity: 0.4 },
                                  },
                                }} 
                              />
                              <Typography variant="caption" color="text.secondary" component="span">
                                Digitando em tempo real...
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  }
                />
              </ListItem>
              {index < messages.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </List>
      </Box>
      
      {/* Área de input */}
      <Paper 
        component="form" 
        onSubmit={handleSendMessage} 
        sx={{ 
          p: 2, 
          mx: { xs: 2, sm: 3 }, 
          mb: 2, 
          display: 'flex', 
          flexDirection: 'column',
          maxWidth: 800,
          width: 'auto',
          alignSelf: 'center',
          boxShadow: 3,
          borderRadius: 2,
          width: '100%',
          position: 'relative'
        }}
      >
        {activeRunId && (
          <Box
            sx={{
              position: 'absolute',
              top: -30,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'primary.main',
              color: 'white',
              py: 0.5,
              px: 2,
              borderRadius: '12px 12px 0 0',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              boxShadow: 1
            }}
          >
            <CircularProgress size={12} sx={{ color: 'white' }} />
            <span>Processando resposta...</span>
          </Box>
        )}
        
        {attachedFile && (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 2,
              pb: 1.5,
              borderBottom: '1px solid rgba(0,0,0,0.08)'
            }}
          >
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                bgcolor: 'rgba(25, 118, 210, 0.08)',
                borderRadius: 1,
                p: 0.75,
                pl: 1,
                pr: 1
              }}
            >
              {attachedFile.extension === 'pdf' ? (
                <PictureAsPdfIcon fontSize="small" sx={{ mr: 1, color: '#e53935' }} />
              ) : attachedFile.extension === 'csv' ? (
                <TableChartIcon fontSize="small" sx={{ mr: 1, color: '#43a047' }} />
              ) : (
                <DescriptionIcon fontSize="small" sx={{ mr: 1, color: '#1e88e5' }} />
              )}
              <Typography variant="body2" noWrap sx={{ mr: 1, maxWidth: 200 }}>
                {attachedFile.name}
              </Typography>
              <IconButton 
                size="small" 
                onClick={handleRemoveFile}
                sx={{ 
                  p: 0.5, 
                  '&:hover': { 
                    bgcolor: 'rgba(0,0,0,0.1)' 
                  } 
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>×</Typography>
              </IconButton>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
              Este arquivo será enviado com a mensagem
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder={activeRunId 
              ? "Aguarde o término da resposta atual..." 
              : "Envie uma mensagem... (suporta Markdown)"
            }
            variant="standard"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !isTyping && !activeRunId && hasApiKey()) {
                  handleSendMessage(e);
                }
              }
            }}
            multiline
            maxRows={4}
            sx={{ flexGrow: 1, mr: 1 }}
            InputProps={{ 
              disableUnderline: true,
              sx: activeRunId ? { opacity: 0.6 } : {}
            }}
            disabled={isTyping || activeRunId || !hasApiKey()}
          />
          
          <Tooltip title="Anexar arquivo (PDF, CSV, TXT, Markdown)">
            <span>
              <IconButton
                color="default"
                onClick={handleOpenFileSelector}
                disabled={isTyping || activeRunId || !hasApiKey() || uploadingFile || !!attachedFile}
                sx={{ mr: 0.5, opacity: activeRunId ? 0.5 : 1 }}
              >
                <AttachFileIcon />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title={activeRunId 
            ? "Aguarde o término da resposta atual" 
            : (!input.trim() && attachedFile ? "Enviar arquivo anexado" : "Enviar mensagem")
          }>
            <span>
              <IconButton 
                color="primary" 
                aria-label="enviar mensagem" 
                onClick={handleSendMessage}
                disabled={(!input.trim() && !attachedFile) || isTyping || activeRunId || !hasApiKey()}
                sx={{ 
                  bgcolor: (!input.trim() && attachedFile) ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                  opacity: activeRunId ? 0.5 : 1
                }}
              >
                <SendIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        
        {/* Input de arquivo invisível */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.csv,.txt,.md,.markdown,application/pdf,text/csv,text/plain,text/markdown"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
          multiple={false}
        />
      </Paper>
      
      {/* Snackbar para notificações */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
      />
      
      {/* Diálogo de configurações */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        aria-labelledby="settings-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="settings-dialog-title">
          Configurações do Chat
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3, mt: 1 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="model-label">Modelo</InputLabel>
              <Select
                labelId="model-label"
                value={selectedModel}
                label="Modelo"
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {AVAILABLE_MODELS.map(model => (
                  <MenuItem key={model.id} value={model.id}>
                    <Box>
                      <Typography variant="body1">{model.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {model.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="System Prompt"
              fullWidth
              multiline
              rows={4}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              helperText="Este prompt define como o assistente deve se comportar. Alterar isso reiniciará a conversa."
            />
          </Box>
          
          <Alert severity="info">
            Alterações no System Prompt irão reiniciar a conversa atual.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveSettings} variant="contained" color="primary">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de confirmação para reiniciar conversa */}
      <Dialog
        open={confirmResetOpen}
        onClose={handleCloseResetConfirm}
        aria-labelledby="reset-dialog-title"
      >
        <DialogTitle id="reset-dialog-title" sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon color="warning" sx={{ mr: 1 }} />
          Reiniciar conversa?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Isso irá apagar todas as mensagens e iniciar uma nova conversa.
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResetConfirm} color="primary">
            Cancelar
          </Button>
          <Button 
            onClick={handleResetConversation} 
            color="primary" 
            variant="contained"
            startIcon={isResettingThread ? <CircularProgress size={16} color="inherit" /> : null}
            disabled={isResettingThread}
          >
            {isResettingThread ? 'Reiniciando...' : 'Reiniciar conversa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PromptChat;