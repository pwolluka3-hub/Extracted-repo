/**
 * NEXUS AI CORE MODULE EXPORTS
 * Central export point for all core system components
 */

// NexusCore - Main Engine
export { 
  NexusCore, 
  nexusCore,
  type NexusRequest,
  type NexusResult,
  type NexusMetadata,
  type NexusState,
} from './NexusCore';

// Provider Router
export {
  ProviderRouter,
  providerRouter,
  type Provider,
  type ProviderType,
  type ProviderStatus,
  type ProviderCapability,
  type ProviderResponse,
  type ProviderSelectionCriteria,
} from './ProviderRouter';

// Governor System
export {
  GovernorSystem,
  governorSystem,
  type GovernorValidation,
  type GovernorIssue,
  type GovernorAction,
  type GovernorConfig,
  type GovernorState,
  type ValidationContext,
} from './GovernorSystem';

// Viral Scoring Engine
export {
  ViralScoringEngine,
  viralScoringEngine,
  type ViralScore,
  type ScoreBreakdown,
} from './ViralScoringEngine';

// Memory Manager
export {
  MemoryManager,
  memoryManager,
  type MemoryContext,
  type BrandMemory,
  type ContentHistoryEntry,
  type PerformanceLogEntry,
  type AgentLogEntry,
  type LearningInsight,
} from './MemoryManager';

// Learning System
export {
  LearningSystem,
  learningSystem,
  type LearnedPattern,
  type PatternType,
  type SuccessRecord,
  type PatternAnalysis,
} from './LearningSystem';

// Automation Engine
export {
  AutomationEngine,
  automationEngine,
  type AutomationConfig,
  type AutomationState,
  type AutomationOutput,
  type AutomationStats,
} from './AutomationEngine';
