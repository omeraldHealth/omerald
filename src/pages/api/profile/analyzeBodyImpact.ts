import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';
import ReportsTable from '@/lib/models/Reports';
import { analyzeBodyImpact, mapAnalysisToBodyParts } from '@/lib/utils/ai-body-analyzer';
import { BODY_PARTS } from '@/lib/utils/bodyPartsMapping';
import { getAllReportTypes } from '@/lib/utils/report-type-analyzer';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Profile ID is required' });
    }

    // Fetch member profile
    const profile = await ProfileTable.findById(id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Fetch all reports for this member
    const reports = await ReportsTable.find({ userId: profile.phoneNumber });

    // Extract diagnosed conditions
    const diagnosedConditions = profile.diagnosedCondition || [];

    // Extract report types from reports and profile
    const allReportTypes = getAllReportTypes(reports, profile);
    console.log('Report types for body impact analysis:', allReportTypes);

    // Extract report parameters from all reports
    const reportParameters: Array<{
      name: string;
      value: string | number;
      unit?: string;
      normalRange?: string;
      isAbnormal?: boolean;
    }> = [];

    for (const report of reports) {
      if (report.parsedData && Array.isArray(report.parsedData)) {
        for (const param of report.parsedData) {
          if (param.keyword && param.value) {
            // Determine if abnormal (simplified - can be enhanced)
            const isAbnormal = param.normalRange 
              ? !isValueInRange(param.value, param.normalRange)
              : false;

            reportParameters.push({
              name: param.keyword,
              value: param.value,
              unit: param.unit || '',
              normalRange: param.normalRange || '',
              isAbnormal,
            });
          }
        }
      }
    }

    // Prepare health data for AI analysis (including report types)
    const healthData = {
      diagnosedConditions: diagnosedConditions.map((dc: any) => ({
        condition: typeof dc === 'string' ? dc : dc.condition,
        date: typeof dc === 'object' && dc.date ? dc.date : undefined,
      })),
      reportParameters,
      reportTypes: allReportTypes, // Include report types
      memberInfo: {
        age: profile.dob ? calculateAge(profile.dob) : undefined,
        gender: profile.gender,
      },
    };

    // Call AI analyzer
    console.log('Analyzing body impact for member:', id);
    console.log('Health data:', JSON.stringify(healthData, null, 2));
    
    const aiAnalysis = await analyzeBodyImpact(healthData);

    if (!aiAnalysis) {
      console.error('AI analysis returned null');
      return res.status(500).json({ 
        error: 'AI analysis failed. Please check OpenAI API configuration and ensure OPENAI_API_KEY is set.' 
      });
    }

    console.log('AI Analysis result:', JSON.stringify(aiAnalysis, null, 2));

    // Map AI results to our standardized body parts
    const mappedBodyParts = mapAnalysisToBodyParts(aiAnalysis, BODY_PARTS);

    // Prepare data to store
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
        totalConditionsAnalyzed: diagnosedConditions.length,
        totalParametersAnalyzed: reportParameters.length,
        totalReportTypes: allReportTypes.length,
      },
    };

    // Update profile with analysis results
    profile.bodyImpactAnalysis = bodyImpactAnalysis;
    await profile.save();

    // Return results
    return res.status(200).json({
      success: true,
      bodyImpactAnalysis,
      summary: aiAnalysis.summary,
      totalAffectedParts: mappedBodyParts.length,
    });
  } catch (error: any) {
    console.error('Error analyzing body impact:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to analyze body impact' 
    });
  }
};

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

