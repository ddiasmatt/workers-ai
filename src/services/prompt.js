// Serviço para interagir com a API de Chat/Completion da OpenAI usando prompts diretos

// Modelos disponíveis
const AVAILABLE_MODELS = [
  // GPT-4 Series
  { id: 'gpt-4.1', name: 'GPT-4.1 🔥', description: 'Nova geração com 1M+ tokens de contexto', contextWindow: 1047576, maxOutputTokens: 32768 },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Última versão GPT-4 otimizada', contextWindow: 128000, maxOutputTokens: 4096 },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Versão mais recente da série GPT-4', contextWindow: 128000, maxOutputTokens: 4096 },
  { id: 'gpt-4', name: 'GPT-4', description: 'Versão estável GPT-4', contextWindow: 8192, maxOutputTokens: 4096 },
  
  // Claude Series
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', description: 'Modelo Claude com alta capacidade', contextWindow: 200000, maxOutputTokens: 4096 },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Versão premium do Claude com alta capacidade', contextWindow: 200000, maxOutputTokens: 4096 },
  
  // GPT-3.5 Series
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Versão rápida e econômica', contextWindow: 16385, maxOutputTokens: 4096 }
];

// Função para obter o max_tokens apropriado para o modelo
const getMaxTokensForModel = (modelId) => {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  
  // Se encontrar o modelo, usar seus valores específicos
  if (model) {
    // Para modelos com grande contexto (como GPT-4.1), permitir respostas mais longas
    if (model.contextWindow > 500000) {
      return 8192; // Permitir respostas muito longas para GPT-4.1
    } else if (model.contextWindow > 100000) {
      return 4096; // Para modelos com contexto médio-grande
    } else {
      return 2048; // Para modelos com contexto padrão
    }
  }
  
  // Valor padrão se o modelo não for encontrado
  return 2048;
};

// Configuração da API
let API_KEY = localStorage.getItem('openai-api-key') || '';

// Função para definir a chave da API
export const setApiKey = (key) => {
  API_KEY = key;
  localStorage.setItem('openai-api-key', key);
  return true;
};

// Função para verificar se a chave da API está definida
export const hasApiKey = () => {
  return !!API_KEY;
};

// Função para obter a chave da API (mascarada para UI)
export const getMaskedApiKey = () => {
  if (!API_KEY) return '';
  // Mostra apenas os primeiros 4 e últimos 4 caracteres
  return `${API_KEY.slice(0, 4)}...${API_KEY.slice(-4)}`;
};

// Upload de arquivo para processamento
export const uploadFile = async (file) => {
  if (!API_KEY) throw new Error('API key is required');
  
  try {
    console.log(`Uploading file ${file.name} for processing...`);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'assistants'); // Mantemos 'assistants' para compatibilidade
    
    console.log('File upload parameters:', {
      filename: file.name,
      type: file.type,
      size: file.size
    });
    
    const response = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('API Error response on file upload:', error);
      throw new Error(error.error?.message || 'Failed to upload file');
    }
    
    const result = await response.json();
    console.log('File uploaded successfully:', result);
    
    return result;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Recuperar conteúdo de um arquivo
export const retrieveFileContent = async (fileId) => {
  if (!API_KEY) throw new Error('API key is required');
  
  try {
    console.log(`Retrieving content for file ${fileId}...`);
    
    const response = await fetch(`https://api.openai.com/v1/files/${fileId}/content`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('API Error response on file retrieval:', error);
      throw new Error(error.error?.message || 'Failed to retrieve file content');
    }
    
    // O conteúdo pode ser texto, JSON, ou outro formato dependendo do arquivo
    let content = await response.text();
    
    // Tentar processar como JSON se possível
    try {
      content = JSON.parse(content);
    } catch (e) {
      // Não é JSON, manter como texto
    }
    
    return { id: fileId, content };
  } catch (error) {
    console.error('Error retrieving file content:', error);
    throw error;
  }
};

// Gerenciar histórico de conversas localmente
// Formato da mensagem:
// { role: 'user'|'assistant'|'system', content: 'texto da mensagem' }
export class ConversationManager {
  constructor(systemPrompt = '') {
    this.reset(systemPrompt);
  }
  
  // Inicializar ou redefinir uma conversa
  reset(systemPrompt = '') {
    this.history = [];
    
    // Se tiver um prompt do sistema, adicionar como primeira mensagem
    if (systemPrompt) {
      this.addMessage('system', systemPrompt);
    }
    
    return this.history;
  }
  
  // Adicionar mensagem ao histórico
  addMessage(role, content, timestamp = null, attachedFile = null) {
    const message = { 
      role, 
      content,
      timestamp: timestamp || new Date().toISOString(),
      ...(attachedFile ? { attachedFile } : {})
    };
    this.history.push(message);
    return message;
  }
  
  // Obter histórico completo
  getHistory() {
    return [...this.history];
  }
  
  // Obter token count aproximado (estimativa mais precisa)
  getApproximateTokenCount() {
    // Estimativa melhorada para diferentes tipos de conteúdo
    // Em geral, 1 token ~= 4 caracteres em inglês, ~1-2 caracteres em línguas asiáticas
    // Ajustamos para ~3.5 para cobrir português/espanhol que têm mais caracteres por token que inglês
    
    let totalTokens = 0;
    
    // Adicionar tokens das mensagens + sobrecarga para metadados (4 tokens por mensagem)
    this.history.forEach(msg => {
      // ~3.5 caracteres por token para línguas latinas
      const contentTokens = Math.ceil(msg.content.length / 3.5);
      // Adicionar sobrecarga para o formato da mensagem 
      totalTokens += contentTokens + 4;
    });
    
    return totalTokens;
  }
  
  // Obter últimas N mensagens
  getLastMessages(count) {
    return this.history.slice(-count);
  }
  
  // Salvar conversa no localStorage
  save(id) {
    localStorage.setItem(`conversation_${id}`, JSON.stringify(this.history));
  }
  
  // Carregar conversa do localStorage
  load(id) {
    const saved = localStorage.getItem(`conversation_${id}`);
    if (saved) {
      try {
        this.history = JSON.parse(saved);
        return true;
      } catch (e) {
        console.error('Error loading conversation:', e);
        return false;
      }
    }
    return false;
  }
}

// Enviar mensagem para o modelo e obter resposta (sem streaming)
export const sendMessage = async (conversation, message, model = 'gpt-4.1', options = {}) => {
  if (!API_KEY) throw new Error('API key is required');
  
  // Garantir que temos um modelo válido, mas não forçar gpt-4.1
  if (!model) model = 'gpt-4.1';
  
  // Adicionar mensagem do usuário ao histórico com timestamp
  const userTimestamp = new Date().toISOString();
  conversation.addMessage('user', message, userTimestamp);
  
  // Opções padrão otimizadas para cada modelo
  const defaultOptions = {
    temperature: 0.7,
    max_tokens: getMaxTokensForModel(model)
  };
  
  // Mesclar opções padrão com as fornecidas
  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    // Usar o ID do modelo diretamente
    let apiModel = model;
    
    console.log(`Sending message to model ${model}...`);
    console.log(`API model ID: ${apiModel}`);
    
    // Log do token count aproximado
    const tokenCount = conversation.getApproximateTokenCount();
    console.log(`Approximate token count: ${tokenCount} tokens`);
    
    // Verificar se precisamos usar um subset do histórico por causa do limite de contexto
    let messages = conversation.getHistory();
    const isGpt41 = model.includes('gpt-4.1');
    const contextLimit = isGpt41 ? 1000000 : (model.includes('gpt-4o') || model.includes('claude')) ? 120000 : 8000;
    
    // Se o contexto é grande demais, usar estratégia de compactação inteligente
    if (tokenCount > contextLimit * 0.8) { // Usar 80% do limite para garantir espaço para resposta
      console.log(`Context too large (${tokenCount} tokens). Applying smart context management...`);
      
      // Manter a primeira mensagem (system prompt) e as últimas X mensagens
      const systemPrompt = messages.find(msg => msg.role === 'system');
      const recentMessages = messages.filter(msg => msg.role !== 'system')
        .slice(-Math.floor(contextLimit / 500)); // número estimado de mensagens que cabem
        
      messages = systemPrompt ? [systemPrompt, ...recentMessages] : recentMessages;
      console.log(`Reduced context to ${messages.length} messages`);
    }
    
    // Construir o objeto de requisição
    const requestBody = {
      model: apiModel, // Usar o ID real da API
      messages: messages,
      temperature: finalOptions.temperature,
      max_tokens: finalOptions.max_tokens
    };
    
    // Adicionar tools se fornecido
    if (finalOptions.tools && finalOptions.tools.length > 0) {
      requestBody.tools = finalOptions.tools;
      // Adicionar tool_choice se tiver ferramentas
      requestBody.tool_choice = "auto";
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('API Error response:', error);
      throw new Error(error.error?.message || 'Failed to get response from model');
    }
    
    const result = await response.json();
    console.log('Response received:', result);
    
    // Extrair e adicionar resposta ao histórico com timestamp
    const responseContent = result.choices[0]?.message?.content || '';
    const assistantTimestamp = new Date().toISOString();
    conversation.addMessage('assistant', responseContent, assistantTimestamp);
    
    return {
      content: responseContent,
      usage: result.usage,
      model: result.model
    };
  } catch (error) {
    console.error('Error getting response:', error);
    throw error;
  }
};

// Enviar mensagem com streaming para atualizações em tempo real
export const sendMessageWithStreaming = async (conversation, message, model = 'gpt-4.1', callbacks = {}, options = {}) => {
  if (!API_KEY) throw new Error('API key is required');
  
  // Garantir que temos um modelo válido, mas não forçar gpt-4.1
  if (!model) model = 'gpt-4.1';
  
  // Adicionar mensagem do usuário ao histórico com timestamp e arquivo anexado (se existir)
  const userTimestamp = new Date().toISOString();
  const attachedFile = options.attachedFile || null;
  
  // Se for a primeira mensagem, adicionar uma mensagem do sistema sobre o modelo
  const isFirstMessage = conversation.getHistory().filter(msg => msg.role === 'user').length === 0;
  if (isFirstMessage) {
    // Adicionar informação sobre o modelo sendo usado (remove qualquer mensagem existente)
    conversation.getHistory().forEach((msg, index) => {
      if (msg.role === 'system' && msg.content.includes('Estou usando o modelo')) {
        conversation.getHistory().splice(index, 1);
      }
    });
    
    // Adicionar a mensagem de identificação do modelo real ao histórico
    const modelName = AVAILABLE_MODELS.find(m => m.id === model)?.name || model;
    conversation.addMessage('system', `Estou usando o modelo ${modelName} (${model}) para esta conversa.`);
  }
  
  conversation.addMessage('user', message, userTimestamp, attachedFile);
  
  // Opções padrão otimizadas para cada modelo
  const defaultOptions = {
    temperature: 0.7,
    max_tokens: getMaxTokensForModel(model)
  };
  
  // Mesclar opções padrão com as fornecidas
  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    // Usar o ID do modelo diretamente
    let apiModel = model;
    
    console.log(`Sending streaming message to model ${model}...`);
    console.log(`API model ID: ${apiModel}`);
    
    // Log do token count aproximado
    const tokenCount = conversation.getApproximateTokenCount();
    console.log(`Approximate token count: ${tokenCount} tokens`);
    
    // Verificar se precisamos usar um subset do histórico devido ao limite de contexto
    let messages = conversation.getHistory();
    const isGpt41 = model.includes('gpt-4.1');
    const isAnthropicModel = apiModel.includes('claude');
    const contextLimit = isGpt41 ? 1000000 : (model.includes('gpt-4o') || isAnthropicModel) ? 120000 : 8000;
    
    // Se o contexto é grande demais, usar estratégia de compactação inteligente
    if (tokenCount > contextLimit * 0.8) { // Usar 80% do limite para garantir espaço para resposta
      console.log(`Context too large (${tokenCount} tokens). Applying smart context management...`);
      
      // Manter a primeira mensagem (system prompt) e as últimas X mensagens
      const systemPrompt = messages.find(msg => msg.role === 'system');
      const recentMessages = messages.filter(msg => msg.role !== 'system')
        .slice(-Math.floor(contextLimit / 500)); // número estimado de mensagens que cabem
        
      messages = systemPrompt ? [systemPrompt, ...recentMessages] : recentMessages;
      console.log(`Reduced context to ${messages.length} messages`);
    }
    
    // Construir o objeto de requisição conforme o provedor de API
    let requestBody;
    
    if (isAnthropicModel) {
      // Formato para API da Anthropic
      requestBody = {
        model: apiModel,
        messages: messages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user',
          content: msg.content
        })),
        temperature: finalOptions.temperature,
        max_tokens: finalOptions.max_tokens,
        stream: true
      };
    } else {
      // Formato para API da OpenAI
      requestBody = {
        model: apiModel,
        messages: messages,
        temperature: finalOptions.temperature,
        max_tokens: finalOptions.max_tokens,
        stream: true
      };
    }
    
    // Adicionar tools se fornecido
    if (finalOptions.tools && finalOptions.tools.length > 0) {
      requestBody.tools = finalOptions.tools;
      // Adicionar tool_choice se tiver ferramentas
      requestBody.tool_choice = "auto";
    }
    
    console.log('Request configuration:', {
      displayModel: model,
      apiModel: apiModel,
      temperature: finalOptions.temperature,
      max_tokens: finalOptions.max_tokens,
      hasTools: finalOptions.tools && finalOptions.tools.length > 0
    });
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      // Tentativa de obter detalhes do erro
      let errorDetails = 'Unknown error';
      try {
        const errorJson = await response.json();
        errorDetails = errorJson.error?.message || JSON.stringify(errorJson);
      } catch (e) {
        errorDetails = await response.text();
      }
      console.error('API Error response:', errorDetails);
      throw new Error(errorDetails);
    }
    
    // Iniciar o processamento do stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullResponse = '';
    
    // Função para processar o stream
    const processStream = async () => {
      try {
        let done = false;
        console.log('Starting to process streaming response');
        
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          
          if (done) break;
          
          // Processar o chunk
          const chunk = decoder.decode(value, { stream: true });
          
          // Processar as linhas do chunk (formato SSE)
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            // Ignorar linhas vazias ou que não começam com "data:"
            if (!line.trim() || !line.startsWith('data:')) continue;
            
            // Extrair o conteúdo após "data:"
            const content = line.replace(/^data: /, '').trim();
            
            // Ignorar mensagens de heartbeat ("[DONE]")
            if (content === '[DONE]') continue;
            
            try {
              // Processar o JSON recebido
              const json = JSON.parse(content);
              const delta = json.choices[0]?.delta?.content || '';
              
              // Atualizar resposta completa
              fullResponse += delta;
              
              // Chamar callback com o delta e conteúdo total
              if (callbacks.onData) {
                callbacks.onData({
                  delta,
                  content: fullResponse
                });
              }
            } catch (e) {
              console.warn('Error parsing chunk:', e, content);
            }
          }
        }
        
        // Adicionar a resposta completa ao histórico com timestamp
        const assistantTimestamp = new Date().toISOString();
        conversation.addMessage('assistant', fullResponse, assistantTimestamp);
        
        // Sinalizar conclusão
        if (callbacks.onComplete) {
          callbacks.onComplete({
            content: fullResponse
          });
        }
        
        return { content: fullResponse };
      } catch (err) {
        console.error('Error processing stream:', err);
        if (callbacks.onError) {
          callbacks.onError(err.message || 'Error processing stream');
        }
        throw err;
      }
    };
    
    // Iniciar processamento do stream
    processStream();
    
    // Retornar objeto com função para cancelar streaming
    return {
      cancel: async () => {
        try {
          await reader.cancel();
          console.log('Stream cancelled manually');
          return true;
        } catch (e) {
          console.error('Error cancelling stream:', e);
          return false;
        }
      }
    };
  } catch (error) {
    console.error('Error getting streaming response:', error);
    if (callbacks.onError) {
      callbacks.onError(error.message || 'Error connecting to API');
    }
    throw error;
  }
};