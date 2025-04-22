import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AssistantsContext } from '../contexts/AssistantsContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  CircularProgress,
  Alert,
  Stack,
  ListSubheader,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Modal,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseIcon from '@mui/icons-material/Close';
import MarkdownIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import { 
  uploadFile, 
  listAssistantFiles, 
  createVectorStore, 
  listVectorStores, 
  linkVectorStoreToAssistant 
} from '../services/openai';

// Ferramentas disponíveis para assistentes
const AVAILABLE_TOOLS = [
  { id: 'code_interpreter', name: 'Code Interpreter', description: 'Executa código Python para análise de dados e programação' },
  { id: 'file_search', name: 'File Search', description: 'Consulta documentos e arquivos enviados para o assistente' },
  { id: 'function', name: 'Function Calling', description: 'Permite que o assistente chame APIs e funções externas' },
];

const EditAssistant = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getAssistant, updateAssistant, isLoading, GPT_MODELS } = useContext(AssistantsContext);
  
  const [formData, setFormData] = useState({
    name: '',
    instructions: '',
    model: '',
    tools: [],
    files: []
  });
  
  // Agrupar modelos por categoria
  const groupedModels = {
    gpt4Series: GPT_MODELS.filter(model => model.id.startsWith('gpt-4')),
    gpt35Series: GPT_MODELS.filter(model => model.id.startsWith('gpt-3.5')),
  };
  
  const [errors, setErrors] = useState({});
  const [notFound, setNotFound] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef(null);
  
  // Estados para o vector store
  const [vectorStoreEnabled, setVectorStoreEnabled] = useState(false);
  const [vectorStores, setVectorStores] = useState([]);
  const [selectedVectorStore, setSelectedVectorStore] = useState('');
  const [vectorStoreStatus, setVectorStoreStatus] = useState('');
  const [isCreatingVectorStore, setIsCreatingVectorStore] = useState(false);
  const [vectorStoreModalOpen, setVectorStoreModalOpen] = useState(false);
  const [newVectorStoreName, setNewVectorStoreName] = useState('');
  
  // Funções para o modal de instruções
  const handleOpenInstructionsModal = () => setInstructionsModalOpen(true);
  const handleCloseInstructionsModal = () => setInstructionsModalOpen(false);
  const togglePreviewMode = () => setPreviewMode(!previewMode);
  
  // Carregar dados do assistente ao iniciar
  useEffect(() => {
    const assistant = getAssistant(id);
    if (assistant) {
      // Normalizar o formato das ferramentas
      let normalizedTools = [];
      
      if (assistant.tools && Array.isArray(assistant.tools)) {
        normalizedTools = assistant.tools.map(tool => {
          // Se a ferramenta for um objeto com campo 'type', extrair o type
          if (typeof tool === 'object' && tool.type) {
            return tool.type;
          }
          // Se já for uma string, usar diretamente
          return tool;
        });
      }
      
      // Verificar se as instruções já contêm referência ao Markdown
      const hasMarkdownReference = (assistant.instructions || '').toLowerCase().includes('markdown');
      
      setFormData({
        name: assistant.name,
        instructions: hasMarkdownReference 
          ? assistant.instructions 
          : 'Você pode usar Markdown para formatar suas respostas (negrito, itálico, títulos, listas, código, etc.). Use essa funcionalidade para organizar suas respostas de forma clara e atraente.\n\n' + 
            (assistant.instructions || ''),
        model: assistant.model,
        tools: normalizedTools,
        files: assistant.files || []
      });
    } else {
      setNotFound(true);
    }
  }, [id, getAssistant]);
  
  // Validar formulário antes de enviar
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.instructions.trim()) newErrors.instructions = 'Instruções são obrigatórias';
    if (!formData.model) newErrors.model = 'Modelo é obrigatório';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Lidar com mudanças nos campos
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Limpar erro quando campo é alterado
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };
  
  // Lidar com mudanças nas ferramentas selecionadas
  const handleToolsChange = (event) => {
    const {
      target: { value },
    } = event;
    setFormData({
      ...formData,
      tools: typeof value === 'string' ? value.split(',') : value,
    });
  };
  
  // Abrir o seletor de arquivo
  const handleOpenFileSelector = () => {
    fileInputRef.current?.click();
  };
  
  // Processar múltiplos arquivos selecionados
  const handleFileSelected = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingFile(true);
    setUploadStatus(`Enviando ${files.length} arquivo(s)...`);
    
    // Array para armazenar todos os IDs de arquivos carregados
    const uploadedFileIds = [];
    const uploadedFiles = [];
    const failedFiles = [];
    
    // Usando Promise.all para processar os arquivos em paralelo
    try {
      const { addFilesToVectorStore } = await import('../services/openai');
      
      // Processar arquivos um a um para fornecer feedback melhor
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Verificar o tipo de arquivo (permitir apenas PDF, CSV, TXT, Markdown)
        const allowedTypes = ['application/pdf', 'text/csv', 'text/plain', 'text/markdown'];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        
        if (!allowedTypes.includes(file.type) && 
            !['pdf', 'csv', 'txt', 'md', 'markdown'].includes(fileExtension)) {
          failedFiles.push({
            name: file.name,
            reason: 'Tipo de arquivo não suportado'
          });
          continue; // Pular para o próximo arquivo
        }
        
        try {
          setUploadStatus(`Enviando arquivo ${i+1}/${files.length}: ${file.name}`);
          
          // 1. Upload do arquivo para o sistema
          const response = await uploadFile(file);
          console.log(`Arquivo ${i+1}/${files.length} carregado:`, response);
          
          // 2. Adicionar o arquivo à lista de uploads bem-sucedidos
          const newFile = {
            id: response.id,
            name: file.name,
            type: file.type,
            extension: fileExtension
          };
          
          uploadedFiles.push(newFile);
          uploadedFileIds.push(response.id);
        } catch (err) {
          console.error(`Error uploading file ${file.name}:`, err);
          failedFiles.push({
            name: file.name,
            reason: err.message || 'Erro desconhecido'
          });
        }
      }
      
      // Adicionar todos os arquivos bem-sucedidos ao estado
      if (uploadedFiles.length > 0) {
        setFormData(prev => ({
          ...prev,
          files: [...prev.files, ...uploadedFiles]
        }));
        
        // Se já existe um vector store selecionado, adicionar os arquivos a ele
        if (vectorStoreEnabled && selectedVectorStore && uploadedFileIds.length > 0) {
          try {
            setUploadStatus('Adicionando arquivos ao vector store...');
            
            await addFilesToVectorStore(selectedVectorStore, uploadedFileIds);
            setUploadStatus(`${uploadedFiles.length} arquivo(s) carregado(s) e indexado(s) com sucesso!`);
          } catch (vectorError) {
            console.error('Error adding files to vector store:', vectorError);
            setUploadStatus(`Arquivos carregados, mas não foram adicionados ao vector store: ${vectorError.message}`);
          }
        } else {
          setUploadStatus(`${uploadedFiles.length} arquivo(s) carregado(s) com sucesso!`);
          
          // Sugerir a criação de um vector store se forem os primeiros arquivos
          if (formData.files.length === 0 && !vectorStoreEnabled) {
            setTimeout(() => {
              setVectorStoreEnabled(true);
              setUploadStatus('Ative o Vector Store para indexar seus arquivos e permitir pesquisas.');
            }, 1000);
          }
        }
      }
      
      // Informar sobre arquivos que falharam
      if (failedFiles.length > 0) {
        console.error('Failed files:', failedFiles);
        if (uploadedFiles.length > 0) {
          setUploadStatus(`${uploadedFiles.length} arquivo(s) carregado(s), mas ${failedFiles.length} falhou(aram).`);
        } else {
          setUploadStatus(`Falha ao carregar todos os ${failedFiles.length} arquivo(s).`);
        }
      }
    } catch (err) {
      console.error('Error processing files:', err);
      setUploadStatus(`Erro ao processar arquivos: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setUploadingFile(false);
      // Limpar o input para permitir selecionar os mesmos arquivos novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Remover um arquivo da lista
  const handleRemoveFile = async (fileId) => {
    // Remover arquivo do estado
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter(file => file.id !== fileId)
    }));
    
    // Se existe um vector store selecionado, remover o arquivo dele também
    if (vectorStoreEnabled && selectedVectorStore) {
      try {
        setUploadStatus('Removendo arquivo do sistema...');
        // Não temos API para remover um arquivo específico de um vector store
        // Futuramente, podemos implementar essa funcionalidade
        
        setUploadStatus('Arquivo removido. Nota: O arquivo pode ainda estar presente no vector store.');
      } catch (err) {
        console.error('Error related to vector store on file removal:', err);
        setUploadStatus('Arquivo removido do assistente.');
      }
    } else {
      setUploadStatus('Arquivo removido');
    }
  };
  
  // Carregar vector stores disponíveis
  useEffect(() => {
    const loadVectorStores = async () => {
      try {
        setVectorStoreStatus('Carregando vector stores...');
        const stores = await listVectorStores();
        setVectorStores(stores);
        console.log('Vector stores loaded:', stores);
        setVectorStoreStatus('');
      } catch (err) {
        console.error('Error loading vector stores:', err);
        setVectorStoreStatus('Erro ao carregar vector stores.');
      }
    };
    
    if (vectorStoreEnabled) {
      loadVectorStores();
    }
  }, [vectorStoreEnabled]);
  
  // Funções para o modal de vector store
  const handleOpenVectorStoreModal = () => setVectorStoreModalOpen(true);
  const handleCloseVectorStoreModal = () => setVectorStoreModalOpen(false);
  
  // Criar um novo vector store
  const handleCreateVectorStore = async () => {
    if (!newVectorStoreName.trim()) {
      setVectorStoreStatus('Nome do vector store é obrigatório');
      return;
    }
    
    if (formData.files.length === 0) {
      setVectorStoreStatus('É necessário ter pelo menos um arquivo para criar um vector store');
      return;
    }
    
    try {
      setIsCreatingVectorStore(true);
      setVectorStoreStatus('Criando vector store...');
      
      // Garantir que temos acesso às funções
      const { addFilesToVectorStore } = await import('../services/openai');
      
      // 1. Extrair IDs dos arquivos
      const fileIds = formData.files.map(file => file.id);
      console.log(`Criando vector store "${newVectorStoreName}" com ${fileIds.length} arquivos:`, fileIds);
      
      // 2. Criar o vector store com os arquivos
      const result = await createVectorStore(
        newVectorStoreName,
        fileIds
      );
      
      console.log('Vector store created:', result);
      
      // 3. Verificar se o vector store foi criado com arquivos
      if (!result.file_ids || result.file_ids.length === 0) {
        console.warn('Vector store created but appears to have no files. Trying to add files explicitly...');
        
        try {
          // Se não houver arquivos, tentar adicioná-los explicitamente
          const addResult = await addFilesToVectorStore(result.id, fileIds);
          console.log('Files added to vector store explicitly:', addResult);
        } catch (addError) {
          console.error('Error adding files to vector store explicitly:', addError);
          // Continuar mesmo se falhar aqui, o vector store foi criado
        }
      }
      
      // 4. Verificar explicitamente se o vector store tem os arquivos esperados
      console.log('Checking if all files were added to vector store:');
      const storeFileIds = result.file_ids || [];
      
      // Identificar quais arquivos foram adicionados com sucesso
      const addedFiles = fileIds.filter(id => storeFileIds.includes(id));
      const missingFiles = fileIds.filter(id => !storeFileIds.includes(id));
      
      console.log(`- ${addedFiles.length} arquivos adicionados com sucesso`);
      console.log(`- ${missingFiles.length} arquivos não foram encontrados no vector store`);
      
      if (missingFiles.length > 0) {
        console.warn('Missing files in vector store:', missingFiles);
      }
      
      // 4. Adicionar à lista local e selecionar automaticamente
      setVectorStores(prev => [...prev, result]);
      setSelectedVectorStore(result.id);
      setVectorStoreStatus(`Vector store "${newVectorStoreName}" criado com sucesso com ${fileIds.length} arquivos!`);
      
      // Limpar o nome e fechar o modal
      setNewVectorStoreName('');
      setVectorStoreModalOpen(false);
      
      // Ativar a opção de vector store
      setVectorStoreEnabled(true);
    } catch (err) {
      console.error('Error creating vector store:', err);
      setVectorStoreStatus(`Erro ao criar vector store: ${err.message}`);
    } finally {
      setIsCreatingVectorStore(false);
    }
  };
  
  // Vincular vector store ao assistente
  const handleLinkVectorStore = async () => {
    if (!selectedVectorStore) {
      setVectorStoreStatus('Selecione um vector store para vincular');
      return;
    }
    
    try {
      setIsCreatingVectorStore(true);
      setVectorStoreStatus('Vinculando vector store ao assistente...');
      
      console.log(`Vinculando Vector Store ${selectedVectorStore} ao Assistente ${id}`);
      console.log(`Os arquivos do assistente: ${formData.files.map(f => f.id).join(', ')}`);
      
      // Atualizar o assistente com o vector store ID
      const result = await linkVectorStoreToAssistant(id, selectedVectorStore);
      
      console.log('Vector store linked to assistant:', result);
      
      // Verificar se o assistente tem o vector store vinculado
      const vectorStoreIds = result.tool_resources?.file_search?.vector_store_ids || [];
      if (vectorStoreIds.includes(selectedVectorStore)) {
        setVectorStoreStatus(`Vector store vinculado com sucesso! ID: ${selectedVectorStore}`);
      } else {
        setVectorStoreStatus('Vector store vinculado, mas não encontrado na resposta da API. Verifique o console para mais detalhes.');
      }
      
      // Garantir que file_search está habilitado na UI
      if (!formData.tools.includes('file_search')) {
        setFormData(prev => ({
          ...prev,
          tools: [...prev.tools, 'file_search']
        }));
      }
    } catch (err) {
      console.error('Error linking vector store:', err);
      setVectorStoreStatus(`Erro ao vincular vector store: ${err.message}`);
    } finally {
      setIsCreatingVectorStore(false);
    }
  };

  // Carregar arquivos do assistente
  useEffect(() => {
    const loadAssistantFiles = async () => {
      if (id) {
        try {
          console.log('Loading files for assistant:', id);
          const files = await listAssistantFiles(id);
          console.log('Assistant files loaded:', files);
          
          // Se temos arquivos e eles ainda não estão no estado, adicioná-los
          if (files && files.length > 0 && (!formData.files || formData.files.length === 0)) {
            // Transformar os dados dos arquivos para o formato esperado pelo nosso estado
            const formattedFiles = files.map(file => ({
              id: file.id,
              name: file.filename || `File-${file.id.slice(0, 6)}`,
              type: file.content_type || 'application/octet-stream',
              extension: (file.filename || '').split('.').pop()?.toLowerCase() || ''
            }));
            
            console.log('Formatted files to add to state:', formattedFiles);
            
            // Atualizar o estado com os arquivos carregados
            setFormData(prev => {
              const newState = {
                ...prev,
                files: formattedFiles
              };
              console.log('Updated form state with files:', newState);
              return newState;
            });
            
            // Se há arquivos, habilitar a opção de vector store
            if (formattedFiles.length > 0) {
              setVectorStoreEnabled(true);
            }
          }
        } catch (err) {
          console.error('Error loading assistant files:', err);
          // Usar um status mais amigável para o usuário
          setUploadStatus('Os arquivos foram carregados, mas podem não estar visíveis na interface. Eles continuam anexados ao assistente.');
        }
      }
    };
    
    // Só chamar quando o formData.files estiver vazio para evitar loop infinito
    if (!formData.files || formData.files.length === 0) {
      loadAssistantFiles();
    }
  }, [id]);
  
  // Enviar formulário
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Verificar se tem arquivos e adicionar automaticamente file_search se necessário
      const updatedTools = [...formData.tools];
      if (formData.files && formData.files.length > 0 && !updatedTools.includes('file_search')) {
        console.log('Files detected, adding file_search tool automatically');
        updatedTools.push('file_search');
      }
      
      // Preparar os dados para envio, incluindo IDs de arquivos
      const assistantData = {
        ...formData,
        tools: updatedTools,
        file_ids: formData.files.map(file => file.id)
      };
      
      console.log('Submitting assistant data with files:', assistantData);
      updateAssistant(id, assistantData);
      setTimeout(() => navigate('/'), 1500); // Redireciona após atualizar
    }
  };

  if (notFound) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Assistente não encontrado. <Button onClick={() => navigate('/')}>Voltar</Button>
      </Alert>
    );
  }

  // Modal para criar vector store
  const renderVectorStoreModal = () => (
    <Dialog
      open={vectorStoreModalOpen}
      onClose={handleCloseVectorStoreModal}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Criar Novo Vector Store</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Um Vector Store é um repositório de índices vetoriais para seus arquivos,
            permitindo que o assistente pesquise e responda perguntas sobre o conteúdo dos documentos.
          </Typography>
          
          <TextField
            label="Nome do Vector Store"
            value={newVectorStoreName}
            onChange={(e) => setNewVectorStoreName(e.target.value)}
            fullWidth
            required
            margin="normal"
            disabled={isCreatingVectorStore}
          />
          
          <Typography variant="body2" sx={{ mt: 2 }}>
            Arquivos a serem incluídos ({formData.files.length}):
          </Typography>
          
          <List dense sx={{ maxHeight: '200px', overflow: 'auto' }}>
            {formData.files.map((file) => (
              <ListItem key={file.id}>
                <ListItemIcon>
                  {file.extension === 'pdf' ? (
                    <PictureAsPdfIcon fontSize="small" sx={{ color: '#e53935' }} />
                  ) : file.extension === 'csv' ? (
                    <TableChartIcon fontSize="small" sx={{ color: '#43a047' }} />
                  ) : (
                    <DescriptionIcon fontSize="small" sx={{ color: '#1e88e5' }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={`ID: ${file.id.slice(0, 8)}...`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleCloseVectorStoreModal} 
          disabled={isCreatingVectorStore}
        >
          Cancelar
        </Button>
        <Button 
          variant="contained"
          onClick={handleCreateVectorStore}
          disabled={!newVectorStoreName.trim() || isCreatingVectorStore}
        >
          {isCreatingVectorStore ? 
            <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
          Criar Vector Store
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Editar Assistente
      </Typography>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Nome do Assistente */}
            <TextField
              label="Nome do Assistente"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
              fullWidth
              required
            />
            
            {/* Modelo GPT */}
            <FormControl fullWidth error={!!errors.model}>
              <InputLabel id="model-label">Modelo</InputLabel>
              <Select
                labelId="model-label"
                name="model"
                value={formData.model}
                onChange={handleChange}
                label="Modelo"
              >
                {/* GPT-4 Series */}
                <ListSubheader>Modelos GPT-4</ListSubheader>
                {groupedModels.gpt4Series.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    <Box>
                      <Typography variant="subtitle1">{model.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {model.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
                
                {/* GPT-3.5 Series */}
                <ListSubheader>Modelos GPT-3.5</ListSubheader>
                {groupedModels.gpt35Series.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    <Box>
                      <Typography variant="subtitle1">{model.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {model.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              {errors.model && <FormHelperText>{errors.model}</FormHelperText>}
            </FormControl>
            
            {/* Instruções */}
            <Box position="relative">
              <TextField
                label="Instruções"
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                error={!!errors.instructions}
                helperText={errors.instructions || 'Descreva o que o assistente deve fazer, seu estilo de comunicação, tom, etc. Você pode usar Markdown para formatação.'}
                multiline
                rows={6}
                fullWidth
                required
                InputProps={{
                  endAdornment: (
                    <Box position="absolute" right={8} top={8} display="flex" gap={1}>
                      <Tooltip title="Visualizar/editar instruções em tela cheia">
                        <IconButton
                          onClick={handleOpenInstructionsModal}
                          size="small"
                          sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}
                        >
                          <OpenInFullIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sintaxe Markdown é suportada">
                        <IconButton
                          size="small"
                          sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}
                        >
                          <MarkdownIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )
                }}
              />
            </Box>
            
            {/* Ferramentas */}
            <FormControl fullWidth>
              <InputLabel id="tools-label">Ferramentas</InputLabel>
              <Select
                labelId="tools-label"
                multiple
                name="tools"
                value={formData.tools}
                onChange={handleToolsChange}
                input={<OutlinedInput label="Ferramentas" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const tool = AVAILABLE_TOOLS.find(t => t.id === value);
                      return <Chip key={value} label={tool ? tool.name : value} />
                    })}
                  </Box>
                )}
              >
                {AVAILABLE_TOOLS.map((tool) => (
                  <MenuItem key={tool.id} value={tool.id}>
                    <Checkbox checked={formData.tools.indexOf(tool.id) > -1} />
                    <ListItemText 
                      primary={tool.name} 
                      secondary={tool.description} 
                    />
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Selecione as ferramentas que este assistente pode usar
              </FormHelperText>
            </FormControl>
            
            {/* Arquivos */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Arquivos
                </Typography>
                <Tooltip title="Adicionar arquivo (PDF, CSV, TXT, Markdown)">
                  <IconButton 
                    size="small" 
                    onClick={handleOpenFileSelector}
                    disabled={uploadingFile}
                    sx={{ ml: 1 }}
                  >
                    <AttachFileIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              {uploadStatus && (
                <Typography 
                  variant="caption" 
                  color={uploadStatus.includes('sucesso') ? 'success.main' : uploadStatus.includes('Erro') ? 'error' : 'text.secondary'}
                  sx={{ display: 'block', mb: 1 }}
                >
                  {uploadStatus}
                </Typography>
              )}
              
              {formData.files.length > 0 ? (
                <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, mb: 2 }}>
                  {formData.files.map((file) => (
                    <ListItem key={file.id}>
                      <ListItemIcon>
                        {file.extension === 'pdf' ? (
                          <PictureAsPdfIcon fontSize="small" sx={{ color: '#e53935' }} />
                        ) : file.extension === 'csv' ? (
                          <TableChartIcon fontSize="small" sx={{ color: '#43a047' }} />
                        ) : (
                          <DescriptionIcon fontSize="small" sx={{ color: '#1e88e5' }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={`ID: ${file.id.slice(0, 8)}...`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          aria-label="delete" 
                          onClick={() => handleRemoveFile(file.id)}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Nenhum arquivo anexado. Adicione arquivos para que o assistente possa usá-los.
                </Typography>
              )}
              
              {/* Input invisível para seleção de múltiplos arquivos */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt,.md,.markdown,application/pdf,text/csv,text/plain,text/markdown"
                style={{ display: 'none' }}
                onChange={handleFileSelected}
                multiple  // Permitir seleção de múltiplos arquivos
              />
            </Box>
            
            {/* Vector Store */}
            {formData.files.length > 0 && (
              <Box>
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Vector Store
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={vectorStoreEnabled}
                        onChange={(e) => setVectorStoreEnabled(e.target.checked)}
                        size="small"
                      />
                    }
                    label="Ativar"
                    sx={{ ml: 1 }}
                  />
                  
                  <Tooltip title="Criar novo Vector Store">
                    <IconButton
                      size="small"
                      onClick={handleOpenVectorStoreModal}
                      disabled={!vectorStoreEnabled || isCreatingVectorStore}
                      sx={{ ml: 1 }}
                    >
                      <StorageIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                {vectorStoreStatus && (
                  <Typography
                    variant="caption"
                    color={
                      vectorStoreStatus.includes('sucesso') || vectorStoreStatus.includes('vinculado')
                        ? 'success.main'
                        : vectorStoreStatus.includes('Erro')
                        ? 'error'
                        : 'text.secondary'
                    }
                    sx={{ display: 'block', mb: 1 }}
                  >
                    {vectorStoreStatus}
                  </Typography>
                )}
                
                {vectorStoreEnabled && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Selecione um Vector Store para criar um índice vetorial dos arquivos, permitindo
                      que o assistente pesquise e responda perguntas sobre o conteúdo dos documentos.
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <FormControl size="small" sx={{ minWidth: 250 }}>
                        <InputLabel id="vector-store-label">Vector Store</InputLabel>
                        <Select
                          labelId="vector-store-label"
                          value={selectedVectorStore}
                          onChange={(e) => setSelectedVectorStore(e.target.value)}
                          label="Vector Store"
                          disabled={isCreatingVectorStore || vectorStores.length === 0}
                        >
                          {vectorStores.length === 0 ? (
                            <MenuItem disabled>Nenhum Vector Store disponível</MenuItem>
                          ) : (
                            vectorStores.map((store) => (
                              <MenuItem key={store.id} value={store.id}>
                                {store.name || `Vector Store ${store.id.slice(0, 8)}`}
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>
                      
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleLinkVectorStore}
                        disabled={
                          isCreatingVectorStore || 
                          !selectedVectorStore || 
                          !vectorStoreEnabled
                        }
                        sx={{ mt: 1 }}
                      >
                        {isCreatingVectorStore ? 
                          <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                        Vincular ao Assistente
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
            
            {/* Botões de ação */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button onClick={() => navigate('/')} disabled={isLoading}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={isLoading || uploadingFile}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
              >
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>

      {/* Modal de instruções em tela cheia */}
      <Dialog
        open={instructionsModalOpen}
        onClose={handleCloseInstructionsModal}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: { height: '90vh', display: 'flex', flexDirection: 'column' }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Instruções do Assistente</Typography>
            <Box>
              <Button 
                onClick={togglePreviewMode}
                color="primary"
                startIcon={<MarkdownIcon />}
                sx={{ mr: 1 }}
              >
                {previewMode ? 'Modo Edição' : 'Pré-visualizar'}
              </Button>
              <IconButton onClick={handleCloseInstructionsModal} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
          {previewMode ? (
            <Box 
              sx={{ 
                overflow: 'auto', 
                width: '100%', 
                p: 2,
                '& .markdown': {
                  '& h1': { fontSize: '2rem', fontWeight: 'bold', my: 1 },
                  '& h2': { fontSize: '1.8rem', fontWeight: 'bold', my: 1 },
                  '& h3': { fontSize: '1.6rem', fontWeight: 'bold', my: 1 },
                  '& h4': { fontSize: '1.4rem', fontWeight: 'bold', my: 0.8 },
                  '& h5': { fontSize: '1.2rem', fontWeight: 'bold', my: 0.8 },
                  '& h6': { fontSize: '1.1rem', fontWeight: 'bold', my: 0.8 },
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
              <ReactMarkdown 
                className="markdown"
                remarkPlugins={[remarkGfm]}
              >
                {formData.instructions}
              </ReactMarkdown>
            </Box>
          ) : (
            <TextField
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              multiline
              fullWidth
              variant="outlined"
              sx={{ 
                height: '100%', 
                '& .MuiInputBase-root': { 
                  height: '100%', 
                  alignItems: 'flex-start' 
                },
                '& .MuiInputBase-input': {
                  height: '100% !important',
                  overflow: 'auto !important',
                  fontSize: '1rem',
                  fontFamily: 'monospace',
                  lineHeight: 1.5
                }
              }}
              InputProps={{
                sx: { p: 2 }
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', px: 2, py: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                * Use sintaxe Markdown para formatação: **negrito**, *itálico*, # títulos, etc.
              </Typography>
            </Box>
            <Button onClick={handleCloseInstructionsModal} color="primary">
              Concluído
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      
      {/* Modal para criar vector store */}
      {renderVectorStoreModal()}
    </Box>
  );
};

export default EditAssistant;
