/**
 * Report Type Analyzer
 * Analyzes report types to suggest diagnostic conditions and body impact
 */

interface ReportType {
  testName?: string;
  name?: string;
  type?: string;
  description?: string;
  keywords?: Array<{ keyword: string; alias?: string[] }>;
}

/**
 * Use GPT to suggest diagnostic conditions based on report types
 */
export async function suggestConditionsFromReportTypes(
  reportTypes: string[],
  memberInfo?: { age?: number; gender?: string }
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY || reportTypes.length === 0) {
    return [];
  }

  try {
    const prompt = `You are a medical assistant. Analyze the following medical report types and suggest potential diagnosed conditions that these reports typically indicate or screen for.

REPORT TYPES:
${reportTypes.map((rt, i) => `${i + 1}. ${rt}`).join('\n')}

MEMBER INFO:
${memberInfo?.age ? `Age: ${memberInfo.age}` : ''}
${memberInfo?.gender ? `Gender: ${memberInfo.gender}` : ''}

Based on these report types, suggest potential diagnosed conditions. Consider:
1. What medical conditions do these report types typically screen for or diagnose?
2. What conditions are commonly associated with these types of tests?
3. Focus on common, well-established medical conditions
4. Be specific but not overly technical
5. Return only condition names

Return ONLY a JSON array of condition names, like this:
["Condition 1", "Condition 2", "Condition 3"]

Example: If report types include "Lipid Profile", "HbA1c", "Complete Blood Count", you might suggest: ["Diabetes", "Hyperlipidemia", "Anemia", "Cardiovascular Disease"]`;

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
            content: 'You are a medical assistant. Return only valid JSON arrays of condition names.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in AI response');
      return [];
    }

    const conditions = JSON.parse(jsonMatch[0]);
    if (Array.isArray(conditions)) {
      return conditions.filter(c => typeof c === 'string' && c.trim().length > 0);
    }

    return [];
  } catch (error) {
    console.error('Error calling OpenAI API for report type analysis:', error);
    return [];
  }
}

/**
 * Get unique report types from reports array
 */
export function extractReportTypes(reports: any[]): string[] {
  const reportTypes = new Set<string>();

  for (const report of reports) {
    // Try multiple fields that might contain report type
    const type = report.type || report.documentType || report.testName || report.name;
    if (type && typeof type === 'string' && type.trim().length > 0) {
      // Skip if it looks like an ObjectId (MongoDB ID)
      if (type.length > 20 && /^[a-f0-9]{20,}$/i.test(type)) {
        continue;
      }
      reportTypes.add(type.trim());
    }
  }

  return Array.from(reportTypes);
}

/**
 * Get report types from profile (if stored)
 */
export function getProfileReportTypes(profile: any): string[] {
  if (!profile) return [];
  
  const reportTypes = profile.reportTypes || [];
  return Array.isArray(reportTypes) 
    ? reportTypes.filter((rt: any) => typeof rt === 'string' && rt.trim().length > 0)
    : [];
}

/**
 * Combine report types from reports and profile
 */
export function getAllReportTypes(reports: any[], profile?: any): string[] {
  const reportTypesFromReports = extractReportTypes(reports);
  const reportTypesFromProfile = profile ? getProfileReportTypes(profile) : [];
  
  // Combine and deduplicate
  const allTypes = new Set([...reportTypesFromReports, ...reportTypesFromProfile]);
  return Array.from(allTypes);
}







