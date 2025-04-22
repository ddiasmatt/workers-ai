// Serviço para interagir com a API de Chat/Completion da OpenAI usando prompts diretos

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
  addMessage(role, content) {
    const message = { role, content };
    this.history.push(message);
    return message;
  }
  
  // Obter histórico completo
  getHistory() {
    return [...this.history];
  }
  
  // Obter token count aproximado (estimativa simples)
  getApproximateTokenCount() {
    // Uma estimativa muito aproximada: ~4 caracteres por token
    const allText = this.history.map(msg => msg.content).join(' ');
    return Math.ceil(allText.length / 4);
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
export const sendMessage = async (conversation, message, model = 'gpt-3.5-turbo', options = {}) => {
  if (!API_KEY) throw new Error('API key is required');
  
  // Adicionar mensagem do usuário ao histórico
  conversation.addMessage('user', message);
  
  // Opções padrão
  const defaultOptions = {
    temperature: 0.7,
    max_tokens: 1024
  };
  
  // Mesclar opções padrão com as fornecidas
  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    console.log(`Sending message to model ${model}...`);
    
    // Construir o objeto de requisição
    const requestBody = {
      model: model,
      messages: conversation.getHistory(),
      temperature: finalOptions.temperature,
      max_tokens: finalOptions.max_tokens
    };
    
    // Adicionar tools se fornecido
    if (finalOptions.tools && finalOptions.tools.length > 0) {
      requestBody.tools = finalOptions.tools;
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
    
    // Extrair e adicionar resposta ao histórico
    const responseContent = result.choices[0]?.message?.content || '';
    conversation.addMessage('assistant', responseContent);
    
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
export const sendMessageWithStreaming = async (conversation, message, model = 'gpt-3.5-turbo', callbacks = {}, options = {}) => {
  if (!API_KEY) throw new Error('API key is required');
  
  // Adicionar mensagem do usuário ao histórico
  conversation.addMessage('user', message);
  
  // Opções padrão
  const defaultOptions = {
    temperature: 0.7,
    max_tokens: 1024
  };
  
  // Mesclar opções padrão com as fornecidas
  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    console.log(`Sending streaming message to model ${model}...`);
    
    // Construir o objeto de requisição
    const requestBody = {
      model: model,
      messages: conversation.getHistory(),
      temperature: finalOptions.temperature,
      max_tokens: finalOptions.max_tokens,
      stream: true
    };
    
    // Adicionar tools se fornecido
    if (finalOptions.tools && finalOptions.tools.length > 0) {
      requestBody.tools = finalOptions.tools;
    }
    
    console.log('Request configuration:', {
      model: model,
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
        
        // Adicionar a resposta completa ao histórico
        conversation.addMessage('assistant', fullResponse);
        
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