/**
 * Condition Filter
 * Filters and ranks suggested conditions based on confidence and validation
 */

import { validateCondition, normalizeConditionName } from './condition-validator';

export interface ConditionSuggestion {
  condition: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'parameter_analysis' | 'report_type' | 'explicit_mention' | 'ai_analysis';
  evidence?: string[];
  reasoning?: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface FilteredCondition extends ConditionSuggestion {
  normalizedName: string;
  validationScore: number;
  shouldAutoAdd: boolean;
}

/**
 * Calculate validation score (0-100)
 */
function calculateValidationScore(
  suggestion: ConditionSuggestion,
  context: {
    age?: number;
    gender?: string;
    existingConditions?: Array<string | { condition?: string }>;
  }
): number {
  let score = 0;
  
  // Confidence scoring
  switch (suggestion.confidence) {
    case 'high':
      score += 50;
      break;
    case 'medium':
      score += 30;
      break;
    case 'low':
      score += 10;
      break;
  }
  
  // Source scoring
  switch (suggestion.source) {
    case 'explicit_mention':
      score += 30; // Highest priority - mentioned in report
      break;
    case 'parameter_analysis':
      score += 25; // Strong evidence from parameters
      break;
    case 'report_type':
      score += 15; // Moderate evidence
      break;
    case 'ai_analysis':
      score += 20; // AI analysis
      break;
  }
  
  // Evidence scoring
  if (suggestion.evidence && suggestion.evidence.length > 0) {
    score += Math.min(suggestion.evidence.length * 5, 20); // Up to 20 points for evidence
  }
  
  // Severity scoring
  if (suggestion.severity) {
    switch (suggestion.severity) {
      case 'severe':
        score += 10;
        break;
      case 'moderate':
        score += 5;
        break;
      case 'mild':
        score += 2;
        break;
    }
  }
  
  // Validate condition
  const validation = validateCondition(suggestion.condition, context);
  if (!validation.isValid) {
    return 0; // Invalid conditions get 0 score
  }
  
  // Penalize warnings
  score -= validation.warnings.length * 5;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine if condition should be auto-added
 */
function shouldAutoAdd(
  suggestion: ConditionSuggestion,
  validationScore: number,
  autoAddThreshold: number = 85
): boolean {
  // Must have high confidence
  if (suggestion.confidence !== 'high') {
    return false;
  }
  
  // Must meet validation score threshold
  if (validationScore < autoAddThreshold) {
    return false;
  }
  
  // Must have strong evidence
  if (!suggestion.evidence || suggestion.evidence.length < 2) {
    // Exception: explicit mentions can auto-add with less evidence
    if (suggestion.source === 'explicit_mention' && suggestion.evidence && suggestion.evidence.length >= 1) {
      return true;
    }
    return false;
  }
  
  return true;
}

/**
 * Filter and rank conditions
 */
export function filterConditions(
  suggestions: ConditionSuggestion[],
  context: {
    age?: number;
    gender?: string;
    existingConditions?: Array<string | { condition?: string }>;
    autoAddThreshold?: number;
  }
): FilteredCondition[] {
  const autoAddThreshold = context.autoAddThreshold || 85;
  
  // Filter and score each suggestion
  const filtered: FilteredCondition[] = [];
  
  for (const suggestion of suggestions) {
    // Validate condition
    const validation = validateCondition(suggestion.condition, context);
    
    if (!validation.isValid) {
      continue; // Skip invalid conditions
    }
    
    // Calculate validation score
    const validationScore = calculateValidationScore(suggestion, context);
    
    // Skip if score is too low
    if (validationScore < 30) {
      continue;
    }
    
    // Check for duplicates
    const normalizedName = normalizeConditionName(suggestion.condition);
    const isDuplicate = filtered.some(
      f => normalizeConditionName(f.condition).toLowerCase() === normalizedName.toLowerCase()
    );
    
    if (isDuplicate) {
      continue; // Skip duplicates
    }
    
    // Determine if should auto-add
    const canAutoAdd = shouldAutoAdd(suggestion, validationScore, autoAddThreshold);
    
    filtered.push({
      ...suggestion,
      normalizedName,
      validationScore,
      shouldAutoAdd: canAutoAdd,
    });
  }
  
  // Sort by validation score (highest first)
  filtered.sort((a, b) => b.validationScore - a.validationScore);
  
  return filtered;
}

/**
 * Separate conditions into auto-add and manual review
 */
export function separateConditions(
  filtered: FilteredCondition[]
): {
  autoAdd: FilteredCondition[];
  manualReview: FilteredCondition[];
} {
  return {
    autoAdd: filtered.filter(c => c.shouldAutoAdd),
    manualReview: filtered.filter(c => !c.shouldAutoAdd),
  };
}

