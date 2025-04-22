// Serviço para interagir com a API da OpenAI

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

// Upload de arquivo para a OpenAI
export const uploadFile = async (file) => {
  if (!API_KEY) throw new Error('API key is required');
  
  try {
    console.log(`Uploading file ${file.name} for vector indexing...`);
    
    const formData = new FormData();
    formData.append('file', file);
    // Propósito 'assistants' é necessário para uso com assistentes
    formData.append('purpose', 'assistants');
    
    console.log('File upload parameters:', {
      filename: file.name,
      type: file.type,
      size: file.size,
      purpose: 'assistants'
    });
    
    const response = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
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

// Criar um vector store para indexação de arquivos
export const createVectorStore = async (name, files = []) => {
  if (!API_KEY) throw new Error('API key is required');
  
  try {
    console.log(`Creating vector store "${name}" with ${files.length} files...`);
    
    // Converter array de arquivos para array de IDs se necessário
    const fileIds = files.map(file => typeof file === 'string' ? file : file.id);
    
    console.log('Files to be added to vector store:', fileIds);
    
    // Criar o vector store usando a API
    const response = await fetch('https://api.openai.com/v1/vector_stores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        name: name,
        file_ids: fileIds
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('API Error response on vector store creation:', error);
      throw new Error(error.error?.message || 'Failed to create vector store');
    }
    
    const result = await response.json();
    console.log('Vector store created successfully:', result);
    
    return result;
  } catch (error) {
    console.error('Error creating vector store:', error);
    throw error;
  }
};

// Adicionar arquivos a um vector store existente
export const addFilesToVectorStore = async (vectorStoreId, files = []) => {
  if (!API_KEY) throw new Error('API key is required');
  
  try {
    console.log(`Adding ${files.length} files to vector store ${vectorStoreId}...`);
    
    const response = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        file_ids: files.map(file => typeof file === 'string' ? file : file.id)
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('API Error response on adding files to vector store:', error);
      throw new Error(error.error?.message || 'Failed to add files to vector store');
    }
    
    const result = await response.json();
    console.log('Files added to vector store successfully:', result);
    
    return result;
  } catch (error) {
    console.error('Error adding files to vector store:', error);
    throw error;
  }
};

// Obter vector stores existentes
export const listVectorStores = async () => {
  if (!API_KEY) throw new Error('API key is required');
  
  try {
    console.log('Listing all vector stores...');
    
    const response = await fetch('https://api.openai.com/v1/vector_stores', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('API Error response on listing vector stores:', error);
      throw new Error(error.error?.message || 'Failed to list vector stores');
    }
    
    const result = await response.json();
    console.log(`Found ${result.data?.length || 0} vector stores`);
    
    return result.data || [];
  } catch (error) {
    console.error('Error listing vector stores:', error);
    throw error;
  }
};

// Vincular um vector store a um assistente
export const linkVectorStoreToAssistant = async (assistantId, vectorStoreId) => {
  if (!API_KEY) throw new Error('API key is required');
  
  try {
    console.log(`Linking vector store ${vectorStoreId} to assistant ${assistantId}...`);
    
    // Primeiro, obter o assistente atual para preservar suas configurações
    const getResponse = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    if (!getResponse.ok) {
      const error = await getResponse.json();
      console.error('Error getting assistant details:', error);
      throw new Error(error.error?.message || 'Failed to get assistant details');
    }
    
    const assistant = await getResponse.json();
    console.log('Current assistant details:', assistant);
    
    // Preservar as configurações existentes do assistente
    const name = assistant.name;
    const instructions = assistant.instructions;
    const model = assistant.model;
    const fileIds = assistant.file_ids || [];
    
    // Garantir que a ferramenta file_search esteja habilitada
    let tools = assistant.tools || [];
    
    // Normalizar ferramentas para garantir formato correto
    const normalizedTools = tools.map(tool => {
      if (typeof tool === 'string') {
        return { type: tool };
      }
      return tool;
    });
    
    // Verificar se file_search já está habilitado
    const hasFileSearch = normalizedTools.some(tool => tool.type === 'file_search');
    
    // Adicionar file_search se não estiver presente
    if (!hasFileSearch) {
      normalizedTools.push({ type: 'file_search' });
    }
    
    console.log('Tools configuration:', normalizedTools);
    
    // Preparar recursos específicos de ferramentas (tool_resources)
    // A estrutura correta para vincular um vector store a um assistente
    const toolResources = {
      file_search: {
        vector_store_ids: [vectorStoreId]
      }
    };
    
    console.log('Tool resources configuration:', toolResources);
    
    // Atualizar o assistente com o vector store ID
    const updateResponse = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        name: name,
        instructions: instructions,
        model: model,
        tools: normalizedTools,
        file_ids: fileIds,
        tool_resources: toolResources
      })
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      console.error('Error linking vector store to assistant:', error);
      throw new Error(error.error?.message || 'Failed to link vector store to assistant');
    }
    
    const updatedAssistant = await updateResponse.json();
    console.log('Assistant updated with vector store:', updatedAssistant);
    
    return updatedAssistant;
  } catch (error) {
    console.error('Error linking vector store to assistant:', error);
    throw error;
  }
};

// Anexar um arquivo a um assistente
// Nota: Na nova abordagem, não precisamos desta função, pois os arquivos são adicionados
// diretamente ao criar/atualizar o assistente via file_ids
export const attachFileToAssistant = async (assistantId, fileId) => {
  if (!API_KEY) throw new Error('API key is required');
  
  try {
    console.log(`Attaching file ${fileId} to assistant ${assistantId} using assistant update approach...`);
    
    // Primeiro, obter o assistente atual
    const getResponse = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    if (!getResponse.ok) {
      const error = await getResponse.json();
      console.error('Error getting assistant details:', error);
      throw new Error(error.error?.message || 'Failed to get assistant details');
    }
    
    const assistant = await getResponse.json();
    console.log('Current assistant details:', assistant);
    
    // Preparar um array atualizado de file_ids
    const updatedFileIds = assistant.file_ids || [];
    if (!updatedFileIds.includes(fileId)) {
      updatedFileIds.push(fileId);
    }
    
    // Atualizar o assistente com o novo arquivo
    const updateResponse = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        file_ids: updatedFileIds
      })
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      console.error('Error updating assistant with file:', error);
      throw new Error(error.error?.message || 'Failed to update assistant with file');
    }
    
    const updatedAssistant = await updateResponse.json();
    console.log('Assistant updated with file:', updatedAssistant);
    
    // Retornar um objeto no formato esperado
    return {
      id: fileId,
      assistant_id: assistantId
    };
  } catch (error) {
    console.error('Error attaching file:', error);
    throw error;
  }
};

// Função alternativa para obter arquivos
// Em vez de listar arquivos do assistente diretamente, vamos recuperar o assistente completo
export const listAssistantFiles = async (assistantId) => {
  if (!API_KEY) throw new Error('API key is required');
  
  try {
    console.log(`Getting assistant details for ${assistantId} to retrieve files...`);
    
    // Primeiro obter os detalhes do assistente, que inclui file_ids
    const response = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('API Error response:', error);
      throw new Error(error.error?.message || 'Failed to get assistant details');
    }
    
    const assistant = await response.json();
    console.log('Retrieved assistant details:', assistant);
    
    // Se o assistente tem file_ids, vamos usar esses IDs para construir uma lista de arquivos
    if (assistant.file_ids && assistant.file_ids.length > 0) {
      // Converter os IDs de arquivo em objetos com informações simplificadas
      return assistant.file_ids.map(fileId => ({
        id: fileId,
        filename: `File-${fileId.slice(0, 8)}`,
        content_type: 'application/octet-stream'
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error getting assistant files:', error);
    
    // Se houver qualquer erro, retornamos uma lista vazia para não interromper o fluxo
    return [];
  }
};

// Adicionar um arquivo a uma mensagem
export const addMessageWithFile = async (threadId, message, fileId) => {
  if (!API_KEY) throw new Error('API key is required');
  
  try {
    // A API mudou e agora espera que o 'content' seja um array de objetos
    // Vamos formatar corretamente para incluir texto e arquivo
    let contentArray = [];
    
    // Sempre adicionar o conteúdo da mensagem como texto
    if (message && message.trim()) {
      contentArray.push({
        type: "text",
        text: message
      });
    }
    
    // Se tiver um arquivo, adicionar como parte do conteúdo
    // A API aceita apenas 'text', 'image_url' e 'image_file'
    if (fileId) {
      // Apenas adicionamos o arquivo como texto mencionando que foi enviado
      contentArray.push({
        type: "text",
        text: `Arquivo (ID: ${fileId}) enviado.`
      });
      
      // Não podemos incluir o arquivo diretamente na mensagem devido a limitações da API
      console.log(`Arquivo enviado com ID: ${fileId}`);
    }
    
    const requestBody = {
      role: 'user',
      content: contentArray
    };
    
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to add message');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding message with file:', error);
    throw error;
  }
};

// Criar um assistente
export const createAssistant = async (assistantData) => {
  if (!API_KEY) throw new Error('API key is required');

  try {
    console.log('Creating assistant with data:', {
      ...assistantData,
      file_ids: assistantData.file_ids || []
    });
    
    const requestBody = {
      name: assistantData.name,
      instructions: assistantData.instructions,
      model: assistantData.model,
      tools: assistantData.tools && assistantData.tools.length > 0 
        ? assistantData.tools.map(tool => ({ type: tool }))
        : []
    };
    
    // Adicionar IDs de arquivos se existirem
    if (assistantData.file_ids && assistantData.file_ids.length > 0) {
      requestBody.file_ids = assistantData.file_ids;
    }
    
    console.log('Final request body:', requestBody);
    
    const response = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error response:', error);
      throw new Error(error.error?.message || 'Failed to create assistant');
    }

    const assistant = await response.json();
    console.log('Assistant created successfully:', assistant);
    
    // Se há arquivos no formulário, vamos adicioná-los ao assistente para exibição na UI
    if (assistantData.files && assistantData.files.length > 0) {
      assistant.files = assistantData.files;
    }
    
    // Garantir que as ferramentas estejam no formato esperado pela UI
    if (assistant.tools && Array.isArray(assistant.tools)) {
      // Normalizar o formato das ferramentas para a UI
      assistant.tools = assistant.tools.map(tool => {
        return typeof tool === 'object' && tool.type ? tool.type : tool;
      });
    }
    
    return assistant;
  } catch (error) {
    console.error('Error creating assistant:', error);
    throw error;
  }
};

// Atualizar um assistente
export const updateAssistant = async (assistantId, assistantData) => {
  if (!API_KEY) throw new Error('API key is required');

  try {
    console.log(`Updating assistant ${assistantId} with data:`, {
      ...assistantData,
      file_ids: assistantData.file_ids || []
    });
    
    const requestBody = {
      name: assistantData.name,
      instructions: assistantData.instructions,
      model: assistantData.model,
      tools: assistantData.tools && assistantData.tools.length > 0 
        ? assistantData.tools.map(tool => ({ type: tool }))
        : []
    };
    
    // Adicionar IDs de arquivos se existirem
    if (assistantData.file_ids && assistantData.file_ids.length > 0) {
      requestBody.file_ids = assistantData.file_ids;
    }
    
    console.log('Final request body:', requestBody);
    
    const response = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error response:', error);
      throw new Error(error.error?.message || 'Failed to update assistant');
    }

    const assistant = await response.json();
    console.log('Assistant updated successfully:', assistant);
    
    // Se há arquivos no formulário, vamos adicioná-los ao assistente para exibição na UI
    if (assistantData.files && assistantData.files.length > 0) {
      assistant.files = assistantData.files;
    }
    
    // Garantir que as ferramentas estejam no formato esperado pela UI
    if (assistant.tools && Array.isArray(assistant.tools)) {
      // Normalizar o formato das ferramentas para a UI
      assistant.tools = assistant.tools.map(tool => {
        return typeof tool === 'object' && tool.type ? tool.type : tool;
      });
    }
    
    return assistant;
  } catch (error) {
    console.error('Error updating assistant:', error);
    throw error;
  }
};

// Listar todos os assistentes
export const listAssistants = async () => {
  if (!API_KEY) throw new Error('API key is required');

  try {
    console.log('Fetching all assistants...');
    
    const response = await fetch('https://api.openai.com/v1/assistants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error response:', error);
      throw new Error(error.error?.message || 'Failed to list assistants');
    }

    const data = await response.json();
    console.log(`Retrieved ${data.data?.length || 0} assistants`);
    
    // Enriquecemos cada assistente com informações detalhadas sobre arquivos
    const assistantsWithFiles = await Promise.all((data.data || []).map(async (assistant) => {
      try {
        // Se o assistente tem file_ids, vamos buscar informações detalhadas
        if (assistant.file_ids && assistant.file_ids.length > 0) {
          console.log(`Assistant ${assistant.id} has ${assistant.file_ids.length} files, fetching details...`);
          const files = await listAssistantFiles(assistant.id);
          
          // Guardar os dados dos arquivos para exibição na UI
          if (files && files.length > 0) {
            assistant.files = files.map(file => ({
              id: file.id,
              name: file.filename || `File-${file.id.slice(0, 6)}`,
              type: file.content_type || 'application/octet-stream',
              extension: (file.filename || '').split('.').pop()?.toLowerCase() || ''
            }));
          }
        }
        return assistant;
      } catch (err) {
        console.error(`Error fetching files for assistant ${assistant.id}:`, err);
        return assistant; // Return the assistant even if we couldn't get file details
      }
    }));
    
    return assistantsWithFiles || [];
  } catch (error) {
    console.error('Error listing assistants:', error);
    throw error;
  }
};

// Excluir um assistente
export const deleteAssistant = async (assistantId) => {
  if (!API_KEY) throw new Error('API key is required');

  try {
    const response = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete assistant');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting assistant:', error);
    throw error;
  }
};

// Criar um thread para chat
export const createThread = async () => {
  if (!API_KEY) throw new Error('API key is required');

  try {
    console.log('Creating new thread...');
    
    const response = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error creating thread:', error);
      throw new Error(error.error?.message || 'Failed to create thread');
    }

    const result = await response.json();
    console.log('Thread created successfully:', result);
    return result;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
};

// Deletar um thread
export const deleteThread = async (threadId) => {
  if (!API_KEY) throw new Error('API key is required');
  if (!threadId) throw new Error('Thread ID is required');

  try {
    console.log(`Deleting thread ${threadId}...`);
    
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error deleting thread:', error);
      throw new Error(error.error?.message || 'Failed to delete thread');
    }

    const result = await response.json();
    console.log('Thread deleted successfully:', result);
    return result;
  } catch (error) {
    console.error('Error deleting thread:', error);
    throw error;
  }
};

// Adicionar mensagem a um thread
export const addMessage = async (threadId, message) => {
  if (!API_KEY) throw new Error('API key is required');

  try {
    // A API espera que o 'content' seja um array de objetos
    const contentArray = [{
      type: "text",
      text: message
    }];
    
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: contentArray
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to add message');
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
};

// Executar o assistant em um thread
export const runAssistant = async (threadId, assistantId) => {
  if (!API_KEY) throw new Error('API key is required');

  try {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to run assistant');
    }

    return await response.json();
  } catch (error) {
    console.error('Error running assistant:', error);
    throw error;
  }
};

// Executar o assistant com streaming verdadeiro
export const runAssistantWithStreaming = async (threadId, assistantId, callbacks = {}) => {
  if (!API_KEY) throw new Error('API key is required');

  try {
    console.log(`Starting run with streaming for thread ${threadId} and assistant ${assistantId}`);
    
    // Primeiro verificar se o assistente existe e tem arquivos
    try {
      console.log(`Checking if assistant ${assistantId} has files...`);
      const assistantResponse = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      
      if (assistantResponse.ok) {
        const assistant = await assistantResponse.json();
        console.log(`Assistant details for run:`, {
          id: assistant.id,
          model: assistant.model,
          has_files: assistant.file_ids && assistant.file_ids.length > 0,
          file_count: assistant.file_ids?.length || 0,
          has_file_search: assistant.tools?.some(tool => 
            typeof tool === 'object' ? tool.type === 'file_search' : tool === 'file_search'
          )
        });
      }
    } catch (err) {
      console.error('Error checking assistant details:', err);
      // Continue with the run even if we can't check details
    }
    
    // Criar a execução com stream=true
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        stream: true
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create run');
    }

    // Iniciar o reader para streaming
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedContent = '';
    let currentRunId = null;
    let currentMessageId = null;
    
    // Função para processar um evento
    const processEvent = (eventData) => {
      try {
        if (!eventData || !eventData.trim()) return;

        // Verificar se é um marcador [DONE]
        if (eventData.includes('[DONE]')) {
          console.log('Stream completed');
          if (callbacks.onComplete) {
            callbacks.onComplete();
          }
          return;
        }
        
        // Verificar o formato do evento - pode ser SSE (Server-Sent Events) ou JSON direto
        const eventMatch = eventData.match(/^event: ([^\n]+)\ndata: (.+)$/s);
        
        let eventType = null;
        let jsonData = null;
        
        if (eventMatch) {
          // Formato SSE: "event: type\ndata: {...}"
          eventType = eventMatch[1];
          try {
            jsonData = JSON.parse(eventMatch[2]);
            // Criar estrutura compatível com nosso processamento
            jsonData = {
              type: eventType,
              data: jsonData
            };
          } catch (parseErr) {
            console.error('Error parsing SSE data JSON:', parseErr, eventMatch[2]);
            return;
          }
        } else {
          // Tenta formato simples: "data: {...}"
          const dataMatch = eventData.match(/^data: (.+)$/s);
          if (dataMatch) {
            try {
              jsonData = JSON.parse(dataMatch[1]);
            } catch (parseErr) {
              console.error('Error parsing data JSON:', parseErr, dataMatch[1]);
              return;
            }
          } else {
            // Última tentativa - talvez seja JSON direto
            try {
              jsonData = JSON.parse(eventData);
            } catch (parseErr) {
              console.error('Error parsing direct JSON, non-standard event format:', eventData);
              return;
            }
          }
        }
        
        if (!jsonData) {
          console.warn('Could not parse event data:', eventData);
          return;
        }
        
        // Processar o evento com base no tipo
        const type = eventType || jsonData.type;
        
        if (type === 'thread.run.created') {
          // Executar run criado
          currentRunId = jsonData.data.id;
          console.log(`Run created with streaming, ID: ${currentRunId}`);
          
          // Emitir evento de status
          if (callbacks.onData) {
            callbacks.onData({
              event: 'thread.run.status',
              data: { 
                status: 'created',
                run_id: currentRunId 
              }
            });
          }
        } 
        else if (type === 'thread.message.created') {
          // Nova mensagem criada
          currentMessageId = jsonData.data.id;
          console.log(`New message created, ID: ${currentMessageId}`);
        }
        else if (type === 'thread.run.queued') {
          // Run colocado na fila
          if (callbacks.onData) {
            callbacks.onData({
              event: 'thread.run.status',
              data: { 
                status: 'queued',
                run_id: jsonData.data?.id || currentRunId
              }
            });
          }
        }
        else if (type === 'thread.run.in_progress') {
          // Run em progresso
          if (callbacks.onData) {
            callbacks.onData({
              event: 'thread.run.status',
              data: { 
                status: 'in_progress',
                run_id: jsonData.data?.id || currentRunId
              }
            });
          }
        }
        else if (type === 'thread.message.delta') {
          // Delta de mensagem - atualização do conteúdo em tempo real
          const delta = jsonData.data.delta;
          
          if (delta.content && delta.content.length > 0) {
            // Extrair conteúdo de texto do delta
            for (const content of delta.content) {
              if (content.type === 'text' && content.text && content.text.value) {
                // Adicionar à mensagem acumulada
                accumulatedContent += content.text.value;
                
                // Emitir a atualização de conteúdo
                if (callbacks.onData) {
                  callbacks.onData({
                    event: 'thread.message.content',
                    data: {
                      content: accumulatedContent,
                      delta: content.text.value,
                      message_id: currentMessageId
                    }
                  });
                }
              }
            }
          }
        }
        else if (type === 'thread.message.completed') {
          // Mensagem completa
          if (callbacks.onData) {
            callbacks.onData({
              event: 'thread.message.completed',
              data: {
                message: {
                  id: currentMessageId,
                  content: [{ type: 'text', text: { value: accumulatedContent } }],
                  role: 'assistant'
                }
              }
            });
          }
        }
        else if (type === 'thread.run.completed') {
          // Run completo
          console.log('Run completed successfully');
          if (callbacks.onComplete) {
            callbacks.onComplete({
              runId: currentRunId,
              messageId: currentMessageId,
              content: accumulatedContent
            });
          }
        }
        else if (type === 'thread.run.failed') {
          // Run falhou
          console.error('Run failed:', jsonData.data.error);
          if (callbacks.onError) {
            callbacks.onError(jsonData.data.error?.message || 'Unknown error');
          } else {
            throw new Error(`Run failed: ${jsonData.data.error?.message || 'Unknown error'}`);
          }
        }
        else {
          // Tipo de evento não reconhecido
          console.log('Unrecognized event type:', type, jsonData);
        }
      } catch (err) {
        console.error('Error processing event:', err, eventData);
        if (callbacks.onError) {
          callbacks.onError(err.message || 'Error processing stream event');
        }
      }
    };
    
    // Função para processar os chunks do stream
    const processStream = async () => {
      try {
        let buffer = '';
        let done = false;
        console.log('Starting to process streaming response');
        
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          
          if (done) break;
          
          // Converter o chunk em texto e adicionar ao buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Log para debug
          console.debug('Received chunk from stream:', chunk.slice(0, 100) + (chunk.length > 100 ? '...' : ''));
          
          // Processar SSE eventos
          // Os eventos SSE são separados por duas linhas vazias
          const events = buffer.split('\n\n');
          buffer = events.pop() || ''; // Último evento possivelmente incompleto volta para o buffer
          
          for (const event of events) {
            if (event.trim()) {
              processEvent(event.trim());
            }
          }
        }
        
        // Processar qualquer evento restante no buffer
        if (buffer.trim()) {
          processEvent(buffer.trim());
        }
        
        // Sinalizar conclusão se ainda não foi feito
        if (callbacks.onComplete) {
          callbacks.onComplete({
            runId: currentRunId,
            messageId: currentMessageId,
            content: accumulatedContent
          });
        }
        
        return { status: 'completed' };
      } catch (err) {
        console.error('Error processing stream:', err);
        if (callbacks.onError) {
          callbacks.onError(err.message || 'Error processing stream');
        }
        throw err;
      }
    };
    
    // Iniciar o processamento do stream
    processStream();
    
    // Retornar um objeto com função para cancelar o run
    return {
      cancel: async () => {
        if (currentRunId) {
          try {
            const cancelResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${currentRunId}/cancel`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'OpenAI-Beta': 'assistants=v2',
                'Content-Type': 'application/json'
              }
            });
            
            console.log('Run cancelado manualmente');
            return cancelResponse.ok;
          } catch (e) {
            console.error('Error cancelling run:', e);
            return false;
          }
        }
        return false;
      }
    };
  } catch (error) {
    console.error('Error running assistant with streaming:', error);
    if (callbacks.onError) {
      callbacks.onError(error.message || 'Error starting streaming run');
    }
    throw error;
  }
};

// Verificar status de uma execução
export const checkRunStatus = async (threadId, runId) => {
  if (!API_KEY) throw new Error('API key is required');

  try {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to check run status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking run status:', error);
    throw error;
  }
};

// Listar mensagens de um thread
export const listMessages = async (threadId) => {
  if (!API_KEY) throw new Error('API key is required');

  try {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to list messages');
    }

    // Obter as mensagens da resposta
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error listing messages:', error);
    throw error;
  }
};