/**
 * AI Body Impact Analyzer
 * Analyzes member health data to identify body parts impacted by conditions and report parameters
 */

interface BodyPartImpact {
  partName: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  relatedConditions: string[];
  relatedParameters: string[];
  confidence: number;
}

interface AIAnalysisResponse {
  affectedBodyParts: BodyPartImpact[];
  summary?: string;
}

interface MemberHealthData {
  diagnosedConditions: Array<{ condition: string; date?: Date }>;
  reportParameters: Array<{
    name: string;
    value: string | number;
    unit?: string;
    normalRange?: string;
    isAbnormal?: boolean;
  }>;
  reportTypes?: string[]; // Report types to consider
  memberInfo?: {
    age?: number;
    gender?: string;
  };
}

/**
 * Check if OpenAI API is configured
 */
function isAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  prompt: string,
  systemPrompt?: string
): Promise<string | null> {
  if (!isAIConfigured()) {
    console.warn('OpenAI API key not configured');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using cheaper model for analysis
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', response.status, response.statusText, errorData);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return null;
  }
}

/**
 * Analyze body impact from member health data
 */
export async function analyzeBodyImpact(
  healthData: MemberHealthData
): Promise<AIAnalysisResponse | null> {
  if (!isAIConfigured()) {
    return null;
  }

  // Prepare data for AI
  const conditions = healthData.diagnosedConditions.map(dc => 
    typeof dc === 'string' ? dc : dc.condition
  ).filter(Boolean);

  const parameters = healthData.reportParameters
    .filter(p => p.isAbnormal || !p.normalRange) // Focus on abnormal or missing range
    .map(p => ({
      name: p.name,
      value: p.value,
      unit: p.unit || '',
      normalRange: p.normalRange || 'not specified',
      isAbnormal: p.isAbnormal,
    }));

  if (conditions.length === 0 && parameters.length === 0) {
    return {
      affectedBodyParts: [],
      summary: 'No health data available for analysis',
    };
  }

  const systemPrompt = `You are a medical body impact analysis assistant. Analyze health data (diagnosed conditions and lab report parameters) to identify which body parts are affected.

CRITICAL: Prioritize diagnosed conditions as the PRIMARY source for identifying affected body parts. Each diagnosed condition directly indicates which body parts, organs, or systems are impacted.

Return ONLY valid JSON in this exact format:
{
  "affectedBodyParts": [
    {
      "partName": "Chest",
      "severity": "high",
      "description": "Detailed explanation of how this body part is affected, including specific impacts and potential concerns.",
      "relatedConditions": ["Condition Name"],
      "relatedParameters": ["Parameter Name"],
      "confidence": 0.85
    }
  ],
  "summary": "Brief overall summary"
}

Guidelines:
- partName: Use anatomically precise body part names that match these standard regions:
  * Head (Top), Forehead, Eyes, Nose, Mouth/Throat, Neck
  * Left Shoulder, Right Shoulder, Chest (Upper), Chest (Heart)
  * Left Arm, Right Arm
  * Abdomen (Upper), Kidney, Abdomen (Lower)
  * Left Hand, Right Hand
  * Left Leg (Upper), Right Leg (Upper), Left Leg (Lower/Foot), Right Leg (Lower/Foot)
- For each diagnosed condition, identify ALL directly affected body parts, organs, and systems
- severity: "low", "medium", or "high" based on impact level and condition severity
- description: 2-3 sentences explaining the impact, specifically mentioning which diagnosed conditions affect this body part
- relatedConditions: Array of ALL condition names from the input that affect this body part
- relatedParameters: Array of parameter names from the input that indicate issues with this body part
- confidence: Number between 0 and 1 (higher for diagnosed conditions, lower for inferred impacts)
- Only include body parts that are actually affected by the diagnosed conditions or abnormal parameters
- Be medically accurate and specific - map each condition to its primary affected body regions`;

  const reportTypes = healthData.reportTypes || [];
  
  const prompt = `Analyze the following member health data and identify affected body parts:

DIAGNOSED CONDITIONS (PRIMARY SOURCE - Analyze these FIRST):
${conditions.length > 0 ? conditions.map((c, i) => `${i + 1}. ${c}`).join('\n') : 'None'}

REPORT PARAMETERS (Abnormal or Missing Normal Range):
${parameters.length > 0 
  ? parameters.map((p, i) => 
      `${i + 1}. ${p.name}: ${p.value} ${p.unit || ''} (Normal: ${p.normalRange}, Abnormal: ${p.isAbnormal ? 'Yes' : 'Unknown'})`
    ).join('\n')
  : 'None'
}

REPORT TYPES:
${reportTypes.length > 0 ? reportTypes.map((rt, i) => `${i + 1}. ${rt}`).join('\n') : 'None'}

MEMBER INFO:
${healthData.memberInfo?.age ? `Age: ${healthData.memberInfo.age}` : ''}
${healthData.memberInfo?.gender ? `Gender: ${healthData.memberInfo.gender}` : ''}

ANALYSIS INSTRUCTIONS (Follow in this order):
1. PRIMARY: For EACH diagnosed condition, identify ALL directly affected body parts, organs, and anatomical regions
   - Consider the primary organ/system affected by each condition
   - Consider secondary/related body parts that may be impacted
   - Use anatomically precise body part names from the standard list
   - Assign severity based on the condition's typical impact level
   - High severity: Serious conditions (cancer, heart disease, kidney failure, etc.)
   - Medium severity: Moderate conditions (diabetes, hypertension, chronic conditions)
   - Low severity: Mild conditions (allergies, minor infections, etc.)

2. SECONDARY: Analyze abnormal report parameters to identify additional affected body parts
   - Map each abnormal parameter to its associated organ/system
   - Use these to confirm or add to body parts identified from conditions

3. TERTIARY: Consider report types for additional context
   - What body systems or organs do these report types typically examine?
   - Use this to validate findings from conditions and parameters

4. For each identified body part:
   - List ALL related diagnosed conditions that affect it
   - List ALL related abnormal parameters
   - Provide a detailed description explaining how the diagnosed conditions impact this body part
   - Set confidence: 0.9+ for direct condition-body part relationships, 0.7-0.8 for parameter-based, 0.5-0.6 for inferred

IMPORTANT: 
- Every diagnosed condition MUST result in at least one affected body part
- Be comprehensive - if a condition affects multiple body parts, list them all
- Use the exact standard body part names provided in the guidelines
- Be medically accurate about condition-body part relationships

Return only valid JSON, no additional text.`;

  console.log('Calling OpenAI API for body impact analysis...');
  const response = await callOpenAI(prompt, systemPrompt);
  if (!response) {
    console.error('OpenAI API returned null response');
    return null;
  }
  
  console.log('OpenAI API response received:', response.substring(0, 500));

  try {
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return null;
    }

    const result = JSON.parse(jsonMatch[0]) as AIAnalysisResponse;
    
    // Validate and clean the response
    if (!result.affectedBodyParts || !Array.isArray(result.affectedBodyParts)) {
      console.error('Invalid AI response structure');
      return null;
    }

    // Ensure all required fields are present
    result.affectedBodyParts = result.affectedBodyParts.map(part => ({
      partName: part.partName || 'Unknown',
      severity: (['low', 'medium', 'high'].includes(part.severity) 
        ? part.severity 
        : 'low') as 'low' | 'medium' | 'high',
      description: part.description || 'No description available',
      relatedConditions: Array.isArray(part.relatedConditions) ? part.relatedConditions : [],
      relatedParameters: Array.isArray(part.relatedParameters) ? part.relatedParameters : [],
      confidence: typeof part.confidence === 'number' 
        ? Math.max(0, Math.min(1, part.confidence)) 
        : 0.5,
    }));

    return result;
  } catch (error) {
    console.error('Error parsing AI analysis response:', error);
    console.error('Response was:', response);
    return null;
  }
}

/**
 * Map AI analysis to our standardized body parts
 * Enhanced matching to handle various body part name variations from GPT
 */
export function mapAnalysisToBodyParts(
  aiAnalysis: AIAnalysisResponse,
  bodyPartsMapping: typeof import('./bodyPartsMapping').BODY_PARTS
): Array<{
  partId: string;
  partName: string;
  severity: 'low' | 'medium' | 'high';
  impactDescription: string;
  relatedConditions: string[];
  relatedParameters: string[];
  confidence: number;
}> {
  const mappedParts: Map<string, {
    partId: string;
    partName: string;
    severity: 'low' | 'medium' | 'high';
    impactDescription: string;
    relatedConditions: Set<string>;
    relatedParameters: Set<string>;
    confidence: number;
    severityScores: number[];
  }> = new Map();

  // Enhanced body part name matching with synonyms and variations
  const bodyPartSynonyms: Record<string, string[]> = {
    'head': ['head', 'skull', 'brain', 'cerebral', 'neurological', 'head-top'],
    'forehead': ['forehead', 'frontal', 'frontal sinus'],
    'eyes': ['eye', 'eyes', 'vision', 'retina', 'cornea', 'ocular', 'visual'],
    'nose': ['nose', 'nasal', 'sinus', 'sinuses', 'rhinitis'],
    'mouth-throat': ['mouth', 'throat', 'oral', 'pharynx', 'larynx', 'tongue', 'teeth', 'gums'],
    'neck': ['neck', 'cervical', 'thyroid', 'trachea', 'esophagus'],
    'chest-upper': ['chest', 'lungs', 'pulmonary', 'respiratory', 'bronchi', 'bronchial', 'upper chest'],
    'chest-heart': ['heart', 'cardiac', 'cardiovascular', 'myocardial', 'coronary'],
    'abdomen-upper': ['abdomen', 'stomach', 'gastric', 'liver', 'hepatic', 'gallbladder', 'spleen', 'upper abdomen'],
    'kidney': ['kidney', 'kidneys', 'renal', 'nephron', 'nephritis', 'nephropathy'],
    'abdomen-lower': ['intestines', 'bowel', 'colon', 'rectal', 'appendix', 'pancreas', 'lower abdomen'],
  };

  // Map each AI-identified body part to our standardized parts
  for (const aiPart of aiAnalysis.affectedBodyParts) {
    const aiPartNameLower = aiPart.partName.toLowerCase().trim();
    
    // Find matching body part using multiple strategies
    let matchedPart = bodyPartsMapping.find(part => {
      // Strategy 1: Exact name match
      if (part.name.toLowerCase() === aiPartNameLower || part.id === aiPartNameLower) {
        return true;
      }
      
      // Strategy 2: Keyword matching
      if (part.keywords.some(keyword => aiPartNameLower.includes(keyword.toLowerCase()))) {
        return true;
      }
      
      // Strategy 3: Reverse keyword matching (AI part name contains our keywords)
      if (part.keywords.some(keyword => keyword.toLowerCase().includes(aiPartNameLower))) {
        return true;
      }
      
      // Strategy 4: Synonym matching
      for (const [key, synonyms] of Object.entries(bodyPartSynonyms)) {
        if (synonyms.some(syn => aiPartNameLower.includes(syn.toLowerCase()))) {
          if (part.id === key || part.name.toLowerCase().includes(key)) {
            return true;
          }
        }
      }
      
      // Strategy 5: Partial word matching for compound names
      const aiWords = aiPartNameLower.split(/[\s\/\-\(\)]+/);
      const partWords = part.name.toLowerCase().split(/[\s\/\-\(\)]+/);
      if (aiWords.some(aiWord => partWords.includes(aiWord) && aiWord.length > 3)) {
        return true;
      }
      
      return false;
    });

    // If no match found, try to find by common medical terms
    if (!matchedPart) {
      // Try matching by organ/system names
      const organMappings: Record<string, string> = {
        'brain': 'head-top',
        'lung': 'chest-upper',
        'heart': 'chest-heart',
        'liver': 'abdomen-upper',
        'kidney': 'kidney',
        'stomach': 'abdomen-upper',
        'intestine': 'abdomen-lower',
        'colon': 'abdomen-lower',
        'pancreas': 'abdomen-lower',
        'thyroid': 'neck',
        'shoulder': 'left-shoulder', // Default to left, will be handled by both sides if needed
      };
      
      for (const [organ, partId] of Object.entries(organMappings)) {
        if (aiPartNameLower.includes(organ)) {
          matchedPart = bodyPartsMapping.find(p => p.id === partId);
          if (matchedPart) break;
        }
      }
    }

    if (matchedPart) {
      const existing = mappedParts.get(matchedPart.id);
      const severityScore = aiPart.severity === 'high' ? 3 : aiPart.severity === 'medium' ? 2 : 1;

      if (existing) {
        // Aggregate if part already exists
        existing.relatedConditions = new Set([
          ...Array.from(existing.relatedConditions),
          ...aiPart.relatedConditions,
        ]);
        existing.relatedParameters = new Set([
          ...Array.from(existing.relatedParameters),
          ...aiPart.relatedParameters,
        ]);
        existing.severityScores.push(severityScore);
        existing.confidence = Math.max(existing.confidence, aiPart.confidence);
        // Combine descriptions with better formatting
        const newDesc = aiPart.description.trim();
        if (newDesc && !existing.impactDescription.includes(newDesc)) {
          existing.impactDescription += ` ${newDesc}`;
        }
      } else {
        mappedParts.set(matchedPart.id, {
          partId: matchedPart.id,
          partName: matchedPart.name,
          severity: aiPart.severity,
          impactDescription: aiPart.description,
          relatedConditions: new Set(aiPart.relatedConditions),
          relatedParameters: new Set(aiPart.relatedParameters),
          confidence: aiPart.confidence,
          severityScores: [severityScore],
        });
      }
    } else {
      // Log unmatched parts for debugging
      console.warn(`Could not map AI body part: "${aiPart.partName}" to any standard body part`);
    }
  }

  // Convert to final format and determine final severity
  return Array.from(mappedParts.values()).map(part => {
    // Determine final severity based on highest score
    const maxSeverityScore = Math.max(...part.severityScores);
    const finalSeverity: 'low' | 'medium' | 'high' = 
      maxSeverityScore >= 3 ? 'high' : 
      maxSeverityScore >= 2 ? 'medium' : 
      'low';

    return {
      partId: part.partId,
      partName: part.partName,
      severity: finalSeverity,
      impactDescription: part.impactDescription.trim(),
      relatedConditions: Array.from(part.relatedConditions),
      relatedParameters: Array.from(part.relatedParameters),
      confidence: part.confidence,
    };
  });
}

