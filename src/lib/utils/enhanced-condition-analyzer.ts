/**
 * Enhanced Condition Analyzer
 * Uses GPT with confidence scoring and smart filtering
 */

import { calculateSeverity, analyzeParameterPatterns, identifyParameterCombinations } from './parameter-analyzer';
import { ConditionSuggestion } from './condition-filter';

export interface Parameter {
  name: string;
  value: string | number;
  unit?: string;
  normalRange?: string;
  isAbnormal?: boolean;
  reportName?: string;
  reportDate?: Date;
}

/**
 * Enhanced GPT analysis with confidence scoring
 */
export async function analyzeParametersForConditionsEnhanced(
  abnormalParameters: Parameter[],
  memberInfo: { age?: number; gender?: string },
  existingConditions: Array<string | { condition?: string }> = []
): Promise<ConditionSuggestion[]> {
  if (!process.env.OPENAI_API_KEY || abnormalParameters.length === 0) {
    return [];
  }

  try {
    // First, analyze parameter patterns locally
    const patternResults = analyzeParameterPatterns(abnormalParameters);
    const parameterCombinations = identifyParameterCombinations(abnormalParameters);
    
    // Build enhanced prompt
    const parameterDetails = abnormalParameters.map((p, i) => {
      const severity = calculateSeverity(p.value, p.normalRange);
      const severityLevel = severity > 0.5 ? 'SEVERE' : severity > 0.2 ? 'MODERATE' : 'MILD';
      
      return `${i + 1}. ${p.name}: ${p.value} ${p.unit || ''} 
    Normal Range: ${p.normalRange || 'Not specified'}
    Severity: ${severityLevel} (${(severity * 100).toFixed(0)}% deviation)`;
    }).join('\n');

    const combinationDetails = parameterCombinations.map(combo => 
      `- ${combo.combination.condition}: ${combo.matchingParameters.map(p => p.name).join(', ')} (${combo.severity > 0.5 ? 'SEVERE' : 'MODERATE'})`
    ).join('\n');

    const existingConditionsList = existingConditions.map(c => 
      typeof c === 'string' ? c : (c?.condition || '')
    ).filter(c => c).join(', ');

    const prompt = `You are a medical AI assistant analyzing lab report parameters to identify potential diagnosed conditions.

ABNORMAL PARAMETERS:
${parameterDetails}

PARAMETER COMBINATIONS DETECTED:
${combinationDetails || 'None detected'}

MEMBER INFO:
${memberInfo.age ? `- Age: ${memberInfo.age} years` : ''}
${memberInfo.gender ? `- Gender: ${memberInfo.gender}` : ''}
${existingConditionsList ? `- Existing Conditions: ${existingConditionsList}` : ''}

Based on this analysis, suggest potential diagnosed conditions with:
1. Condition name (use standard medical terminology)
2. Confidence level (high/medium/low) based on:
   - High: Multiple abnormal parameters strongly supporting the condition, or parameter combinations
   - Medium: Some supporting parameters or moderate evidence
   - Low: Weak or isolated evidence
3. Supporting evidence (which parameters support this condition)
4. Clinical reasoning (brief explanation)
5. Severity (mild/moderate/severe) based on parameter deviations

IMPORTANT GUIDELINES:
- Only suggest well-established medical conditions
- Avoid test names, procedure names, or non-medical terms
- Consider age and gender appropriateness
- Higher confidence for conditions with multiple supporting parameters
- Lower confidence for isolated abnormalities
- Do NOT suggest conditions that are already in existing conditions list
- Be specific but not overly technical

Return ONLY valid JSON in this exact format:
{
  "conditions": [
    {
      "name": "Condition Name",
      "confidence": "high|medium|low",
      "evidence": ["Parameter 1", "Parameter 2"],
      "reasoning": "Brief explanation of why this condition is suggested",
      "severity": "mild|moderate|severe"
    }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a medical assistant. Return only valid JSON objects with condition suggestions including confidence scores and evidence.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2, // Lower temperature for more consistent results
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return [];
    }

    const result = JSON.parse(jsonMatch[0]);
    
    if (!result.conditions || !Array.isArray(result.conditions)) {
      return [];
    }

    // Convert to ConditionSuggestion format
    const suggestions: ConditionSuggestion[] = result.conditions
      .filter((c: any) => c.name && typeof c.name === 'string')
      .map((c: any) => ({
        condition: c.name.trim(),
        confidence: (c.confidence || 'medium') as 'high' | 'medium' | 'low',
        source: 'parameter_analysis' as const,
        evidence: Array.isArray(c.evidence) ? c.evidence : [],
        reasoning: c.reasoning || '',
        severity: (c.severity || 'mild') as 'mild' | 'moderate' | 'severe',
      }));

    // Add pattern-based suggestions
    for (const pattern of patternResults) {
      // Check if already suggested
      const alreadySuggested = suggestions.some(
        s => s.condition.toLowerCase() === pattern.condition.toLowerCase()
      );
      
      if (!alreadySuggested) {
        suggestions.push({
          condition: pattern.condition,
          confidence: pattern.confidence,
          source: 'parameter_analysis',
          evidence: pattern.evidence,
          reasoning: pattern.reasoning,
          severity: pattern.severity,
        });
      }
    }

    return suggestions;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return [];
  }
}

/**
 * Enhanced report type analysis with confidence scoring
 */
export async function suggestConditionsFromReportTypesEnhanced(
  reportTypes: string[],
  memberInfo?: { age?: number; gender?: string },
  existingConditions: Array<string | { condition?: string }> = []
): Promise<ConditionSuggestion[]> {
  if (!process.env.OPENAI_API_KEY || reportTypes.length === 0) {
    return [];
  }

  try {
    const existingConditionsList = existingConditions.map(c => 
      typeof c === 'string' ? c : (c?.condition || '')
    ).filter(c => c).join(', ');

    const prompt = `You are a medical assistant. Analyze the following medical report types and suggest potential diagnosed conditions that these reports typically indicate or screen for.

REPORT TYPES:
${reportTypes.map((rt, i) => `${i + 1}. ${rt}`).join('\n')}

MEMBER INFO:
${memberInfo?.age ? `- Age: ${memberInfo.age} years` : ''}
${memberInfo?.gender ? `- Gender: ${memberInfo.gender}` : ''}
${existingConditionsList ? `- Existing Conditions: ${existingConditionsList}` : ''}

Based on these report types, suggest potential diagnosed conditions. Consider:
1. What medical conditions do these report types typically screen for or diagnose?
2. What conditions are commonly associated with these types of tests?
3. Focus on common, well-established medical conditions
4. Be specific but not overly technical
5. Consider test combinations (multiple related tests = stronger signal)
6. Higher confidence for specific diagnostic tests, lower for general screening

IMPORTANT:
- Only suggest well-established medical conditions
- Do NOT suggest conditions already in existing conditions list
- Avoid test names, procedure names, or non-medical terms

Return ONLY valid JSON in this format:
{
  "conditions": [
    {
      "name": "Condition Name",
      "confidence": "high|medium|low",
      "evidence": ["Report Type 1", "Report Type 2"],
      "reasoning": "Brief explanation",
      "severity": "mild|moderate|severe"
    }
  ]
}

Example: If report types include "Lipid Profile", "HbA1c", "Complete Blood Count", you might suggest:
{
  "conditions": [
    {
      "name": "Diabetes",
      "confidence": "high",
      "evidence": ["HbA1c"],
      "reasoning": "HbA1c is a specific test for diabetes monitoring",
      "severity": "moderate"
    },
    {
      "name": "Hyperlipidemia",
      "confidence": "high",
      "evidence": ["Lipid Profile"],
      "reasoning": "Lipid profile directly tests for lipid disorders",
      "severity": "moderate"
    }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a medical assistant. Return only valid JSON objects with condition suggestions including confidence scores.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return [];
    }

    const result = JSON.parse(jsonMatch[0]);
    
    if (!result.conditions || !Array.isArray(result.conditions)) {
      return [];
    }

    return result.conditions
      .filter((c: any) => c.name && typeof c.name === 'string')
      .map((c: any) => ({
        condition: c.name.trim(),
        confidence: (c.confidence || 'medium') as 'high' | 'medium' | 'low',
        source: 'report_type' as const,
        evidence: Array.isArray(c.evidence) ? c.evidence : [reportTypes.join(', ')],
        reasoning: c.reasoning || '',
        severity: (c.severity || 'mild') as 'mild' | 'moderate' | 'severe',
      }));
  } catch (error) {
    console.error('Error calling OpenAI API for report type analysis:', error);
    return [];
  }
}

