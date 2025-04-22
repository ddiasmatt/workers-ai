import React, { useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Modal
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseIcon from '@mui/icons-material/Close';
import MarkdownIcon from '@mui/icons-material/Code';
import { uploadFile } from '../services/openai';

// Ferramentas disponíveis para assistentes
const AVAILABLE_TOOLS = [
  { id: 'code_interpreter', name: 'Code Interpreter', description: 'Executa código Python para análise de dados e programação' },
  { id: 'file_search', name: 'File Search', description: 'Consulta documentos e arquivos enviados para o assistente' },
  { id: 'function', name: 'Function Calling', description: 'Permite que o assistente chame APIs e funções externas' },
];

const CreateAssistant = () => {
  const navigate = useNavigate();
  const { createAssistant, isLoading, GPT_MODELS } = useContext(AssistantsContext);
  
  const [formData, setFormData] = useState({
    name: '',
    instructions: 'Você pode usar Markdown para formatar suas respostas (negrito, itálico, títulos, listas, código, etc.). Use essa funcionalidade para organizar suas respostas de forma clara e atraente.\n\n',
    model: 'gpt-4o',
    tools: [],
    files: []
  });
  
  // Agrupar modelos por categoria
  const groupedModels = {
    gpt4Series: GPT_MODELS.filter(model => model.id.startsWith('gpt-4')),
    gpt35Series: GPT_MODELS.filter(model => model.id.startsWith('gpt-3.5')),
  };
  
  const [errors, setErrors] = useState({});
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef(null);
  
  // Funções para o modal de instruções
  const handleOpenInstructionsModal = () => setInstructionsModalOpen(true);
  const handleCloseInstructionsModal = () => setInstructionsModalOpen(false);
  const togglePreviewMode = () => setPreviewMode(!previewMode);
  
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
  
  // Processar o arquivo selecionado
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Verificar o tipo de arquivo (permitir apenas PDF, CSV, TXT, Markdown)
    const allowedTypes = ['application/pdf', 'text/csv', 'text/plain', 'text/markdown'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && 
        !['pdf', 'csv', 'txt', 'md', 'markdown'].includes(fileExtension)) {
      setUploadStatus('Somente arquivos PDF, CSV, TXT e Markdown são suportados');
      return;
    }
    
    setUploadingFile(true);
    setUploadStatus('Enviando arquivo...');
    
    try {
      const response = await uploadFile(file);
      
      // Adicionar o arquivo à lista de arquivos do assistente
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, {
          id: response.id,
          name: file.name,
          type: file.type,
          extension: fileExtension
        }]
      }));
      
      setUploadStatus(`Arquivo "${file.name}" carregado com sucesso!`);
    } catch (err) {
      console.error('Error uploading file:', err);
      setUploadStatus(`Erro ao enviar arquivo: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setUploadingFile(false);
      // Limpar o input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Remover um arquivo da lista
  const handleRemoveFile = (fileId) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter(file => file.id !== fileId)
    }));
    setUploadStatus('Arquivo removido');
  };
  
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
      
      console.log('Creating assistant data with files:', assistantData);
      createAssistant(assistantData);
      setTimeout(() => navigate('/'), 1500); // Redireciona após criar
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Criar Novo Assistente
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
              
              {/* Input invisível para seleção de arquivo */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt,.md,.markdown,application/pdf,text/csv,text/plain,text/markdown"
                style={{ display: 'none' }}
                onChange={handleFileSelected}
              />
            </Box>
            
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
                {isLoading ? 'Criando...' : 'Criar Assistente'}
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
    </Box>
  );
};

export default CreateAssistant;
