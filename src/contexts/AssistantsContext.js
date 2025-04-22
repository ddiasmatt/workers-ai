import React, { createContext, useState, useEffect } from 'react';
import {
  createAssistant as apiCreateAssistant,
  updateAssistant as apiUpdateAssistant,
  deleteAssistant as apiDeleteAssistant,
  listAssistants as apiListAssistants,
  hasApiKey
} from '../services/openai';

export const AssistantsContext = createContext();

const GPT_MODELS = [
  // Models from 2025
  { id: 'gpt-4.1-2025-04-15', name: 'GPT-4.1 (Abril 2025)', description: 'Lançamento oficial do GPT-4.1 (Abril 2025)' },
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Versão estável do GPT-4.1 lançada em 2025' },
  
  // GPT-4o models
  { id: 'gpt-4o-2024-08-06', name: 'GPT-4o (Aug 2024)', description: 'Versão do GPT-4o de Agosto 2024' },
  { id: 'gpt-4o-2024-05-13', name: 'GPT-4o (May 2024)', description: 'Versão do GPT-4o de Maio 2024' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Modelo mais avançado e atualizado da OpenAI (2024)' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Versão mais rápida e econômica do GPT-4o' },
  
  // GPT-4.5
  { id: 'gpt-4.5-2024-12-12', name: 'GPT-4.5 (Dez 2024)', description: 'Versão estável do GPT-4.5 (Dezembro 2024)' },
  { id: 'gpt-4.5', name: 'GPT-4.5', description: 'Versão oficial do GPT-4.5' },
  { id: 'gpt-4-1106-preview', name: 'GPT-4.5 Preview', description: 'Versão preview original do GPT-4.5 (Nov 2023)' },
  
  // GPT-4.1 (older versions)
  { id: 'gpt-4.1-2024-09-10', name: 'GPT-4.1 (Set 2024)', description: 'Versão do GPT-4.1 de Setembro 2024' },
  { id: 'gpt-4-0125-preview', name: 'GPT-4.1 Preview', description: 'Versão preview original do GPT-4.1 (Jan 2024)' },
  
  // GPT-4 Turbo
  { id: 'gpt-4-turbo-2024-04-09', name: 'GPT-4 Turbo (Apr 2024)', description: 'Versão estável do GPT-4 Turbo (Abril 2024)' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Versão otimizada do GPT-4' },
  
  // Vision models
  { id: 'gpt-4-vision-2024-10', name: 'GPT-4 Vision (Oct 2024)', description: 'Versão estável do GPT-4 com capacidade de visão' },
  { id: 'gpt-4-vision', name: 'GPT-4 Vision', description: 'GPT-4 com capacidade de processar imagens' },
  { id: 'gpt-4-vision-preview', name: 'GPT-4 Vision Preview', description: 'Preview do GPT-4 com visão' },
  { id: 'gpt-4-1106-vision-preview', name: 'GPT-4 Vision (Nov 2023)', description: 'GPT-4 com visão (Novembro 2023)' },
  
  // Standard GPT-4
  { id: 'gpt-4-0613', name: 'GPT-4 (Jun 2023)', description: 'Versão estável do GPT-4 (Junho 2023)' },
  { id: 'gpt-4', name: 'GPT-4', description: 'Modelo GPT-4 original (2023)' },
  
  // GPT-3.5 Series - More affordable
  { id: 'gpt-3.5-turbo-2024-03-15', name: 'GPT-3.5 (Mar 2024)', description: 'Versão mais recente do GPT-3.5 (Março 2024)' },
  { id: 'gpt-3.5-turbo-0125', name: 'GPT-3.5 (Jan 2024)', description: 'Versão de janeiro 2024 do GPT-3.5' },
  { id: 'gpt-3.5-turbo-1106', name: 'GPT-3.5 (Nov 2023)', description: 'Versão de novembro 2023 do GPT-3.5' },
  { id: 'gpt-3.5-turbo-instruct', name: 'GPT-3.5 Turbo Instruct', description: 'Versão compatível com o modelo text-davinci-003' },
  { id: 'gpt-3.5-turbo-0613', name: 'GPT-3.5 (Jun 2023)', description: 'Versão de junho 2023 do GPT-3.5' },
  { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16k', description: 'GPT-3.5 com contexto expandido de 16k tokens' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Versão atual do GPT-3.5' },
];

export const AssistantsProvider = ({ children }) => {
  const [assistants, setAssistants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isApiKeySet, setIsApiKeySet] = useState(hasApiKey());
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);

  // Verificar se a API key está definida
  useEffect(() => {
    setIsApiKeySet(hasApiKey());
    
    // Se não houver chave de API, abrir o diálogo de configuração
    if (!hasApiKey()) {
      setApiKeyDialogOpen(true);
    }
  }, []);

  // Carregar assistentes quando a aplicação iniciar
  useEffect(() => {
    if (isApiKeySet) {
      loadAssistants();
    } else {
      // Configurar assistentes vazios
      setAssistants([]);
    }
  }, [isApiKeySet]);

  // Salvar assistentes no localStorage sempre que mudar
  useEffect(() => {
    if (assistants.length > 0) {
      localStorage.setItem('openai-assistants', JSON.stringify(assistants));
    }
  }, [assistants]);

  // Carregar assistentes da API
  const loadAssistants = async () => {
    if (!hasApiKey()) {
      setApiKeyDialogOpen(true);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Primeiro carregue do localStorage para ter uma resposta rápida
    const savedAssistants = localStorage.getItem('openai-assistants');
    if (savedAssistants) {
      setAssistants(JSON.parse(savedAssistants));
    }
    
    try {
      const loadedAssistants = await apiListAssistants();
      setAssistants(loadedAssistants);
      // Salva na localStorage para uso offline/reload
      localStorage.setItem('openai-assistants', JSON.stringify(loadedAssistants));
    } catch (err) {
      console.error('Error loading assistants:', err);
      setError(err.message || 'Failed to load assistants');
      // Já usamos o fallback no início da função
    } finally {
      setIsLoading(false);
    }
  };

  // Criar novo assistente
  const createAssistant = async (assistantData) => {
    if (!hasApiKey()) {
      setApiKeyDialogOpen(true);
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newAssistant = await apiCreateAssistant(assistantData);
      setAssistants(prev => [...prev, newAssistant]);
      return true;
    } catch (err) {
      console.error('Error creating assistant:', err);
      setError(err.message || 'Failed to create assistant');
      
      // Modo offline - criar assistente local
      if (!navigator.onLine) {
        const offlineAssistant = {
          id: Date.now().toString(),
          created_at: new Date().toISOString(),
          ...assistantData,
          offline: true
        };
        setAssistants(prev => [...prev, offlineAssistant]);
        return true;
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar assistente existente
  const updateAssistant = async (id, updatedData) => {
    if (!hasApiKey()) {
      setApiKeyDialogOpen(true);
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Verificar se é um assistente offline
      const assistant = assistants.find(a => a.id === id);
      if (assistant?.offline) {
        // Atualizar localmente
        const updatedAssistants = assistants.map(a => 
          a.id === id ? { ...a, ...updatedData } : a
        );
        setAssistants(updatedAssistants);
      } else {
        // Atualizar na API
        const updatedAssistant = await apiUpdateAssistant(id, updatedData);
        const updatedAssistants = assistants.map(a => 
          a.id === id ? updatedAssistant : a
        );
        setAssistants(updatedAssistants);
      }
      return true;
    } catch (err) {
      console.error('Error updating assistant:', err);
      setError(err.message || 'Failed to update assistant');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Deletar assistente
  const deleteAssistant = async (id) => {
    if (!hasApiKey() && !assistants.find(a => a.id === id)?.offline) {
      setApiKeyDialogOpen(true);
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Verificar se é um assistente offline
      const assistant = assistants.find(a => a.id === id);
      if (assistant?.offline) {
        // Excluir localmente
        const filteredAssistants = assistants.filter(a => a.id !== id);
        setAssistants(filteredAssistants);
      } else {
        // Excluir da API
        await apiDeleteAssistant(id);
        const filteredAssistants = assistants.filter(a => a.id !== id);
        setAssistants(filteredAssistants);
      }
      return true;
    } catch (err) {
      console.error('Error deleting assistant:', err);
      setError(err.message || 'Failed to delete assistant');
      
      // Se estiver offline, excluir localmente mesmo assim
      if (!navigator.onLine) {
        const filteredAssistants = assistants.filter(a => a.id !== id);
        setAssistants(filteredAssistants);
        return true;
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Obter um assistente pelo ID
  const getAssistant = (id) => {
    return assistants.find(assistant => assistant.id === id) || null;
  };

  // Abrir diálogo de configuração da API key
  const openApiKeyDialog = () => {
    setApiKeyDialogOpen(true);
  };

  // Fechar diálogo de configuração da API key
  const closeApiKeyDialog = (keySet = false) => {
    setApiKeyDialogOpen(false);
    if (keySet) {
      setIsApiKeySet(true);
      loadAssistants();
    }
  };

  return (
    <AssistantsContext.Provider
      value={{
        assistants,
        isLoading,
        error,
        isApiKeySet,
        apiKeyDialogOpen,
        createAssistant,
        updateAssistant,
        deleteAssistant,
        getAssistant,
        openApiKeyDialog,
        closeApiKeyDialog,
        GPT_MODELS,
        refreshAssistants: loadAssistants
      }}
    >
      {children}
    </AssistantsContext.Provider>
  );
};