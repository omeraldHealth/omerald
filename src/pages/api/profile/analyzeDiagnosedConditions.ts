import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';
import ReportsTable from '@/lib/models/Reports';
import { scanMultipleReportFiles } from '@/lib/utils/report-scanner';
import { getS3Client, BUCKET_NAME } from '@/lib/utils/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { analyzeBodyImpact, mapAnalysisToBodyParts } from '@/lib/utils/ai-body-analyzer';
import { BODY_PARTS } from '@/lib/utils/bodyPartsMapping';
import { getAllReportTypes, suggestConditionsFromReportTypes } from '@/lib/utils/report-type-analyzer';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.body;

    console.log('Analyze diagnosed conditions request:', { id });

    if (!id) {
      console.error('Missing profile ID');
      return res.status(400).json({ error: 'Profile ID is required' });
    }

    // Fetch member profile
    let profile;
    try {
      profile = await ProfileTable.findById(id);
      if (!profile) {
        console.error('Profile not found:', id);
        return res.status(404).json({ error: 'Profile not found' });
      }
      console.log('Profile found:', { phoneNumber: profile.phoneNumber, id: profile._id });
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: `Error fetching profile: ${error.message}` });
    }

    // Fetch all reports for this member
    let reports;
    try {
      const userId = profile.phoneNumber || profile._id?.toString();
      if (!userId) {
        console.error('No userId found in profile');
        return res.status(400).json({ error: 'Profile does not have a phone number or ID' });
      }
      
      reports = await ReportsTable.find({ userId: userId });
      console.log('Reports found:', reports.length, 'for userId:', userId);
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      return res.status(500).json({ error: `Error fetching reports: ${error.message}` });
    }

    if (!reports || reports.length === 0) {
      console.log('No reports found for member');
      return res.status(200).json({
        success: true,
        suggestedConditions: [],
        message: 'No reports found for this member',
        totalReports: 0,
        totalParameters: 0,
        abnormalParameters: 0,
        existingConditions: (profile.diagnosedCondition || []).length,
      });
    }

    // Extract report parameters from all reports
    const reportParameters: Array<{
      name: string;
      value: string | number;
      unit?: string;
      normalRange?: string;
      isAbnormal?: boolean;
      reportName?: string;
      reportDate?: Date;
    }> = [];

    // Also collect conditions directly from reports
    const reportConditions: Set<string> = new Set();

    // Enhanced scanning: Try to scan report files using GPT Vision if available
    let scannedReportData: any[] = [];
    const useEnhancedScanning = process.env.OPENAI_API_KEY && req.body.enhancedScan !== false;
    
    if (useEnhancedScanning) {
      try {
        // Prepare report files for scanning
        const reportFiles = [];
        const s3Client = getS3Client();
        
        for (const report of reports) {
          // Get report file URL
          let reportUrl = report.reportUrl || report.reportDoc;
          
          // If it's an S3 key, generate signed URL
          if (reportUrl && (reportUrl.includes('reports/') || reportUrl.startsWith('reports/'))) {
            try {
              const getObjectCommand = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: reportUrl,
              });
              reportUrl = await getSignedUrl(s3Client, getObjectCommand, {
                expiresIn: 3600, // 1 hour
              });
            } catch (s3Error) {
              console.warn(`Failed to generate signed URL for report ${report._id}:`, s3Error);
              continue; // Skip this report if we can't get the URL
            }
          }
          
          if (reportUrl) {
            // Determine file type
            const isPDF = reportUrl.toLowerCase().includes('.pdf') || 
                        reportUrl.toLowerCase().includes('application/pdf');
            const fileType: 'pdf' | 'image' = isPDF ? 'pdf' : 'image';
            
            reportFiles.push({
              url: reportUrl,
              reportId: report._id?.toString() || report.reportId || '',
              reportName: report.name || report.testName || 'Report',
              reportDate: report.reportDate || report.uploadDate,
              type: fileType,
            });
          }
        }
        
        // Scan reports if we have any
        if (reportFiles.length > 0) {
          console.log(`Scanning ${reportFiles.length} reports with GPT Vision...`);
          scannedReportData = await scanMultipleReportFiles(
            reportFiles,
            {
              age: profile.dob ? calculateAge(profile.dob) : undefined,
              gender: profile.gender,
            }
          );
          
          // Extract conditions and parameters from scanned data
          scannedReportData.forEach(scanned => {
            scanned.identifiedConditions.forEach((condition: string) => {
              if (condition && typeof condition === 'string') {
                reportConditions.add(condition.trim());
              }
            });
            
            scanned.parameters.forEach((param: any) => {
              reportParameters.push({
                name: param.name,
                value: param.value,
                unit: param.unit || '',
                normalRange: param.normalRange || '',
                isAbnormal: param.isAbnormal || false,
                reportName: scanned.reportId,
                reportDate: new Date(),
              });
            });
          });
        }
      } catch (scanError) {
        console.error('Error in enhanced scanning, falling back to parsedData:', scanError);
        // Fall through to use parsedData
      }
    }

    // Fallback: Extract from existing parsedData (for reports that weren't scanned or if scanning failed)
    for (const report of reports) {
      // Skip if we already scanned this report
      const alreadyScanned = scannedReportData.some(
        s => s.reportId === (report._id?.toString() || report.reportId)
      );
      if (alreadyScanned) continue;
      
      // Collect conditions from report.conditions field
      if (report.conditions && Array.isArray(report.conditions)) {
        report.conditions.forEach((condition: string) => {
          if (condition && typeof condition === 'string') {
            reportConditions.add(condition.trim());
          }
        });
      }

      // Extract parameters from parsedData
      if (report.parsedData && Array.isArray(report.parsedData)) {
        for (const param of report.parsedData) {
          if (param.keyword && param.value) {
            // Determine if abnormal
            const isAbnormal = param.normalRange 
              ? !isValueInRange(param.value, param.normalRange)
              : false;

            reportParameters.push({
              name: param.keyword,
              value: param.value,
              unit: param.unit || '',
              normalRange: param.normalRange || '',
              isAbnormal,
              reportName: report.name || report.testName || 'Report',
              reportDate: report.reportDate || report.uploadDate,
            });
          }
        }
      }
    }

    // Get abnormal parameters for AI analysis
    const abnormalParameters = reportParameters.filter(p => p.isAbnormal);

    // Extract report types from reports and profile
    const allReportTypes = getAllReportTypes(reports, profile);
    console.log('Extracted report types:', allReportTypes);

    // Use GPT to analyze abnormal parameters and suggest diagnosed conditions
    let aiSuggestedConditions: string[] = [];
    
    if (abnormalParameters.length > 0 && process.env.OPENAI_API_KEY) {
      try {
        aiSuggestedConditions = await analyzeParametersForConditions(
          abnormalParameters,
          {
            age: profile.dob ? calculateAge(profile.dob) : undefined,
            gender: profile.gender,
          }
        );
      } catch (error) {
        console.error('Error in AI analysis:', error);
        // Continue without AI suggestions if it fails
      }
    }

    // Use GPT to suggest conditions based on report types
    let reportTypeSuggestedConditions: string[] = [];
    
    if (allReportTypes.length > 0 && process.env.OPENAI_API_KEY) {
      try {
        reportTypeSuggestedConditions = await suggestConditionsFromReportTypes(
          allReportTypes,
          {
            age: profile.dob ? calculateAge(profile.dob) : undefined,
            gender: profile.gender,
          }
        );
        console.log('Conditions suggested from report types:', reportTypeSuggestedConditions);
      } catch (error) {
        console.error('Error in report type analysis:', error);
        // Continue without report type suggestions if it fails
      }
    }

    // Combine conditions from reports, AI parameter analysis, and report type analysis
    const allSuggestedConditions = Array.from(reportConditions);
    
    // Add AI parameter-based suggestions that aren't already in the list
    aiSuggestedConditions.forEach(condition => {
      const normalized = condition.trim().toLowerCase();
      if (!allSuggestedConditions.some(c => c.toLowerCase() === normalized)) {
        allSuggestedConditions.push(condition);
      }
    });

    // Add report type-based suggestions that aren't already in the list
    reportTypeSuggestedConditions.forEach(condition => {
      const normalized = condition.trim().toLowerCase();
      if (!allSuggestedConditions.some(c => c.toLowerCase() === normalized)) {
        allSuggestedConditions.push(condition);
      }
    });

    // Filter out conditions that are already in the member's diagnosed conditions
    const existingConditions = (profile.diagnosedCondition || []).map((dc: any) => 
      typeof dc === 'string' ? dc.toLowerCase() : (dc?.condition || '').toLowerCase()
    );

    const newConditions = allSuggestedConditions.filter(condition => 
      !existingConditions.includes(condition.toLowerCase())
    );

    console.log('Analysis complete:', {
      totalReports: reports.length,
      totalParameters: reportParameters.length,
      abnormalParameters: abnormalParameters.length,
      reportConditions: reportConditions.size,
      aiConditions: aiSuggestedConditions.length,
      reportTypeConditions: reportTypeSuggestedConditions.length,
      reportTypes: allReportTypes,
      allSuggested: allSuggestedConditions.length,
      existing: existingConditions.length,
      newConditions: newConditions.length,
    });

    // AUTO-ADD: Automatically add all new conditions to profile
    let autoAddedConditions: any[] = [];
    if (newConditions.length > 0) {
      // Determine source for each condition
      const getConditionSource = (condition: string): string => {
        if (reportConditions.has(condition)) return 'report';
        if (reportTypeSuggestedConditions.some(c => c.toLowerCase() === condition.toLowerCase())) return 'report_type';
        return 'ai_analysis';
      };

      // Format conditions for saving
      autoAddedConditions = newConditions.map(condition => ({
        condition: condition.trim(),
        date: new Date(),
        source: getConditionSource(condition),
      }));

      // Add to profile's diagnosed conditions
      const currentConditions = profile.diagnosedCondition || [];
      profile.diagnosedCondition = [...currentConditions, ...autoAddedConditions];
      await profile.save();

      console.log(`Auto-added ${autoAddedConditions.length} diagnosed condition(s) to profile`);
    }

    // Prepare patterns for client-side storage
    const reportPatterns = scannedReportData.map(scanned => ({
      reportId: scanned.reportId,
      conditions: scanned.identifiedConditions,
      parameters: scanned.parameters.map((p: any) => p.name),
      scannedAt: scanned.scannedAt,
    }));

    // Update body impact analysis if we have conditions or parameters
    // NOTE: This is the PRIMARY body impact analysis call. The separate /api/profile/analyzeBodyImpact endpoint
    // is for manual triggers. UI should NOT call both - this handles it automatically.
    let bodyImpactUpdated = false;
    if ((newConditions.length > 0 || reportParameters.length > 0) && process.env.OPENAI_API_KEY) {
      try {
        // Prepare health data for body impact analysis
        const currentConditions = (profile.diagnosedCondition || []).map((dc: any) => ({
          condition: typeof dc === 'string' ? dc : dc.condition,
          date: typeof dc === 'object' && dc.date ? dc.date : undefined,
        }));
        
        // Use all conditions (including newly added ones)
        const allConditionsForAnalysis = currentConditions;

        const healthData = {
          diagnosedConditions: allConditionsForAnalysis,
          reportParameters,
          reportTypes: allReportTypes, // Include report types in body impact analysis
          memberInfo: {
            age: profile.dob ? calculateAge(profile.dob) : undefined,
            gender: profile.gender,
          },
        };

        const aiAnalysis = await analyzeBodyImpact(healthData);
        
        if (aiAnalysis) {
          const mappedBodyParts = mapAnalysisToBodyParts(aiAnalysis, BODY_PARTS);
          
          const bodyImpactAnalysis = {
            lastAnalyzedAt: new Date(),
            bodyParts: mappedBodyParts.map(part => ({
              partId: part.partId,
              partName: part.partName,
              severity: part.severity,
              impactDescription: part.impactDescription,
              relatedConditions: part.relatedConditions,
              relatedParameters: part.relatedParameters,
              confidence: part.confidence,
              lastUpdated: new Date(),
            })),
            analysisMetadata: {
              modelVersion: '1.0',
              totalConditionsAnalyzed: allConditionsForAnalysis.length,
              totalParametersAnalyzed: reportParameters.length,
            },
          };

          // Update profile with body impact analysis
          profile.bodyImpactAnalysis = bodyImpactAnalysis;
          await profile.save();
          bodyImpactUpdated = true;
          
          console.log('Body impact analysis updated:', mappedBodyParts.length, 'body parts affected');
        }
      } catch (bodyImpactError) {
        console.error('Error updating body impact analysis:', bodyImpactError);
        // Don't fail the whole request if body impact update fails
      }
    }

    return res.status(200).json({
      success: true,
      autoAddedConditions: autoAddedConditions, // Conditions that were automatically added
      totalReports: reports.length,
      totalParameters: reportParameters.length,
      abnormalParameters: abnormalParameters.length,
      existingConditions: existingConditions.length,
      scannedReports: scannedReportData.length,
      reportTypes: allReportTypes,
      reportTypeConditions: reportTypeSuggestedConditions.length,
      reportPatterns, // Send patterns to client for localStorage storage
      bodyImpactUpdated, // Indicate if body impact was updated
      message: autoAddedConditions.length > 0 
        ? `Successfully added ${autoAddedConditions.length} diagnosed condition(s) from reports`
        : 'No new conditions found in reports',
    });
  } catch (error: any) {
    console.error('Error analyzing diagnosed conditions:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: error.message || 'Failed to analyze diagnosed conditions',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * Use GPT to analyze abnormal parameters and suggest diagnosed conditions
 */
async function analyzeParametersForConditions(
  abnormalParameters: Array<{
    name: string;
    value: string | number;
    unit?: string;
    normalRange?: string;
    isAbnormal?: boolean;
  }>,
  memberInfo: { age?: number; gender?: string }
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [];
  }

  try {
    const prompt = `You are a medical assistant. Analyze the following abnormal lab report parameters and suggest potential diagnosed conditions.

ABNORMAL PARAMETERS:
${abnormalParameters.map((p, i) => 
  `${i + 1}. ${p.name}: ${p.value} ${p.unit || ''} (Normal Range: ${p.normalRange || 'Not specified'})`
).join('\n')}

MEMBER INFO:
${memberInfo.age ? `Age: ${memberInfo.age}` : ''}
${memberInfo.gender ? `Gender: ${memberInfo.gender}` : ''}

Based on these abnormal parameters, suggest potential diagnosed conditions. Consider:
1. What medical conditions could cause these parameter abnormalities?
2. Focus on common, well-established medical conditions
3. Be specific but not overly technical
4. Return only condition names, one per line
5. Do not include explanations or additional text

Return ONLY a JSON array of condition names, like this:
["Condition 1", "Condition 2", "Condition 3"]

Example: ["Diabetes", "Hypertension", "Anemia"]`;

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
    console.error('Error calling OpenAI API:', error);
    return [];
  }
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dob: Date | string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Check if a value is within normal range
 * Handles various range formats: "10-20", ">10", "<20", "10.0 - 20.0", etc.
 */
function isValueInRange(value: string | number, normalRange: string): boolean {
  if (!normalRange || !value) return false;

  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  if (isNaN(numValue)) return false;

  const range = normalRange.trim();

  // Handle "> X" or ">= X"
  if (range.startsWith('>')) {
    const threshold = parseFloat(range.replace(/[^0-9.-]/g, ''));
    return !isNaN(threshold) && numValue > threshold;
  }

  // Handle "< X" or "<= X"
  if (range.startsWith('<')) {
    const threshold = parseFloat(range.replace(/[^0-9.-]/g, ''));
    return !isNaN(threshold) && numValue < threshold;
  }

  // Handle range format "X - Y" or "X-Y"
  const rangeMatch = range.match(/(\d+\.?\d*)\s*[-–—]\s*(\d+\.?\d*)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    return !isNaN(min) && !isNaN(max) && numValue >= min && numValue <= max;
  }

  // If we can't parse, assume it's normal (conservative approach)
  return true;
}

export default connectDBMiddleware(handler);

