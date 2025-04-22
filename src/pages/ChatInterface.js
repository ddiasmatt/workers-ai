import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AssistantsContext } from '../contexts/AssistantsContext';
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
  DialogActions
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
import { 
  hasApiKey, 
  createThread, 
  deleteThread,
  addMessage, 
  addMessageWithFile,
  uploadFile,
  runAssistantWithStreaming, 
  listMessages 
} from '../services/openai';

const ChatInterface = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAssistant, openApiKeyDialog, GPT_MODELS } = useContext(AssistantsContext);
  
  // Função para obter detalhes do modelo
  const getModelDetails = (modelId) => {
    return GPT_MODELS.find(model => model.id === modelId) || { 
      name: modelId, 
      description: 'Modelo OpenAI' 
    };
  };
  const [assistant, setAssistant] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeRunId, setActiveRunId] = useState(null);
  const [error, setError] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isResettingThread, setIsResettingThread] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Carregar assistente
  useEffect(() => {
    const loadedAssistant = getAssistant(id);
    if (loadedAssistant) {
      setAssistant(loadedAssistant);
      
      // Carregar ou criar thread para o chat
      const savedThreadId = localStorage.getItem(`thread_${id}`);
      if (savedThreadId) {
        setThreadId(savedThreadId);
        loadMessages(savedThreadId);
      } else {
        initializeThread();
      }
    }
  }, [id, getAssistant]);

  // Inicializar thread para o chat
  const initializeThread = async () => {
    if (!hasApiKey()) {
      openApiKeyDialog();
      return;
    }
    
    try {
      const thread = await createThread();
      setThreadId(thread.id);
      localStorage.setItem(`thread_${id}`, thread.id);
    } catch (err) {
      setError('Erro ao criar thread: ' + (err.message || 'Erro desconhecido'));
      console.error('Error creating thread:', err);
    }
  };

  // Carregar mensagens do thread
  const loadMessages = async (threadId) => {
    if (!hasApiKey()) {
      openApiKeyDialog();
      return;
    }
    
    try {
      const threadMessages = await listMessages(threadId);
      
      // Converter as mensagens da API para o formato local
      const formattedMessages = threadMessages.map(msg => {
        // Extrair texto e anexos da mensagem
        let messageContent = '';
        let attachedFile = null;
        
        // Processar array de conteúdo
        if (msg.content && Array.isArray(msg.content)) {
          // Extrair texto
          const textContents = msg.content.filter(item => item.type === 'text');
          if (textContents.length > 0) {
            messageContent = textContents.map(item => item.text.value).join(' ');
          }
          
          // Extrair anexos
          const fileAttachments = msg.content.filter(item => item.type === 'file_attachment');
          if (fileAttachments.length > 0) {
            attachedFile = {
              id: fileAttachments[0].file_id,
              name: 'Arquivo anexado' // A API não retorna o nome do arquivo, apenas o ID
            };
          }
        } else if (typeof msg.content === 'string') {
          // Fallback para formato antigo
          messageContent = msg.content;
        }
        
        return {
          role: msg.role,
          content: messageContent || 'Conteúdo não suportado',
          timestamp: msg.created_at,
          ...(attachedFile ? { attachedFile } : {})
        };
      }).reverse(); // Reverter para mostrar as mais recentes por último
      
      setMessages(formattedMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
      
      // Tentar carregar mensagens do localStorage como fallback
      const savedMessages = localStorage.getItem(`chat_${id}`);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    }
  };

  // Rolar para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Salvar mensagens no localStorage como backup
  useEffect(() => {
    if (messages.length > 0 && id) {
      localStorage.setItem(`chat_${id}`, JSON.stringify(messages));
    }
  }, [messages, id]);

  // Enviar mensagem
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || !assistant || isTyping || activeRunId) return;
    
    if (!hasApiKey()) {
      openApiKeyDialog();
      return;
    }
    
    if (!threadId) {
      await initializeThread();
      if (!threadId) {
        setSnackbar({
          open: true,
          message: 'Não foi possível criar thread. Verifique sua chave de API.'
        });
        return;
      }
    }

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      // Se existir um arquivo, adicionar ao objeto de mensagem do usuário
      ...(attachedFile ? { attachedFile } : {})
    };

    // Armazenar o arquivo temporariamente antes de limpar
    const fileToSend = attachedFile;
    
    // Limpar o input e o arquivo anexado imediatamente para evitar duplicação
    setInput('');
    setAttachedFile(null);
    
    // Limpar mensagens "Pensando..." existentes e adicionar a nova sequência
    setMessages(prev => {
      // Remover qualquer mensagem "Pensando..." anterior
      const cleanedMessages = prev.filter(msg => !msg.isThinking);
      
      // Adicionar a nova mensagem do usuário e a nova "Pensando..."
      return [...cleanedMessages, userMessage, {
        role: 'assistant',
        content: 'Pensando...',
        timestamp: new Date().toISOString(),
        isStreaming: true,
        isThinking: true
      }];
    });
    
    setIsTyping(true);
    setError(null);

    try {
      // Adicionar um aviso sobre a limitação na API para arquivos
      let messageToSend = userMessage.content;
      
      // Se tem um arquivo, adicionar uma nota sobre o arquivo
      if (fileToSend) {
        // Adicionar informação sobre o arquivo na mensagem
        messageToSend = messageToSend ? 
          `${messageToSend}\n\n[Arquivo anexado: ${fileToSend.name}]` : 
          `[Arquivo anexado: ${fileToSend.name}]`;
          
        // Avisar o usuário sobre a limitação
        setSnackbar({
          open: true,
          message: 'Arquivos anexados estão disponíveis para o assistente no documento, mas não são exibidos diretamente no chat.'
        });
      }
      
      // Enviar a mensagem de texto
      await addMessage(threadId, messageToSend);
      
      // Iniciar o streaming da resposta
      let currentAssistantMessage = '';
      
      try {
        const streamController = await runAssistantWithStreaming(
          threadId,
          assistant.id,
          {
            onData: (data) => {
              console.log("Received streaming data:", data);
              
              // Processar diferentes tipos de eventos
              if (data.event === 'thread.run.status') {
                // Atualização de status do run
                console.log("Status atualizado:", data.data.status);
                
                // Se o run precisar de ação, mostrar isso na interface
                if (data.data.status === 'requires_action') {
                  // Implementar lógica para ações necessárias
                  console.log("Run requer ação:", data.data.required_action);
                }
                
                // Se o run estiver em processamento, garantir que o estado de typing esteja ativo
                if (['in_progress', 'queued', 'created'].includes(data.data.status)) {
                  setIsTyping(true);
                  
                  // Definir o run como ativo quando começar
                  if (data.data.status === 'created' && data.data.run_id) {
                    setActiveRunId(data.data.run_id);
                  } else if (data.data.run_id) {
                    // Manter o run ID atualizado
                    setActiveRunId(data.data.run_id);
                  }
                  
                  // Adicionar mensagem de "Pensando..." se ainda não existir uma mensagem de resposta
                  setMessages(prev => {
                    // Verificar se já existe uma mensagem do assistente em resposta à última mensagem do usuário
                    const hasAssistantResponse = prev.some(msg => 
                      msg.role === 'assistant' && msg.isStreaming
                    );
                    
                    if (!hasAssistantResponse) {
                      return [...prev, {
                        role: 'assistant',
                        content: data.data.status === 'queued' ? 'Preparando resposta...' : 'Pensando...',
                        timestamp: new Date().toISOString(),
                        isStreaming: true,
                        isThinking: true
                      }];
                    }
                    
                    return prev;
                  });
                }
              } 
              else if (data.event === 'thread.message.content') {
                // Atualização em tempo real do conteúdo
                // Atualizar o conteúdo da mensagem atual
                currentAssistantMessage = data.data.content;
                const deltaText = data.data.delta || ''; // Nova parte do texto que foi adicionada
                
                // Atualizar a mensagem na interface em tempo real, substituindo a mensagem de "Pensando..."
                setMessages(prev => {
                  // Encontrar mensagem atual do assistente ou criar uma nova
                  const messageIndex = prev.findIndex(msg => 
                    msg.role === 'assistant' && (msg.isThinking || msg.isStreaming)
                  );
                  
                  if (messageIndex !== -1) {
                    // Atualizar a mensagem existente
                    const updatedMessages = [...prev];
                    updatedMessages[messageIndex] = {
                      ...updatedMessages[messageIndex],
                      content: currentAssistantMessage,
                      lastDelta: deltaText, // Armazenar o delta para potenciais animações
                      isThinking: false,
                      isStreaming: true,
                      timestamp: new Date().toISOString()
                    };
                    return updatedMessages;
                  } else {
                    // Criar uma nova mensagem do assistente
                    return [
                      ...prev,
                      {
                        role: 'assistant',
                        content: currentAssistantMessage,
                        lastDelta: deltaText,
                        timestamp: new Date().toISOString(),
                        isStreaming: true
                      }
                    ];
                  }
                });
              }
              else if (data.event === 'thread.message.completed') {
                // Quando uma mensagem é completada
                if (data.data?.message?.content && data.data.message.content.length > 0) {
                  const messageContent = data.data.message.content;
                  let textContent = '';
                  
                  // Extrair conteúdo de texto da mensagem
                  for (const content of messageContent) {
                    if (content.type === 'text' && content.text && content.text.value) {
                      textContent += content.text.value || '';
                    }
                  }
                  
                  if (textContent) {
                    // Adicionar o conteúdo à mensagem atual
                    currentAssistantMessage = textContent;
                    
                    // Atualizar a mensagem na interface, marcando como completa
                    setMessages(prev => {
                      const messageIndex = prev.findIndex(msg => 
                        msg.role === 'assistant' && msg.isStreaming
                      );
                      
                      if (messageIndex !== -1) {
                        // Atualizar a mensagem existente
                        const updatedMessages = [...prev];
                        updatedMessages[messageIndex] = {
                          ...updatedMessages[messageIndex],
                          content: currentAssistantMessage,
                          isStreaming: false,
                          isThinking: false
                        };
                        return updatedMessages;
                      } else {
                        // Criar uma nova mensagem do assistente (raro, mas possível)
                        return [
                          ...prev,
                          {
                            role: 'assistant',
                            content: currentAssistantMessage,
                            timestamp: new Date().toISOString(),
                            isStreaming: false
                          }
                        ];
                      }
                    });
                  }
                }
              }
              else if (data.event === 'thread.run.completed') {
                // Run completo - limpar o ID do run ativo
                setActiveRunId(null);
                setIsTyping(false);
              }
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
                    isStreaming: false
                  };
                  return updatedMessages;
                }
                
                return prev;
              });
              
              // Limpar run ativo
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
        
        // Armazenar o controlador de streaming para possível cancelamento
        return streamController;
      } catch (streamError) {
        console.error('Error starting streaming:', streamError);
        setError('Erro ao iniciar streaming: ' + (streamError.message || 'Erro desconhecido'));
        setIsTyping(false);
        setActiveRunId(null);
        throw streamError;
      }
      
      // Removido o setTimeout redundante, pois já adicionamos a mensagem "Pensando..." imediatamente
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Erro ao obter resposta: ' + (err.message || 'Erro desconhecido'));
      setIsTyping(false);
      
      // Substituir a mensagem "Pensando..." por uma mensagem de erro
      setMessages(prev => {
        const newMessages = [...prev];
        // Encontrar a mensagem "Pensando..."
        const thinkingIndex = newMessages.findIndex(
          msg => msg.role === 'assistant' && msg.isThinking
        );
        
        if (thinkingIndex > -1) {
          // Substituir por mensagem de erro
          newMessages[thinkingIndex] = {
            role: 'assistant',
            content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
            timestamp: new Date().toISOString(),
            isError: true,
            isStreaming: false,
            isThinking: false
          };
        } else {
          // Caso não encontre a mensagem "Pensando...", adicionar uma nova
          newMessages.push({
            role: 'assistant',
            content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
            timestamp: new Date().toISOString(),
            isError: true
          });
        }
        
        return newMessages;
      });
    }
  };

  // Fechar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Abrir diálogo de confirmação para reiniciar thread
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
  
  // Reiniciar thread
  const handleResetThread = async () => {
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
      // Se existe um thread, tentar deletá-lo primeiro
      if (threadId) {
        try {
          await deleteThread(threadId);
          console.log(`Thread ${threadId} deleted successfully.`);
        } catch (err) {
          console.warn(`Error deleting thread ${threadId}:`, err);
          // Não bloquear o fluxo se falhar ao deletar
        }
      }
      
      // Criar novo thread
      const newThread = await createThread();
      setThreadId(newThread.id);
      
      // Atualizar localStorage
      localStorage.setItem(`thread_${id}`, newThread.id);
      
      // Limpar mensagens
      setMessages([]);
      
      // Limpar localStorage de mensagens
      localStorage.removeItem(`chat_${id}`);
      
      setSnackbar({
        open: true,
        message: 'Conversa reiniciada com sucesso!'
      });
    } catch (err) {
      console.error('Error resetting thread:', err);
      setError('Erro ao reiniciar conversa: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsResettingThread(false);
      handleCloseResetConfirm();
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
    // pois a OpenAI API atualmente tem limitações em relação a múltiplos arquivos em mensagens
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
          message: 'Apenas o primeiro arquivo será usado na mensagem. Para enviar mais arquivos, use o modo de edição do assistente.'
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

  if (!assistant) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="error">
          Assistente não encontrado
          <Button sx={{ ml: 2 }} onClick={() => navigate('/')}>
            Voltar para Home
          </Button>
        </Alert>
      </Box>
    );
  }

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
      {/* Cabeçalho do chat */}
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
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            <SmartToyIcon />
          </Avatar>
          <Box>
            <Typography variant="h6">{assistant.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <Tooltip title={getModelDetails(assistant.model).description}>
                <Chip 
                  label={getModelDetails(assistant.model).name}
                  size="small"
                  sx={{ 
                    mr: 1, 
                    fontSize: '0.7rem',
                    bgcolor: assistant.model.startsWith('gpt-4') ? 'rgba(75, 0, 130, 0.1)' : 'rgba(0, 120, 212, 0.1)',
                    borderColor: assistant.model.startsWith('gpt-4') ? 'rgba(75, 0, 130, 0.5)' : 'rgba(0, 120, 212, 0.5)',
                    borderWidth: 1,
                    borderStyle: 'solid'
                  }}
                />
              </Tooltip>
              {assistant.tools && assistant.tools.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {assistant.tools.length} ferramenta{assistant.tools.length > 1 ? 's' : ''} ativa{assistant.tools.length > 1 ? 's' : ''}
                </Typography>
              )}
            </Box>
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
            <Typography variant="h5" gutterBottom component="div">
              {assistant?.name || 'Assistente'}
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 500 }} component="div">
              {assistant?.instructions 
                ? `${assistant.instructions.substring(0, 150)}...` 
                : 'Nenhuma instrução definida'}
            </Typography>
            
            <Box sx={{ 
              mt: 4, 
              p: 2, 
              bgcolor: 'rgba(0,0,0,0.04)', 
              borderRadius: 2, 
              maxWidth: 600, 
              mx: 'auto',
              border: '1px dashed rgba(0,0,0,0.1)'
            }}>
              <Typography variant="subtitle1" align="center" sx={{ mb: 1 }}>
                Guia rápido de Markdown
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                <Box>
                  <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                    **texto** = <b>texto</b>
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                    *texto* = <i>texto</i>
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                    # Título = <b>Título grande</b>
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                    ## Subtítulo = <b>Subtítulo</b>
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                    - item = lista com marcadores
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                    1. item = lista numerada
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                    `código` = <code>código</code>
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                    > texto = citação
                  </Typography>
                </Box>
              </Box>
            </Box>
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
                  primary={message.role === 'assistant' ? (assistant?.name || 'Assistente') : 'Você'}
                  secondaryTypographyProps={{ component: 'div' }}
                  secondary={
                    <Box>
                      <Box 
                        sx={{ 
                          mt: 1,
                          color: message.isError ? "error.main" : "text.primary",
                          // Estilos para o markdown renderizado
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
                            components={{
                              a: (props) => <a href={props.href} target="_blank" rel="noopener noreferrer" {...props} />,
                              code: (props) => {
                                const { children, className, ...rest } = props;
                                return (
                                  <code className={className} {...rest}>
                                    {children}
                                  </code>
                                );
                              }
                            }}
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
              Este arquivo será enviado com a mensagem (o assistente terá acesso ao conteúdo)
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder={activeRunId 
              ? "Aguarde o término da resposta atual..." 
              : "Envie uma mensagem... O assistente suporta Markdown para formatação!"
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
          
          <Tooltip title="Anexar arquivo (PDF, CSV, TXT, Markdown) - O arquivo será disponibilizado para o assistente, mas não será visível diretamente no chat">
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
        
        {/* Input de arquivo invisível com suporte a múltiplos arquivos */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.csv,.txt,.md,.markdown,application/pdf,text/csv,text/plain,text/markdown"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
          multiple  // Permitir seleção de múltiplos arquivos
        />
      </Paper>
      
      {/* Snackbar para notificações */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
      />
      
      {/* Diálogo de confirmação para reiniciar thread */}
      <Dialog
        open={confirmResetOpen}
        onClose={handleCloseResetConfirm}
        aria-labelledby="reset-thread-dialog-title"
      >
        <DialogTitle id="reset-thread-dialog-title" sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon color="warning" sx={{ mr: 1 }} />
          Reiniciar conversa?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Isso irá apagar todas as mensagens e iniciar uma nova conversa com o assistente.
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResetConfirm} color="primary">
            Cancelar
          </Button>
          <Button 
            onClick={handleResetThread} 
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

export default ChatInterface;