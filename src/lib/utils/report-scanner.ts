/**
 * Enhanced Report Scanner
 * Uses GPT Vision to extract text from PDFs/images and identify diagnostic conditions
 */

interface ReportFile {
  url: string;
  reportId: string;
  reportName?: string;
  reportDate?: Date;
  type?: 'pdf' | 'image';
}

interface ScannedReportData {
  reportId: string;
  extractedText: string;
  identifiedConditions: string[];
  parameters: Array<{
    name: string;
    value: string | number;
    unit?: string;
    normalRange?: string;
    isAbnormal?: boolean;
  }>;
  scannedAt: Date;
}

interface ReportPattern {
  reportId: string;
  conditions: string[];
  parameters: string[];
  scannedAt: Date;
}

/**
 * Check if OpenAI API is configured
 */
function isAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Download file from URL and convert to base64
 */
async function downloadAndConvertToBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': '*/*',
      },
    });

    if (!response.ok) {
      console.error(`Failed to download file: ${response.status} ${response.statusText}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Determine MIME type from response or URL
    const contentType = response.headers.get('content-type') || '';
    let mimeType = contentType;

    if (!mimeType) {
      // Infer from URL extension
      if (url.toLowerCase().includes('.pdf') || url.toLowerCase().endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else if (url.toLowerCase().match(/\.(jpg|jpeg)$/i)) {
        mimeType = 'image/jpeg';
      } else if (url.toLowerCase().match(/\.png$/i)) {
        mimeType = 'image/png';
      } else if (url.toLowerCase().match(/\.(gif|webp)$/i)) {
        mimeType = url.toLowerCase().includes('gif') ? 'image/gif' : 'image/webp';
      } else {
        mimeType = 'application/octet-stream';
      }
    }

    return { base64, mimeType };
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}

/**
 * Extract text from PDF/image using GPT Vision
 */
async function extractTextWithGPTVision(
  fileUrl: string,
  fileType: 'pdf' | 'image'
): Promise<string | null> {
  if (!isAIConfigured()) {
    console.warn('OpenAI API key not configured');
    return null;
  }

  try {
    // Download and convert to base64
    const fileData = await downloadAndConvertToBase64(fileUrl);
    if (!fileData) {
      console.error('Failed to download file for extraction');
      return null;
    }

    const { base64, mimeType } = fileData;

    // For PDFs, we need to handle them differently
    // GPT-4 Vision can handle images, but for PDFs we might need to convert pages to images first
    // For now, we'll try to send PDF as base64 and see if GPT can handle it
    // If not, we'll need to use a PDF-to-image conversion library

    // Note: GPT-4 Vision doesn't directly support PDFs, so we'll treat PDFs as images
    // For better PDF support, we'd need to convert PDF pages to images first
    const prompt = `Extract all text content from this medical report ${fileType === 'pdf' ? 'PDF (converted to image)' : 'image'}. Include:
1. All test parameters, values, units, and normal ranges
2. Any diagnostic conditions, findings, or diagnoses mentioned
3. Patient information (if visible)
4. Report date and diagnostic center name
5. Any abnormal values or flagged results

Return the extracted text in a structured format, preserving the original structure as much as possible.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using GPT-4o for vision capabilities
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', response.status, response.statusText, errorData);
      
      // If PDF format is not supported, try alternative approach
      if (fileType === 'pdf' && response.status === 400) {
        console.log('PDF direct extraction failed, trying alternative method...');
        // For now, return null - we can enhance this later with PDF-to-image conversion
        return null;
      }
      
      return null;
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || null;

    return extractedText;
  } catch (error) {
    console.error('Error extracting text with GPT Vision:', error);
    return null;
  }
}

/**
 * Analyze extracted text to identify diagnostic conditions and parameters
 */
async function analyzeExtractedText(
  extractedText: string,
  memberInfo?: { age?: number; gender?: string }
): Promise<{
  conditions: string[];
  parameters: Array<{
    name: string;
    value: string | number;
    unit?: string;
    normalRange?: string;
    isAbnormal?: boolean;
  }>;
}> {
  if (!isAIConfigured()) {
    return { conditions: [], parameters: [] };
  }

  try {
    const prompt = `Analyze the following extracted medical report text and identify:

1. DIAGNOSTIC CONDITIONS: List all medical conditions, diagnoses, or findings mentioned in the report
2. TEST PARAMETERS: Extract all test parameters with their values, units, and normal ranges

EXTRACTED TEXT:
${extractedText}

MEMBER INFO:
${memberInfo?.age ? `Age: ${memberInfo.age}` : ''}
${memberInfo?.gender ? `Gender: ${memberInfo.gender}` : ''}

Return ONLY valid JSON in this exact format:
{
  "conditions": ["Condition 1", "Condition 2"],
  "parameters": [
    {
      "name": "Parameter Name",
      "value": "value or number",
      "unit": "unit if available",
      "normalRange": "normal range if available",
      "isAbnormal": true or false
    }
  ]
}

Guidelines:
- Extract ALL conditions mentioned, even if they're just findings or observations
- For parameters, mark isAbnormal as true if the value is outside normal range or flagged
- Be thorough and extract all relevant medical information`;

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
            content: 'You are a medical report analysis assistant. Return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      return { conditions: [], parameters: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return { conditions: [], parameters: [] };
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      conditions: Array.isArray(result.conditions) ? result.conditions : [],
      parameters: Array.isArray(result.parameters) ? result.parameters : [],
    };
  } catch (error) {
    console.error('Error analyzing extracted text:', error);
    return { conditions: [], parameters: [] };
  }
}

/**
 * Scan a single report file
 */
export async function scanReportFile(
  reportFile: ReportFile,
  memberInfo?: { age?: number; gender?: string }
): Promise<ScannedReportData | null> {
  try {
    console.log(`Scanning report: ${reportFile.reportId} (${reportFile.type})`);

    // Extract text using GPT Vision
    const extractedText = await extractTextWithGPTVision(reportFile.url, reportFile.type || 'image');
    
    if (!extractedText) {
      console.warn(`Failed to extract text from report ${reportFile.reportId}`);
      return null;
    }

    // Analyze extracted text
    const analysis = await analyzeExtractedText(extractedText, memberInfo);

    return {
      reportId: reportFile.reportId,
      extractedText,
      identifiedConditions: analysis.conditions,
      parameters: analysis.parameters,
      scannedAt: new Date(),
    };
  } catch (error) {
    console.error(`Error scanning report ${reportFile.reportId}:`, error);
    return null;
  }
}

/**
 * Scan multiple report files (with rate limiting)
 */
export async function scanMultipleReportFiles(
  reportFiles: ReportFile[],
  memberInfo?: { age?: number; gender?: string },
  onProgress?: (scanned: number, total: number) => void
): Promise<ScannedReportData[]> {
  const results: ScannedReportData[] = [];
  const batchSize = 3; // Process 3 reports at a time to avoid rate limits
  const delayBetweenBatches = 2000; // 2 seconds between batches

  for (let i = 0; i < reportFiles.length; i += batchSize) {
    const batch = reportFiles.slice(i, i + batchSize);
    
    const batchPromises = batch.map(reportFile => 
      scanReportFile(reportFile, memberInfo)
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((r): r is ScannedReportData => r !== null));

    if (onProgress) {
      onProgress(results.length, reportFiles.length);
    }

    // Delay between batches (except for the last batch)
    if (i + batchSize < reportFiles.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}







