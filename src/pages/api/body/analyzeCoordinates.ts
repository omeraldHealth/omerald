/**
 * API endpoint to analyze body image and update coordinates
 * POST /api/body/analyzeCoordinates
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { analyzeBodyCoordinatesWithGPT, updateBodyPartsMappingFile } from '@/lib/utils/analyze-body-coordinates';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting body coordinate analysis...');

    // Analyze image with GPT-4 Vision
    const coordinates = await analyzeBodyCoordinatesWithGPT();

    console.log(`Received coordinates for ${coordinates.length} body parts`);

    // Update the mapping file
    await updateBodyPartsMappingFile(coordinates);

    return res.status(200).json({
      success: true,
      message: 'Body coordinates analyzed and updated successfully',
      coordinates: coordinates,
      count: coordinates.length,
    });
  } catch (error: any) {
    console.error('Error in analyzeCoordinates API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze body coordinates',
    });
  }
}















