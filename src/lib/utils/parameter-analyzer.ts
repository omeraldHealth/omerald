/**
 * Enhanced Parameter Analyzer
 * Analyzes parameter combinations and patterns to identify conditions
 */

export interface Parameter {
  name: string;
  value: string | number;
  unit?: string;
  normalRange?: string;
  isAbnormal?: boolean;
  reportName?: string;
  reportDate?: Date;
}

export interface ParameterCombination {
  parameters: string[];
  condition: string;
  confidence: 'high' | 'medium' | 'low';
  description: string;
}

/**
 * Known parameter combinations that indicate specific conditions
 */
const PARAMETER_COMBINATIONS: ParameterCombination[] = [
  {
    parameters: ['glucose', 'fasting glucose', 'blood sugar', 'hba1c', 'glycated hemoglobin'],
    condition: 'Diabetes',
    confidence: 'high',
    description: 'Elevated glucose and HbA1c indicate diabetes',
  },
  {
    parameters: ['cholesterol', 'ldl', 'triglycerides', 'hdl'],
    condition: 'Hyperlipidemia',
    confidence: 'high',
    description: 'Abnormal lipid profile indicates hyperlipidemia',
  },
  {
    parameters: ['hemoglobin', 'rbc', 'red blood cell', 'hematocrit'],
    condition: 'Anemia',
    confidence: 'high',
    description: 'Low hemoglobin and RBC count indicate anemia',
  },
  {
    parameters: ['tsh', 't3', 't4', 'thyroid'],
    condition: 'Thyroid Disorder',
    confidence: 'high',
    description: 'Abnormal thyroid function tests',
  },
  {
    parameters: ['creatinine', 'bun', 'urea', 'egfr'],
    condition: 'Kidney Disease',
    confidence: 'high',
    description: 'Abnormal kidney function markers',
  },
  {
    parameters: ['alt', 'ast', 'bilirubin', 'liver'],
    condition: 'Liver Disease',
    confidence: 'high',
    description: 'Abnormal liver function tests',
  },
  {
    parameters: ['calcium', 'vitamin d', 'phosphorus'],
    condition: 'Bone Disorder',
    confidence: 'medium',
    description: 'Abnormal bone metabolism markers',
  },
  {
    parameters: ['sodium', 'potassium', 'chloride'],
    condition: 'Electrolyte Imbalance',
    confidence: 'medium',
    description: 'Abnormal electrolyte levels',
  },
];

/**
 * Calculate severity of abnormality (0-1, where 1 is most severe)
 */
export function calculateSeverity(
  value: string | number,
  normalRange?: string
): number {
  if (!normalRange || !value) return 0;
  
  const numValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]/g, '')) 
    : value;
  
  if (isNaN(numValue)) return 0;
  
  // Parse normal range
  const rangeMatch = normalRange.match(/(\d+\.?\d*)\s*[-–—]\s*(\d+\.?\d*)/);
  if (!rangeMatch) return 0;
  
  const min = parseFloat(rangeMatch[1]);
  const max = parseFloat(rangeMatch[2]);
  
  if (isNaN(min) || isNaN(max)) return 0;
  
  const range = max - min;
  const center = (min + max) / 2;
  
  // Calculate deviation from center as percentage of range
  const deviation = Math.abs(numValue - center);
  const severity = Math.min(deviation / (range / 2), 1);
  
  return severity;
}

/**
 * Identify parameter combinations
 */
export function identifyParameterCombinations(
  parameters: Parameter[]
): Array<{
  combination: ParameterCombination;
  matchingParameters: Parameter[];
  severity: number;
}> {
  const abnormalParams = parameters.filter(p => p.isAbnormal);
  const results: Array<{
    combination: ParameterCombination;
    matchingParameters: Parameter[];
    severity: number;
  }> = [];
  
  for (const combination of PARAMETER_COMBINATIONS) {
    const matching: Parameter[] = [];
    
    for (const param of abnormalParams) {
      const paramNameLower = param.name.toLowerCase();
      
      // Check if parameter matches any in the combination
      if (combination.parameters.some(comboParam => 
        paramNameLower.includes(comboParam.toLowerCase()) ||
        comboParam.toLowerCase().includes(paramNameLower)
      )) {
        matching.push(param);
      }
    }
    
    // If we have at least 2 matching parameters, it's a potential combination
    if (matching.length >= 2) {
      // Calculate average severity
      const avgSeverity = matching.reduce((sum, p) => 
        sum + calculateSeverity(p.value, p.normalRange), 0
      ) / matching.length;
      
      results.push({
        combination,
        matchingParameters: matching,
        severity: avgSeverity,
      });
    }
  }
  
  // Sort by severity (highest first)
  results.sort((a, b) => b.severity - a.severity);
  
  return results;
}

/**
 * Analyze parameters for condition patterns
 */
export function analyzeParameterPatterns(
  parameters: Parameter[]
): Array<{
  condition: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
  reasoning: string;
  severity: 'mild' | 'moderate' | 'severe';
}> {
  const combinations = identifyParameterCombinations(parameters);
  const results: Array<{
    condition: string;
    confidence: 'high' | 'medium' | 'low';
    evidence: string[];
    reasoning: string;
    severity: 'mild' | 'moderate' | 'severe';
  }> = [];
  
  for (const { combination, matchingParameters, severity } of combinations) {
    // Determine severity level
    let severityLevel: 'mild' | 'moderate' | 'severe' = 'mild';
    if (severity > 0.5) severityLevel = 'severe';
    else if (severity > 0.2) severityLevel = 'moderate';
    
    results.push({
      condition: combination.condition,
      confidence: combination.confidence,
      evidence: matchingParameters.map(p => `${p.name}: ${p.value} ${p.unit || ''}`),
      reasoning: combination.description,
      severity: severityLevel,
    });
  }
  
  return results;
}

/**
 * Get parameter trends across multiple reports
 */
export function analyzeParameterTrends(
  parametersByReport: Array<{
    reportDate: Date;
    parameters: Parameter[];
  }>
): Array<{
  parameterName: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  values: Array<{ date: Date; value: number }>;
}> {
  // Group parameters by name
  const parameterMap = new Map<string, Array<{ date: Date; value: number }>>();
  
  for (const report of parametersByReport) {
    for (const param of report.parameters) {
      const numValue = typeof param.value === 'string'
        ? parseFloat(param.value.replace(/[^0-9.-]/g, ''))
        : param.value;
      
      if (!isNaN(numValue)) {
        const name = param.name.toLowerCase();
        if (!parameterMap.has(name)) {
          parameterMap.set(name, []);
        }
        parameterMap.get(name)!.push({
          date: report.reportDate,
          value: numValue,
        });
      }
    }
  }
  
  // Analyze trends
  const trends: Array<{
    parameterName: string;
    trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
    values: Array<{ date: Date; value: number }>;
  }> = [];
  
  for (const [name, values] of parameterMap.entries()) {
    if (values.length < 2) continue; // Need at least 2 data points
    
    // Sort by date
    values.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Calculate trend
    let increasing = 0;
    let decreasing = 0;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i].value > values[i - 1].value) increasing++;
      else if (values[i].value < values[i - 1].value) decreasing++;
    }
    
    let trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
    const total = increasing + decreasing;
    
    if (total === 0) {
      trend = 'stable';
    } else if (increasing / total > 0.7) {
      trend = 'increasing';
    } else if (decreasing / total > 0.7) {
      trend = 'decreasing';
    } else {
      trend = 'fluctuating';
    }
    
    trends.push({
      parameterName: name,
      trend,
      values,
    });
  }
  
  return trends;
}

