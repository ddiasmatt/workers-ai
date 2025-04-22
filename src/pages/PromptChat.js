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
  InputLabel,
  Card,
  CardContent,
  CardActions,
  Slider,
  Menu,
  ListItemIcon,
  Switch,
  FormControlLabel
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
import TuneIcon from '@mui/icons-material/Tune';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { 
  hasApiKey, 
  uploadFile,
  ConversationManager,
  sendMessageWithStreaming,
  retrieveFileContent
} from '../services/prompt';

// Modelos disponíveis
const AVAILABLE_MODELS = [
  // Novos modelos (últimos lançamentos)
  { id: 'gpt-o3', name: 'GPT-o3 🔥', description: 'Novo modelo otimizado com funções avançadas', contextWindow: 256000, maxOutputTokens: 32768 },
  { id: 'gpt-4.5', name: 'GPT-4.5 🔥', description: 'Melhor conhecimento e capacidades de linguagem', contextWindow: 256000, maxOutputTokens: 16384 },
  { id: 'gpt-4.1', name: 'GPT-4.1 🔥', description: 'Modelo avançado com melhor raciocínio', contextWindow: 32768, maxOutputTokens: 8192 },
  
  // Modelos recentes
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Performance multimodal otimizada', contextWindow: 128000, maxOutputTokens: 4096 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Versão mais rápida e econômica do GPT-4o', contextWindow: 128000, maxOutputTokens: 4096 },
  { id: 'gpt-4-1106-preview', name: 'GPT-4 Turbo Preview', description: 'Versão prévia com conhecimento mais recente', contextWindow: 128000, maxOutputTokens: 4096 },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'GPT-4 otimizado para performance', contextWindow: 128000, maxOutputTokens: 4096 },
  
  // Modelos anteriores GPT-4
  { id: 'gpt-4', name: 'GPT-4', description: 'Preciso e confiável', contextWindow: 8192, maxOutputTokens: 2048 },
  { id: 'gpt-4-32k', name: 'GPT-4 32K', description: 'GPT-4 com contexto ampliado', contextWindow: 32768, maxOutputTokens: 4096 },
  
  // Modelos GPT-3.5
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Rápido e econômico', contextWindow: 16385, maxOutputTokens: 2048 },
  { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16K', description: 'Contexto ampliado', contextWindow: 16385, maxOutputTokens: 2048 }
];

// Ferramentas disponíveis
const AVAILABLE_TOOLS = [
  { 
    id: 'code_interpreter', 
    name: 'Interpretador de Código', 
    description: 'Executa código Python para análises e cálculos',
    type: 'code_interpreter',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-4-32k', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-1106-preview', 'gpt-4.1', 'gpt-4.5', 'gpt-o3'] 
  },
  { 
    id: 'retrieval', 
    name: 'Recuperação de Conhecimento', 
    description: 'Pesquisa informações em arquivos anexados',
    type: 'retrieval',
    models: ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-4', 'gpt-4-turbo', 'gpt-4-32k', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-1106-preview', 'gpt-4.1', 'gpt-4.5', 'gpt-o3'] 
  },
  { 
    id: 'web_browsing', 
    name: 'Navegação Web', 
    description: 'Acessa e resume conteúdo da web',
    type: 'web_browsing',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-4-32k', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-1106-preview', 'gpt-4.1', 'gpt-4.5', 'gpt-o3'] 
  },
  { 
    id: 'function_calling', 
    name: 'Chamada de Funções', 
    description: 'Estrutura dados para integração com APIs',
    type: 'function',
    models: ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-4', 'gpt-4-turbo', 'gpt-4-32k', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-1106-preview', 'gpt-4.1', 'gpt-4.5', 'gpt-o3'] 
  },
  {
    id: 'vision',
    name: 'Visão Computacional', 
    description: 'Processa e analisa imagens e vídeos',
    type: 'vision',
    models: ['gpt-4o', 'gpt-4.1', 'gpt-4.5', 'gpt-o3']
  },
  {
    id: 'advanced_reasoning',
    name: 'Raciocínio Avançado', 
    description: 'Capacidades avançadas de raciocínio e planejamento',
    type: 'advanced_reasoning',
    models: ['gpt-4.1', 'gpt-4.5', 'gpt-o3']
  }
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
  const [savePresetOpen, setPresetSaveOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState([]);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful assistant. Answer questions clearly and concisely.'
  );
  const [selectedTools, setSelectedTools] = useState([]);
  
  // Estados para gerenciamento de presets
  const [presetManagerOpen, setPresetManagerOpen] = useState(false);
  const [presetToEdit, setPresetToEdit] = useState(null);
  const [presetToDelete, setPresetToDelete] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [presetAnchorEl, setPresetAnchorEl] = useState(null);
  const [currentPreset, setCurrentPreset] = useState(null);
  
  // Referências
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const conversationRef = useRef(new ConversationManager(systemPrompt));
  
  // Carregar presets salvos
  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem('chat_presets');
      if (savedPresets) {
        setPresets(JSON.parse(savedPresets));
      }
    } catch (e) {
      console.error('Error loading presets:', e);
    }
  }, []);
  
  // Inicializar ou carregar conversa
  useEffect(() => {
    const chatId = id || 'default';
    const conversation = conversationRef.current;
    
    // Se temos um ID específico, verificar se é um preset
    if (id && id !== 'default') {
      // Tenta carregar configurações do preset
      try {
        const preset = presets.find(p => p.id === id);
        if (preset) {
          console.log('Carregando preset:', preset.name);
          
          // Atualizar o preset atual
          setCurrentPreset(preset);
          
          // Aplicar configurações do preset
          setSelectedModel(preset.model || 'gpt-3.5-turbo');
          setSystemPrompt(preset.systemPrompt || '');
          setTemperature(preset.temperature || 0.7);
          
          // Ajustar tokens máximos considerando o limite do modelo
          const modelMax = AVAILABLE_MODELS.find(m => m.id === preset.model)?.maxOutputTokens || 4096;
          setMaxTokens(Math.min(preset.maxTokens || 2048, modelMax));
          
          setSelectedTools(preset.tools || []);
          
          // Se o preset tem uma conversa salva
          if (preset.hasConversation) {
            const loaded = conversation.load(chatId);
            if (loaded) {
              loadConversationToUI(conversation);
            } else {
              // Inicializar nova conversa com o system prompt do preset
              conversation.reset(preset.systemPrompt || '');
            }
            return;
          } else {
            // Inicializar nova conversa com o system prompt do preset
            conversation.reset(preset.systemPrompt || '');
          }
        } else {
          setCurrentPreset(null);
          conversation.reset(systemPrompt);
        }
      } catch (e) {
        console.error('Error loading preset:', e);
        setCurrentPreset(null);
        conversation.reset(systemPrompt);
      }
    } else {
      // Se estamos no chat padrão
      setCurrentPreset(null);
      
      // Carregamento padrão se não for um preset ou se o preset não tiver conversa
      const loaded = conversation.load(chatId);
      
      if (loaded) {
        loadConversationToUI(conversation);
      } else {
        // Inicializar nova conversa com o system prompt
        conversation.reset(systemPrompt);
      }
    }
  }, [id, presets]);
  
  // Efeito separado para atualizar o system prompt quando ele é alterado
  useEffect(() => {
    // Só reinicia a conversa se já houver mensagens
    if (messages.length > 0) {
      console.log('Reiniciando conversa com novo system prompt');
      const conversation = conversationRef.current;
      conversation.reset(systemPrompt);
      setMessages([]);
      
      setSnackbar({
        open: true,
        message: 'Conversa reiniciada com o novo system prompt'
      });
    }
  }, [systemPrompt]);
  
  // Função auxiliar para carregar conversa para a UI
  const loadConversationToUI = (conversation) => {
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
  };
  
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
        // Preparar opções adicionais com base nas ferramentas selecionadas
        const apiOptions = {
          temperature: temperature,
          max_tokens: maxTokens
        };
        
        // Adicionar ferramentas se houver alguma selecionada
        if (selectedTools.length > 0) {
          // Converter IDs de ferramentas para o formato da API
          const tools = selectedTools.map(toolId => {
            const tool = AVAILABLE_TOOLS.find(t => t.id === toolId);
            if (tool) {
              return { type: tool.type };
            }
            return null;
          }).filter(Boolean); // Remover itens nulos
          
          if (tools.length > 0) {
            apiOptions.tools = tools;
          }
        }
        
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
          },
          apiOptions
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
  
  // Abrir diálogo para salvar preset
  const handleOpenSavePreset = () => {
    setPresetName('');
    setPresetSaveOpen(true);
  };
  
  // Salvar preset atual
  const handleSavePreset = () => {
    if (!presetName.trim()) {
      setSnackbar({
        open: true,
        message: 'Por favor, informe um nome para o preset'
      });
      return;
    }
    
    try {
      let updatedPresets;
      let presetId;
      let isEditing = false;
      
      // Verificar se estamos editando um preset existente
      if (presetToEdit) {
        // Estamos editando um preset existente
        presetId = presetToEdit.id;
        isEditing = true;
        
        // Atualizar o preset existente
        updatedPresets = presets.map(p => {
          if (p.id === presetId) {
            // Manter dados que não devem ser alterados
            const hasConversation = p.hasConversation;
            const lastUpdated = new Date().toISOString();
            const createdAt = p.createdAt;
            
            return {
              ...p,
              name: presetName.trim(),
              model: selectedModel,
              systemPrompt: systemPrompt,
              temperature: temperature,
              maxTokens: maxTokens,
              tools: selectedTools,
              lastUpdated,
              // Preservar status da conversa
              hasConversation
            };
          }
          return p;
        });
      } else {
        // Criando um novo preset
        presetId = `preset_${Date.now()}`;
        
        // Criar objeto do preset
        const newPreset = {
          id: presetId,
          name: presetName.trim(),
          model: selectedModel,
          systemPrompt: systemPrompt,
          temperature: temperature,
          maxTokens: maxTokens,
          tools: selectedTools,
          createdAt: new Date().toISOString(),
          hasConversation: false // Inicialmente não tem conversa salva
        };
        
        // Adicionar à lista de presets
        updatedPresets = [...presets, newPreset];
      }
      
      // Atualizar estado e localStorage
      setPresets(updatedPresets);
      localStorage.setItem('chat_presets', JSON.stringify(updatedPresets));
      
      // Fechar diálogo e notificar
      setPresetSaveOpen(false);
      setPresetToEdit(null); // Limpar estado de edição
      
      setSnackbar({
        open: true,
        message: isEditing 
          ? `Preset "${presetName}" atualizado com sucesso` 
          : `Preset "${presetName}" salvo com sucesso`
      });
      
      // Navegar para o preset
      navigate(`/prompt-chat/${presetId}`);
    } catch (e) {
      console.error('Error saving preset:', e);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar preset: ' + e.message
      });
    }
  };
  
  // Salvar conversa atual com o preset
  const handleSaveConversationWithPreset = () => {
    if (!id || id === 'default') {
      setSnackbar({
        open: true,
        message: 'Salve primeiro como preset para poder salvar a conversa'
      });
      return;
    }
    
    try {
      // Encontrar o preset atual
      const presetIndex = presets.findIndex(p => p.id === id);
      if (presetIndex === -1) {
        throw new Error('Preset não encontrado');
      }
      
      // Salvar a conversa atual no localStorage com o ID do preset
      conversationRef.current.save(id);
      
      // Marcar o preset como tendo uma conversa salva
      const updatedPresets = [...presets];
      updatedPresets[presetIndex] = {
        ...updatedPresets[presetIndex],
        hasConversation: true,
        lastUpdated: new Date().toISOString()
      };
      
      // Atualizar estado e localStorage
      setPresets(updatedPresets);
      localStorage.setItem('chat_presets', JSON.stringify(updatedPresets));
      
      // Atualizar o preset atual
      setCurrentPreset(updatedPresets[presetIndex]);
      
      setSnackbar({
        open: true,
        message: 'Conversa salva com sucesso'
      });
    } catch (e) {
      console.error('Error saving conversation with preset:', e);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar conversa: ' + e.message
      });
    }
  };
  
  // Abrir o gerenciador de presets
  const handleOpenPresetManager = () => {
    setPresetManagerOpen(true);
  };
  
  // Abrir menu de opções do preset
  const handlePresetMenuClick = (event, preset) => {
    setPresetAnchorEl(event.currentTarget);
    setPresetToEdit(preset);
  };
  
  // Fechar menu de opções do preset
  const handlePresetMenuClose = () => {
    setPresetAnchorEl(null);
    setPresetToEdit(null);
  };
  
  // Editar um preset existente
  const handleEditPreset = () => {
    if (!presetToEdit) return;
    
    // Fechar o menu
    handlePresetMenuClose();
    
    // Abrir o diálogo de edição com os valores preenchidos
    setPresetName(presetToEdit.name);
    setSelectedModel(presetToEdit.model || 'gpt-3.5-turbo');
    setSystemPrompt(presetToEdit.systemPrompt || '');
    setTemperature(presetToEdit.temperature || 0.7);
    setMaxTokens(presetToEdit.maxTokens || 2048);
    setSelectedTools(presetToEdit.tools || []);
    
    // Abrir o diálogo de configurações para edição
    setSettingsOpen(true);
  };
  
  // Confirmar exclusão de um preset
  const handleConfirmDeletePreset = () => {
    if (!presetToEdit) return;
    
    // Fechar o menu e abrir diálogo de confirmação
    handlePresetMenuClose();
    setPresetToDelete(presetToEdit);
    setConfirmDeleteOpen(true);
  };
  
  // Excluir um preset
  const handleDeletePreset = () => {
    if (!presetToDelete) return;
    
    try {
      // Filtrar o preset da lista
      const updatedPresets = presets.filter(p => p.id !== presetToDelete.id);
      
      // Atualizar estado e localStorage
      setPresets(updatedPresets);
      localStorage.setItem('chat_presets', JSON.stringify(updatedPresets));
      
      // Remover dados da conversa associados ao preset
      localStorage.removeItem(`conversation_${presetToDelete.id}`);
      
      // Voltar ao chat padrão se o preset excluído era o atual
      if (id === presetToDelete.id) {
        navigate('/prompt-chat');
      }
      
      setSnackbar({
        open: true,
        message: `Preset "${presetToDelete.name}" excluído com sucesso`
      });
    } catch (e) {
      console.error('Error deleting preset:', e);
      setSnackbar({
        open: true,
        message: 'Erro ao excluir preset: ' + e.message
      });
    } finally {
      // Fechar diálogo de confirmação
      setConfirmDeleteOpen(false);
      setPresetToDelete(null);
    }
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
      position: 'relative',
      bgcolor: 'background.default',
      borderRadius: 1,
      overflow: 'hidden'
    }}>
      {/* Banner de instruções */}
      {!messages.length && (
        <Box sx={{
          bgcolor: 'secondary.light',
          color: 'white',
          p: 2,
          textAlign: 'center',
          fontSize: '1rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1
        }}>
          <SettingsIcon /> Clique no ícone de engrenagem verde para configurar e criar presets
          &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
          <TuneIcon /> Clique no ícone roxo para gerenciar seus presets salvos
        </Box>
      )}
      
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
          
          <Tooltip title="Configurações do chat">
            <IconButton
              color="primary"
              onClick={handleOpenSettings}
              sx={{ mr: 1, bgcolor: 'rgba(16, 163, 127, 0.1)' }}
            >
              <SettingsIcon fontSize="large" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Gerenciar presets">
            <IconButton
              color="secondary"
              onClick={handleOpenPresetManager}
              sx={{ mr: 1, bgcolor: 'rgba(142, 68, 173, 0.1)' }}
            >
              <TuneIcon fontSize="large" />
            </IconButton>
          </Tooltip>
          
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            <SmartToyIcon />
          </Avatar>
          
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6">
                {currentPreset ? currentPreset.name : 'Chat com IA'}
              </Typography>
              
              {currentPreset && (
                <Tooltip title="Preset configurado">
                  <Chip 
                    icon={<TuneIcon fontSize="small" />}
                    label="Preset" 
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ ml: 1, height: 20, fontSize: '0.6rem' }}
                  />
                </Tooltip>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip 
                label={AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}
                size="small"
                sx={{ fontSize: '0.75rem' }}
              />
              
              {currentPreset?.hasConversation && (
                <Tooltip title="Este preset tem uma conversa salva">
                  <Chip 
                    label="Conversa salva" 
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1, height: 20, fontSize: '0.65rem' }}
                  />
                </Tooltip>
              )}
            </Box>
          </Box>
          
          {currentPreset && (
            <Tooltip title="Salvar conversa atual com este preset">
              <IconButton 
                color="primary" 
                onClick={handleSaveConversationWithPreset}
                disabled={isTyping || activeRunId}
              >
                <SaveIcon />
              </IconButton>
            </Tooltip>
          )}
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
            {/* Seleção de modelo */}
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
                        {model.description} ({model.contextWindow.toLocaleString()} tokens)
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* System Prompt */}
            <TextField
              label="System Prompt"
              fullWidth
              multiline
              rows={6}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              helperText="Este prompt define como o assistente deve se comportar. Alterar isso reiniciará a conversa."
              sx={{ mb: 3 }}
              InputProps={{
                sx: { fontSize: '0.9rem' }
              }}
              variant="outlined"
            />
            
            {/* Botões de modelos de system prompts */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => setSystemPrompt("You are a helpful assistant. Answer questions clearly and concisely.")}
              >
                Assistente Geral
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => setSystemPrompt("You are a programming expert. Help with code, explain concepts clearly, and suggest best practices.")}
              >
                Programação
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => setSystemPrompt("You are a data analysis expert. Help analyze datasets, explain statistical concepts, and suggest visualization techniques.")}
              >
                Análise de Dados
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => setSystemPrompt("You are a creative writing assistant. Help brainstorm ideas, develop characters, and improve storytelling.")}
              >
                Criatividade
              </Button>
            </Box>
            
            {/* Ferramentas */}
            <Typography variant="subtitle1" gutterBottom>
              Ferramentas
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              {AVAILABLE_TOOLS.map(tool => {
                // Verificar se este modelo suporta esta ferramenta
                const isCompatible = tool.models.includes(selectedModel);
                
                return (
                  <FormControlLabel
                    key={tool.id}
                    control={
                      <Switch
                        checked={selectedTools.includes(tool.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTools(prev => [...prev, tool.id]);
                          } else {
                            setSelectedTools(prev => prev.filter(id => id !== tool.id));
                          }
                        }}
                        disabled={!isCompatible}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">{tool.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tool.description}
                          {!isCompatible && ' (não disponível para este modelo)'}
                        </Typography>
                      </Box>
                    }
                    sx={{ 
                      display: 'flex', 
                      mb: 1,
                      opacity: isCompatible ? 1 : 0.6
                    }}
                  />
                );
              })}
            </Box>
            
            {/* Parâmetros avançados */}
            <Typography variant="subtitle1" gutterBottom>
              Parâmetros Avançados
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Temperatura: {temperature.toFixed(1)}
              </Typography>
              <Slider
                value={temperature}
                onChange={(e, newValue) => setTemperature(newValue)}
                min={0.0}
                max={2.0}
                step={0.1}
                marks={[
                  { value: 0.0, label: '0.0' },
                  { value: 0.7, label: '0.7' },
                  { value: 1.0, label: '1.0' },
                  { value: 2.0, label: '2.0' }
                ]}
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" color="text.secondary">
                Valores mais baixos geram respostas mais previsíveis, valores mais altos aumentam a criatividade.
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" gutterBottom>
                Tamanho máximo da resposta: {maxTokens.toLocaleString()} tokens
              </Typography>
              
              {/* Obtém o máximo para o modelo atual */}
              {(() => {
                const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel);
                const maxLimit = currentModel?.maxOutputTokens || 4096;
                const steps = [
                  { value: 256, label: '256' },
                  { value: 1024, label: '1K' },
                  { value: 2048, label: '2K' },
                  { value: 4096, label: '4K' }
                ];
                
                // Adicionar marcadores para limites maiores
                if (maxLimit >= 8192) steps.push({ value: 8192, label: '8K' });
                if (maxLimit >= 16384) steps.push({ value: 16384, label: '16K' });
                if (maxLimit >= 32768) steps.push({ value: 32768, label: '32K' });
                
                // Ajustar valor se o limite selecionado excede o máximo do modelo
                if (maxTokens > maxLimit) {
                  setTimeout(() => setMaxTokens(maxLimit), 0);
                }
                
                return (
                  <Slider
                    value={Math.min(maxTokens, maxLimit)}
                    onChange={(e, newValue) => setMaxTokens(newValue)}
                    min={256}
                    max={maxLimit}
                    step={maxLimit <= 4096 ? 256 : 1024}
                    marks={steps.filter(s => s.value <= maxLimit)}
                    valueLabelDisplay="auto"
                  />
                );
              })()}
              
              <Typography variant="caption" color="text.secondary">
                Limite máximo específico para {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name}: {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.maxOutputTokens.toLocaleString()} tokens
              </Typography>
            </Box>
          </Box>
          
          <Alert severity="info">
            Alterações no System Prompt irão reiniciar a conversa atual.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleOpenSavePreset} 
            color="secondary"
          >
            Salvar como Preset
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setSettingsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveSettings} variant="contained" color="primary">
            Aplicar Configurações
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo para salvar preset */}
      <Dialog
        open={savePresetOpen}
        onClose={() => {
          setPresetSaveOpen(false);
          setPresetToEdit(null);
        }}
        aria-labelledby="save-preset-dialog-title"
      >
        <DialogTitle id="save-preset-dialog-title">
          {presetToEdit ? `Editar Preset "${presetToEdit.name}"` : 'Salvar como Preset'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {presetToEdit 
              ? 'Atualize as configurações deste preset. A conversa salva não será afetada.'
              : 'Salve estas configurações como um preset para reuso futuro. Você poderá acessá-lo pela lista de presets.'}
          </DialogContentText>
          <TextField
            autoFocus
            label="Nome do Preset"
            fullWidth
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPresetSaveOpen(false);
            setPresetToEdit(null);
          }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSavePreset} 
            variant="contained" 
            color="primary"
            startIcon={presetToEdit ? <EditIcon /> : <SaveIcon />}
          >
            {presetToEdit ? 'Atualizar' : 'Salvar'}
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
      
      {/* Diálogo do Gerenciador de Presets */}
      <Dialog
        open={presetManagerOpen}
        onClose={() => setPresetManagerOpen(false)}
        aria-labelledby="preset-manager-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="preset-manager-dialog-title">
          Gerenciador de Configurações
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              Crie e gerencie configurações personalizadas para diferentes tipos de conversa.
              As configurações salvas ficarão disponíveis no menu lateral para rápido acesso.
            </Typography>
          </Box>
          
          {presets.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              bgcolor: 'background.paper',
              borderRadius: 1
            }}>
              <TuneIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Nenhum preset salvo</Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 400, mb: 2 }}>
                Crie um novo preset salvando suas configurações atuais clicando no botão "Configurações".
              </Typography>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => {
                  setPresetManagerOpen(false);
                  setSettingsOpen(true);
                }}
              >
                Configurar e salvar
              </Button>
            </Box>
          ) : (
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 2
            }}>
              {presets.map(preset => (
                <Card 
                  key={preset.id} 
                  variant="outlined"
                  sx={{
                    border: preset.id === id 
                      ? '2px solid' 
                      : '1px solid',
                    borderColor: preset.id === id 
                      ? 'primary.main' 
                      : 'divider',
                    position: 'relative'
                  }}
                >
                  {preset.id === id && (
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        right: 0, 
                        bgcolor: 'primary.main',
                        color: 'white',
                        px: 1,
                        py: 0.2,
                        fontSize: '0.65rem',
                        borderBottomLeftRadius: 4
                      }}
                    >
                      Ativo
                    </Box>
                  )}
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography 
                        variant="h6" 
                        component="div" 
                        sx={{ 
                          fontWeight: 500,
                          color: preset.id === id ? 'primary.main' : 'text.primary'
                        }}
                      >
                        {preset.name}
                      </Typography>
                      
                      <IconButton
                        size="small"
                        onClick={(e) => handlePresetMenuClick(e, preset)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    
                    <Divider sx={{ mb: 1 }} />
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {AVAILABLE_MODELS.find(m => m.id === preset.model)?.name || preset.model}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary" 
                      sx={{ 
                        display: 'block', 
                        mb: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%'
                      }}
                    >
                      System Prompt: {preset.systemPrompt?.substring(0, 50) || 'Nenhum prompt configurado'}{preset.systemPrompt?.length > 50 ? '...' : ''}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      {preset.tools && preset.tools.length > 0 ? preset.tools.map(toolId => {
                        const tool = AVAILABLE_TOOLS.find(t => t.id === toolId);
                        return tool ? (
                          <Chip
                            key={toolId}
                            label={tool.name}
                            size="small"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        ) : null;
                      }) : (
                        <Typography variant="caption" color="text.secondary">
                          Sem ferramentas adicionais
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                  <CardActions>
                    {preset.id === id ? (
                      <Button 
                        size="small"
                        variant="contained"
                        color="primary"
                        disabled
                      >
                        Ativo
                      </Button>
                    ) : (
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => {
                          navigate(`/prompt-chat/${preset.id}`);
                          setPresetManagerOpen(false);
                        }}
                      >
                        Usar
                      </Button>
                    )}
                    {preset.hasConversation && (
                      <Chip 
                        label="Conversa salva" 
                        size="small"
                        variant="outlined"
                        sx={{ ml: 'auto', height: 20, fontSize: '0.65rem' }}
                      />
                    )}
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setPresetManagerOpen(false);
              setSettingsOpen(true);
            }} 
            startIcon={<SaveIcon />}
          >
            Salvar atual como preset
          </Button>
          <Button onClick={() => setPresetManagerOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Menu de opções do preset */}
      <Menu
        anchorEl={presetAnchorEl}
        open={Boolean(presetAnchorEl)}
        onClose={handlePresetMenuClose}
      >
        <MenuItem onClick={handleEditPreset}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleConfirmDeletePreset}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Diálogo de confirmação de exclusão de preset */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        aria-labelledby="delete-preset-dialog-title"
      >
        <DialogTitle id="delete-preset-dialog-title" sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon color="error" sx={{ mr: 1 }} />
          Excluir preset?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Você está prestes a excluir o preset "{presetToDelete?.name}".
            {presetToDelete?.hasConversation && ' A conversa salva com este preset também será excluída.'}
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)} color="primary">
            Cancelar
          </Button>
          <Button 
            onClick={handleDeletePreset} 
            color="error" 
            variant="contained"
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PromptChat;