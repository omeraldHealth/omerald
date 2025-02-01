/**
 * Condition Validator
 * Validates and normalizes diagnostic condition names
 */

// Common medical condition patterns (whitelist approach)
const COMMON_CONDITIONS = [
  'diabetes', 'hypertension', 'anemia', 'hyperlipidemia', 'hypothyroidism',
  'hyperthyroidism', 'asthma', 'copd', 'arthritis', 'osteoporosis', 'obesity',
  'anxiety', 'depression', 'migraine', 'epilepsy', 'parkinson', 'alzheimer',
  'heart disease', 'cardiovascular disease', 'stroke', 'kidney disease',
  'liver disease', 'hepatitis', 'cirrhosis', 'gastritis', 'ulcer',
  'irritable bowel', 'crohn', 'colitis', 'celiac', 'lactose intolerance',
  'allergy', 'eczema', 'psoriasis', 'dermatitis', 'acne', 'vitiligo',
  'osteoporosis', 'osteopenia', 'gout', 'fibromyalgia', 'lupus', 'rheumatoid',
  'multiple sclerosis', 'als', 'als', 'huntington', 'tourette',
  'adhd', 'autism', 'bipolar', 'schizophrenia', 'ptsd', 'ocd',
  'cancer', 'tumor', 'malignancy', 'benign', 'polyp', 'cyst',
  'infection', 'bacterial', 'viral', 'fungal', 'parasitic',
  'pneumonia', 'bronchitis', 'sinusitis', 'tonsillitis', 'pharyngitis',
  'urinary tract infection', 'uti', 'kidney infection', 'bladder infection',
  'high cholesterol', 'triglycerides', 'metabolic syndrome', 'insulin resistance',
  'pcos', 'endometriosis', 'fibroids', 'menopause', 'osteoporosis',
  'anemia', 'iron deficiency', 'b12 deficiency', 'folate deficiency',
  'vitamin d deficiency', 'calcium deficiency', 'magnesium deficiency',
];

// Terms to exclude (blacklist)
const EXCLUDED_TERMS = [
  'test', 'report', 'lab', 'laboratory', 'diagnostic', 'center',
  'normal', 'abnormal', 'within range', 'out of range', 'reference',
  'sample', 'specimen', 'collection', 'analysis', 'result',
  'parameter', 'value', 'unit', 'range', 'finding', 'observation',
  'procedure', 'examination', 'screening', 'checkup', 'routine',
  'follow-up', 'review', 'assessment', 'evaluation', 'consultation',
];

/**
 * Normalize condition name
 */
export function normalizeConditionName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  
  // Remove extra whitespace
  let normalized = name.trim();
  
  // Remove common prefixes/suffixes
  normalized = normalized.replace(/^(diagnosis|diagnosed|condition|disease|disorder|syndrome):\s*/i, '');
  normalized = normalized.replace(/\s*(diagnosis|diagnosed|condition|disease|disorder|syndrome)$/i, '');
  
  // Capitalize first letter of each word (title case)
  normalized = normalized.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return normalized;
}

/**
 * Check if condition name is valid
 */
export function isValidConditionName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  
  const normalized = normalizeConditionName(name).toLowerCase();
  
  // Check minimum length
  if (normalized.length < 3) return false;
  
  // Check if it's an excluded term
  if (EXCLUDED_TERMS.some(term => normalized.includes(term))) {
    return false;
  }
  
  // Check if it looks like a test name (contains numbers, units, etc.)
  if (/\d+/.test(normalized) && /(mg|ml|g|kg|cm|mm|unit|iu|mmol|mol)/i.test(normalized)) {
    return false;
  }
  
  // Check if it's too generic
  const genericTerms = ['abnormal', 'elevated', 'decreased', 'high', 'low', 'positive', 'negative'];
  if (genericTerms.includes(normalized)) {
    return false;
  }
  
  return true;
}

/**
 * Check if condition is age-appropriate
 */
export function isAgeAppropriate(condition: string, age?: number): boolean {
  if (!age) return true; // Can't validate without age
  
  const conditionLower = condition.toLowerCase();
  
  // Pediatric conditions
  const pediatricConditions = ['adhd', 'autism', 'developmental delay'];
  if (age < 18 && !pediatricConditions.some(c => conditionLower.includes(c))) {
    // Some conditions are less common in children, but don't exclude
    return true;
  }
  
  // Adult conditions
  const adultConditions = ['menopause', 'andropause', 'prostate', 'osteoporosis'];
  if (age < 40 && adultConditions.some(c => conditionLower.includes(c))) {
    return false; // Less likely in younger adults
  }
  
  return true;
}

/**
 * Check if condition is gender-appropriate
 */
export function isGenderAppropriate(condition: string, gender?: string): boolean {
  if (!gender) return true; // Can't validate without gender
  
  const conditionLower = condition.toLowerCase();
  
  // Female-specific conditions
  const femaleConditions = ['pcos', 'endometriosis', 'fibroids', 'menopause', 'pregnancy'];
  if (gender.toLowerCase() !== 'female' && femaleConditions.some(c => conditionLower.includes(c))) {
    return false;
  }
  
  // Male-specific conditions
  const maleConditions = ['prostate', 'andropause', 'testicular'];
  if (gender.toLowerCase() !== 'male' && maleConditions.some(c => conditionLower.includes(c))) {
    return false;
  }
  
  return true;
}

/**
 * Calculate similarity between two condition names (0-1)
 */
export function calculateSimilarity(name1: string, name2: string): number {
  const n1 = normalizeConditionName(name1).toLowerCase();
  const n2 = normalizeConditionName(name2).toLowerCase();
  
  if (n1 === n2) return 1.0;
  
  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) {
    return 0.8;
  }
  
  // Simple word-based similarity
  const words1 = new Set(n1.split(/\s+/));
  const words2 = new Set(n2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Check if condition is a duplicate of existing conditions
 */
export function isDuplicate(
  newCondition: string,
  existingConditions: Array<string | { condition?: string }>,
  threshold: number = 0.7
): boolean {
  const normalizedNew = normalizeConditionName(newCondition).toLowerCase();
  
  for (const existing of existingConditions) {
    const existingName = typeof existing === 'string' 
      ? existing 
      : (existing?.condition || '');
    
    const normalizedExisting = normalizeConditionName(existingName).toLowerCase();
    
    if (calculateSimilarity(normalizedNew, normalizedExisting) >= threshold) {
      return true;
    }
  }
  
  return false;
}

/**
 * Validate condition with full context
 */
export interface ValidationResult {
  isValid: boolean;
  normalizedName: string;
  reasons: string[];
  warnings: string[];
}

export function validateCondition(
  condition: string,
  context: {
    age?: number;
    gender?: string;
    existingConditions?: Array<string | { condition?: string }>;
  }
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    normalizedName: normalizeConditionName(condition),
    reasons: [],
    warnings: [],
  };
  
  // Basic validation
  if (!isValidConditionName(condition)) {
    result.isValid = false;
    result.reasons.push('Invalid condition name format');
    return result;
  }
  
  // Age appropriateness
  if (context.age !== undefined && !isAgeAppropriate(condition, context.age)) {
    result.warnings.push(`Condition may not be age-appropriate for age ${context.age}`);
  }
  
  // Gender appropriateness
  if (context.gender && !isGenderAppropriate(condition, context.gender)) {
    result.isValid = false;
    result.reasons.push(`Condition is not gender-appropriate for ${context.gender}`);
    return result;
  }
  
  // Duplicate check
  if (context.existingConditions && isDuplicate(condition, context.existingConditions)) {
    result.warnings.push('Similar condition already exists');
  }
  
  return result;
}

