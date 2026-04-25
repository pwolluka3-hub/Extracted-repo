'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import type { ChatMessage, AttachedFile, AgentIntent, BrandKit } from '@/lib/types';
import { universalChat, analyzeImage, getCurrentModel } from '@/lib/services/aiService';
import { saveChatMessage, loadChatHistory, loadBrandKit, generateId } from '@/lib/services/memoryService';
import { 
  loadAgentMemory, 
  saveAgentMemory,
  buildMemoryContext, 
  addContentIdea, 
  addUserFact, 
  addNicheDetail,
  addAudienceInsight,
  addConversationSummary,
  syncWithBrandKit,
  extractMemoryFromResponse,
  type AgentMemory 
} from '@/lib/services/agentMemoryService';
import { buildSystemPrompt, INTENT_DETECTION_PROMPT, FILE_ANALYSIS_PROMPT } from '@/lib/constants/prompts';
import { runGodModeAnalysis, quickIdeate, callCustomProvider, type GodModeResult } from '@/lib/services/godModeEngine';
import { analyzeMusicMood, type MusicMood } from '@/lib/services/musicEngine';
import { AVAILABLE_MODELS } from '@/lib/services/aiService';
import { kvGet, kvSet } from '@/lib/services/puterService';
import { 
  orchestrate, 
  initializeOrchestrationSystem,
  getOrchestrationStatus,
  runBackgroundEvolution,
  type OrchestrationResult 
} from '@/lib/services/orchestrationEngine';
import { validateContent, makeGovernorDecision, getGovernorDashboard } from '@/lib/services/governorService';
import { getAgentStats, loadAgents, type AgentConfig } from '@/lib/services/multiAgentService';
import { generateAgentImage, generateAgentVideo } from '@/lib/services/agentMediaService';

interface AgentState {
  isOpen: boolean;
  isThinking: boolean;
  currentTask: string | null;
  messages: ChatMessage[];
  pendingFiles: AttachedFile[];
  godModeEnabled: boolean;
  lastGodModeResult: GodModeResult | null;
  currentMusicMood: MusicMood | null;
  // New features
  currentModel: string;
  availableModels: typeof AVAILABLE_MODELS;
  automationEnabled: boolean;
  isVoiceMode: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  // Multi-agent system
  multiAgentEnabled: boolean;
  lastOrchestrationResult: OrchestrationResult | null;
  activeAgents: AgentConfig[];
  governorActive: boolean;
}

interface AgentContextType extends AgentState {
  openAgent: () => void;
  closeAgent: () => void;
  toggleAgent: () => void;
  sendMessage: (content: string, files?: AttachedFile[]) => Promise<void>;
  clearMessages: () => void;
  attachFile: (file: AttachedFile) => void;
  removeFile: (name: string) => void;
  clearFiles: () => void;
  toggleGodMode: () => void;
  runGodMode: (idea: string) => Promise<GodModeResult | null>;
  generateIdeas: (topic: string, count?: number) => Promise<string[]>;
  // New features
  setModel: (model: string) => void;
  toggleAutomation: () => void;
  toggleVoiceMode: () => void;
  startListening: () => void;
  stopListening: () => void;
  speakResponse: (text: string) => void;
  stopSpeaking: () => void;
  // Multi-agent system
  toggleMultiAgent: () => void;
  runOrchestration: (request: string, type?: 'content' | 'strategy' | 'full') => Promise<OrchestrationResult | null>;
  getSystemStatus: () => Promise<{ agentsReady: boolean; agentCount: number; governorEnabled: boolean }>;
  triggerEvolution: () => Promise<void>;
}

export const AgentContext = createContext<AgentContextType | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AgentState>({
    isOpen: false,
    isThinking: false,
    currentTask: null,
    messages: [],
    pendingFiles: [],
    godModeEnabled: false,
    lastGodModeResult: null,
    currentMusicMood: null,
    // New features
    currentModel: 'gpt-4o',
    availableModels: AVAILABLE_MODELS,
    automationEnabled: false,
    isVoiceMode: false,
    isListening: false,
    isSpeaking: false,
    // Multi-agent system
    multiAgentEnabled: true,
    lastOrchestrationResult: null,
    activeAgents: [],
    governorActive: true,
  });

  const initializedRef = useRef(false);

  // Load chat history on first open
  const loadHistory = useCallback(async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    try {
      const history = await loadChatHistory();
      if (history.length > 0) {
        setState(s => ({ ...s, messages: history }));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, []);

  const openAgent = useCallback(() => {
    loadHistory();
    setState(s => ({ ...s, isOpen: true }));
  }, [loadHistory]);

  const closeAgent = useCallback(() => {
    setState(s => ({ ...s, isOpen: false }));
  }, []);

  const toggleAgent = useCallback(() => {
    setState(s => {
      if (!s.isOpen) {
        loadHistory();
      }
      return { ...s, isOpen: !s.isOpen };
    });
  }, [loadHistory]);

  const attachFile = useCallback((file: AttachedFile) => {
    setState(s => ({
      ...s,
      pendingFiles: [...s.pendingFiles, file],
    }));
  }, []);

  const removeFile = useCallback((name: string) => {
    setState(s => ({
      ...s,
      pendingFiles: s.pendingFiles.filter(f => f.name !== name),
    }));
  }, []);

  const clearFiles = useCallback(() => {
    setState(s => ({ ...s, pendingFiles: [] }));
  }, []);

  const clearMessages = useCallback(() => {
    setState(s => ({ ...s, messages: [] }));
  }, []);

  const toggleGodMode = useCallback(() => {
    setState(s => ({ ...s, godModeEnabled: !s.godModeEnabled }));
  }, []);

  const runGodMode = useCallback(async (idea: string): Promise<GodModeResult | null> => {
    setState(s => ({ ...s, isThinking: true, currentTask: 'God Mode Analysis...' }));

    try {
      const brandKit = await loadBrandKit();
      const result = await runGodModeAnalysis(idea, brandKit, { useMultipleModels: true });
      
      // Analyze music mood from the final idea
      const musicMood = await analyzeMusicMood(result.finalIdea);
      
      setState(s => ({ 
        ...s, 
        lastGodModeResult: result,
        currentMusicMood: musicMood,
        isThinking: false, 
        currentTask: null 
      }));

      return result;
    } catch (error) {
      console.error('God Mode error:', error);
      setState(s => ({ ...s, isThinking: false, currentTask: null }));
      return null;
    }
  }, []);

  const generateIdeas = useCallback(async (topic: string, count = 5): Promise<string[]> => {
    setState(s => ({ ...s, isThinking: true, currentTask: 'Generating ideas...' }));

    try {
      const brandKit = await loadBrandKit();
      const ideas = await quickIdeate(topic, brandKit, count);
      setState(s => ({ ...s, isThinking: false, currentTask: null }));
      return ideas;
    } catch (error) {
      console.error('Ideation error:', error);
      setState(s => ({ ...s, isThinking: false, currentTask: null }));
      return [];
    }
  }, []);

  // Model switching
  const setModel = useCallback((model: string) => {
    setState(s => ({ ...s, currentModel: model }));
    kvSet('default_model', model);
    kvSet('ai_model', model);
  }, []);

  // Automation toggle
  const toggleAutomation = useCallback(() => {
    setState(s => ({ ...s, automationEnabled: !s.automationEnabled }));
  }, []);

  // Voice mode
  const toggleVoiceMode = useCallback(() => {
    setState(s => ({ ...s, isVoiceMode: !s.isVoiceMode }));
  }, []);

  const startListening = useCallback(() => {
    setState(s => ({ ...s, isListening: true }));
  }, []);

  const stopListening = useCallback(() => {
    setState(s => ({ ...s, isListening: false }));
  }, []);

  const speakResponse = useCallback(async (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    
    utterance.onstart = () => setState(s => ({ ...s, isSpeaking: true }));
    utterance.onend = () => setState(s => ({ ...s, isSpeaking: false }));
    utterance.onerror = () => setState(s => ({ ...s, isSpeaking: false }));
    
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState(s => ({ ...s, isSpeaking: false }));
  }, []);

  // Detect intent from user message
  const detectIntent = async (message: string, hasFiles: boolean): Promise<AgentIntent> => {
    if (hasFiles) {
      return { type: 'read_file', confidence: 0.95, params: {} };
    }

    const lowerMessage = message.toLowerCase();
    if (/\b(image|photo|picture|poster|thumbnail|artwork|illustration)\b/.test(lowerMessage)) {
      return { type: 'create_image', confidence: 0.9, params: {} };
    }
    if (/\b(video|reel|clip|animation|cinematic|short film)\b/.test(lowerMessage)) {
      return { type: 'make_video', confidence: 0.9, params: {} };
    }

    try {
      const response = await universalChat(
        `${INTENT_DETECTION_PROMPT}\n\nUser message: "${message}"`,
        { model: 'gpt-4o-mini' }
      );
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: parsed.intent || 'answer_question',
          confidence: parsed.confidence || 0.7,
          params: parsed.params || {},
        };
      }
    } catch {
      // Default to general chat
    }

    return { type: 'answer_question', confidence: 0.5, params: {} };
  };

  // Process attached files
  const processFiles = async (files: AttachedFile[]): Promise<string> => {
    const summaries: string[] = [];

    for (const file of files) {
      try {
        if (file.mimeType.startsWith('image/')) {
          const analysis = await analyzeImage(file.data, file.mimeType);
          summaries.push(`[Image: ${file.name}]\n${analysis}`);
        } else if (file.mimeType === 'application/pdf' || file.mimeType.includes('text')) {
          // For text files, decode and summarize
          const text = atob(file.data);
          const response = await universalChat(
            FILE_ANALYSIS_PROMPT.replace('{fileType}', 'document') + '\n\nContent:\n' + text.substring(0, 5000)
          );
          summaries.push(`[Document: ${file.name}]\n${response}`);
        } else {
          summaries.push(`[File: ${file.name}] - Unable to process this file type`);
        }
      } catch (error) {
        summaries.push(`[File: ${file.name}] - Error processing: ${error}`);
      }
    }

    return summaries.join('\n\n');
  };

  // Extract and save memory from conversations
  const extractAndSaveMemory = async (userMessage: string, aiResponse: string, intent: AgentIntent) => {
    try {
      const lowerMessage = userMessage.toLowerCase();
      
      // Check for niche-related statements
      if (lowerMessage.includes('my niche') || lowerMessage.includes('i focus on') || 
          lowerMessage.includes('i specialize in') || lowerMessage.includes('my business is')) {
        // Extract the niche detail
        const nicheMatch = userMessage.match(/(?:my niche is|i focus on|i specialize in|my business is)\s+(.{10,100})/i);
        if (nicheMatch) {
          await addNicheDetail(nicheMatch[1].trim());
        }
      }
      
      // Check for audience-related statements
      if (lowerMessage.includes('my audience') || lowerMessage.includes('my customers') || 
          lowerMessage.includes('my target') || lowerMessage.includes('my followers')) {
        const audienceMatch = userMessage.match(/(?:my audience|my customers|my target|my followers)\s+(?:is|are)\s+(.{10,150})/i);
        if (audienceMatch) {
          await addAudienceInsight(audienceMatch[1].trim());
        }
      }
      
      // Check for content ideas the user shares
      if (lowerMessage.includes('content idea') || lowerMessage.includes('post about') || 
          lowerMessage.includes('create content') || intent.type === 'generate_content') {
        const extracted = extractMemoryFromResponse(aiResponse);
        for (const idea of extracted.ideas.slice(0, 3)) {
          await addContentIdea(idea, 'ai_generated');
        }
      }
      
      // Check for user facts (brand name, goals, etc.)
      if (lowerMessage.includes('my brand') || lowerMessage.includes('my company') || 
          lowerMessage.includes('my business name')) {
        const brandMatch = userMessage.match(/(?:my brand|my company|my business)\s+(?:is|name is|called)\s+([A-Za-z0-9\s]{2,50})/i);
        if (brandMatch) {
          await addUserFact('brand_name', brandMatch[1].trim(), 'user_stated');
        }
      }
      
      // Check for goals
      if (lowerMessage.includes('my goal') || lowerMessage.includes('i want to') || 
          lowerMessage.includes('i aim to')) {
        const goalMatch = userMessage.match(/(?:my goal is|i want to|i aim to)\s+(.{10,150})/i);
        if (goalMatch) {
          await addUserFact('business_goal', goalMatch[1].trim(), 'user_stated');
        }
      }
      
      // Every 10 messages, create a conversation summary
      const messageCount = state.messages.length;
      if (messageCount > 0 && messageCount % 10 === 0) {
        const recentMessages = state.messages.slice(-10);
        const summaryText = recentMessages.map(m => `${m.role}: ${m.content.substring(0, 100)}`).join('\n');
        await addConversationSummary(
          `Discussed: ${recentMessages.map(m => m.content.substring(0, 30)).join(', ')}`,
          [],
          10
        );
      }
    } catch (error) {
      console.error('Error saving memory:', error);
    }
  };

  // Main send message function
  const sendMessage = useCallback(async (content: string, files?: AttachedFile[]) => {
    const attachedFiles = files || state.pendingFiles;
    
    // Create user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
    };

    // Update state with user message
    setState(s => ({
      ...s,
      messages: [...s.messages, userMessage],
      isThinking: true,
      currentTask: 'Processing...',
      pendingFiles: [],
    }));

    // Save user message
    await saveChatMessage(userMessage);

    try {
      // Detect intent
      const intent = await detectIntent(content, attachedFiles.length > 0);
      setState(s => ({ ...s, currentTask: `${intent.type.replace('_', ' ')}...` }));

      // Load brand kit for context
      const brandKit = await loadBrandKit();
      const model = await getCurrentModel();
      
      // Load persistent memory context
      const memoryContext = await buildMemoryContext();
      
      // Sync brand kit with memory if available
      if (brandKit) {
        await syncWithBrandKit(brandKit);
      }

      // Build context from recent messages
      const recentMessages = state.messages.slice(-10);
      const contextMessages = recentMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Process files if attached
      let fileContext = '';
      if (attachedFiles.length > 0) {
        setState(s => ({ ...s, currentTask: 'Analyzing files...' }));
        fileContext = await processFiles(attachedFiles);
      }

      // Build the full prompt with memory context
      const systemPrompt = buildSystemPrompt(brandKit, undefined, memoryContext);
      let userPrompt = content;
      
      if (fileContext) {
        userPrompt = `${content}\n\n--- Attached Files ---\n${fileContext}`;
      }

      if (intent.type === 'create_image') {
        setState(s => ({ ...s, currentTask: 'Generating image...' }));
        const imageResult = await generateAgentImage(userPrompt, {
          preferredModel: state.currentModel,
        });

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: imageResult.content,
          media: imageResult.media,
          timestamp: new Date().toISOString(),
        };

        setState(s => ({
          ...s,
          messages: [...s.messages, assistantMessage],
          isThinking: false,
          currentTask: null,
        }));

        await saveChatMessage(assistantMessage);
        await extractAndSaveMemory(content, imageResult.content, intent);
        return;
      }

      if (intent.type === 'make_video') {
        setState(s => ({ ...s, currentTask: 'Generating video...' }));
        const videoResult = await generateAgentVideo(userPrompt, {
          preferredModel: state.currentModel,
        });

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: videoResult.content,
          media: videoResult.media,
          timestamp: new Date().toISOString(),
        };

        setState(s => ({
          ...s,
          messages: [...s.messages, assistantMessage],
          isThinking: false,
          currentTask: null,
        }));

        await saveChatMessage(assistantMessage);
        await extractAndSaveMemory(content, videoResult.content, intent);
        return;
      }

      // Add action instructions based on intent
      if (intent.type === 'generate_content') {
        userPrompt += '\n\nGenerate engaging social media content based on this. Provide the post text and suggest platforms.';
      } else if (intent.type === 'read_file') {
        userPrompt += '\n\nAnalyze the attached files and suggest how they can be used for social media content.';
      }

      // Call AI
      const response = await universalChat(
        [
          { role: 'system', content: systemPrompt },
          ...contextMessages,
          { role: 'user', content: userPrompt },
        ],
        { model, brandKit }
      );

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      // Update state with response
      setState(s => ({
        ...s,
        messages: [...s.messages, assistantMessage],
        isThinking: false,
        currentTask: null,
      }));

      // Save assistant message
      await saveChatMessage(assistantMessage);
      
      // Extract and save any memory-worthy information from user message and response
      await extractAndSaveMemory(content, response, intent);

    } catch (error) {
      console.error('Agent error:', error);
      
      // Create error message
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `I encountered an error: ${(error as Error).message}. Please try again.`,
        timestamp: new Date().toISOString(),
      };

      setState(s => ({
        ...s,
        messages: [...s.messages, errorMessage],
        isThinking: false,
        currentTask: null,
      }));
    }
  }, [state.currentModel, state.messages, state.pendingFiles]);

  // Multi-agent system methods
  const toggleMultiAgent = useCallback(() => {
    setState(s => ({ ...s, multiAgentEnabled: !s.multiAgentEnabled }));
  }, []);

  const runOrchestration = useCallback(async (
    request: string,
    type: 'content' | 'strategy' | 'full' = 'content'
  ): Promise<OrchestrationResult | null> => {
    try {
      setState(s => ({ ...s, isThinking: true, currentTask: 'Running multi-agent orchestration...' }));
      
      // Initialize system
      await initializeOrchestrationSystem();
      
      // Run orchestration
      const result = await orchestrate(request, {
        requestType: type,
        preferredModel: state.currentModel,
      });
      
      setState(s => ({ 
        ...s, 
        lastOrchestrationResult: result,
        isThinking: false,
        currentTask: null,
      }));
      
      return result;
    } catch (error) {
      console.error('Orchestration error:', error);
      setState(s => ({ ...s, isThinking: false, currentTask: null }));
      return null;
    }
  }, [state.currentModel]);

  const getSystemStatus = useCallback(async () => {
    const status = await getOrchestrationStatus();
    const agents = await loadAgents();
    setState(s => ({ ...s, activeAgents: agents.filter(a => a.evolutionState !== 'deprecated') }));
    return status;
  }, []);

  const triggerEvolution = useCallback(async () => {
    setState(s => ({ ...s, currentTask: 'Running agent evolution cycle...' }));
    try {
      await runBackgroundEvolution();
      // Refresh agents after evolution
      const agents = await loadAgents();
      setState(s => ({ 
        ...s, 
        activeAgents: agents.filter(a => a.evolutionState !== 'deprecated'),
        currentTask: null,
      }));
    } catch (error) {
      console.error('Evolution error:', error);
      setState(s => ({ ...s, currentTask: null }));
    }
  }, []);

  return (
    <AgentContext.Provider
      value={{
        ...state,
        openAgent,
        closeAgent,
        toggleAgent,
        sendMessage,
        clearMessages,
        attachFile,
        removeFile,
        clearFiles,
        toggleGodMode,
        runGodMode,
        generateIdeas,
        setModel,
        toggleAutomation,
        toggleVoiceMode,
        startListening,
        stopListening,
        speakResponse,
        stopSpeaking,
        toggleMultiAgent,
        runOrchestration,
        getSystemStatus,
        triggerEvolution,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}
