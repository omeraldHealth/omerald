/**
 * Utility to analyze body.jpg image using GPT-4 Vision
 * and generate accurate coordinates for body parts
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

interface BodyPartCoordinate {
  id: string;
  name: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const BODY_PARTS_TO_ANALYZE = [
  { id: 'head-top', name: 'Head (Top)' },
  { id: 'forehead', name: 'Forehead' },
  { id: 'eyes', name: 'Eyes' },
  { id: 'nose', name: 'Nose' },
  { id: 'mouth-throat', name: 'Mouth/Throat' },
  { id: 'neck', name: 'Neck' },
  { id: 'left-shoulder', name: 'Left Shoulder' },
  { id: 'right-shoulder', name: 'Right Shoulder' },
  { id: 'chest-upper', name: 'Chest (Upper)' },
  { id: 'chest-heart', name: 'Chest (Heart)' },
  { id: 'left-arm', name: 'Left Arm' },
  { id: 'right-arm', name: 'Right Arm' },
  { id: 'abdomen-upper', name: 'Abdomen (Upper)' },
  { id: 'kidney', name: 'Kidney' },
  { id: 'abdomen-lower', name: 'Abdomen (Lower)' },
  { id: 'left-hand', name: 'Left Hand' },
  { id: 'right-hand', name: 'Right Hand' },
  { id: 'left-leg-upper', name: 'Left Leg (Upper)' },
  { id: 'right-leg-upper', name: 'Right Leg (Upper)' },
  { id: 'left-leg-lower', name: 'Left Leg (Lower/Foot)' },
  { id: 'right-leg-lower', name: 'Right Leg (Lower/Foot)' },
];

/**
 * Check if OpenAI API is configured
 */
function isAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Analyze body image with GPT-4 Vision and get coordinates
 */
export async function analyzeBodyCoordinatesWithGPT(): Promise<BodyPartCoordinate[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !isAIConfigured()) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  // Read the body image
  const imagePath = path.join(process.cwd(), 'public', 'body.jpg');
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found at ${imagePath}`);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  // Get image dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const imageWidth = metadata.width;
  const imageHeight = metadata.height;

  console.log(`Analyzing image dimensions: ${imageWidth}x${imageHeight}`);

  // Create detailed prompt for GPT-4 Vision with specific anatomical guidance
  const prompt = `You are analyzing a human body diagram image (front view). I need you to identify the precise bounding box coordinates for each body part listed below.

CRITICAL ANATOMICAL GUIDELINES:
- CHEST (Upper) should cover the UPPER TORSO from below the neck/shoulders down to approximately the bottom of the ribcage. This is where the LUNGS and UPPER RESPIRATORY system are located. It should NOT extend into the stomach/abdomen area.
- CHEST (Heart) should be a smaller region within the upper chest area, specifically where the HEART is located (slightly left of center, between the lungs).
- ABDOMEN (Upper) should start BELOW the ribcage/chest area and cover the UPPER ABDOMINAL region where the STOMACH, LIVER, and upper digestive organs are located. This is DISTINCT from the chest.
- ABDOMEN (Lower) should be BELOW the upper abdomen, covering the LOWER ABDOMINAL region where INTESTINES, COLON, and lower digestive organs are located.
- KIDNEY should be positioned in the MID-BACK/FLANK area, typically around the level where the lower ribs meet the abdomen, on both sides.

IMPORTANT INSTRUCTIONS:
1. Coordinates should be in PERCENTAGE format (0-100) relative to the image dimensions
2. x = left edge percentage, y = top edge percentage
3. width = width percentage, height = height percentage
4. The bounding box should accurately cover ONLY the anatomical region specified - be precise!
5. For left/right parts, use the person's perspective (left shoulder is on the left side of the image)
6. Be anatomically precise - the rectangles should match the ACTUAL body part locations in the image
7. Ensure proper separation between regions:
   - CHEST should be clearly ABOVE the abdomen
   - UPPER ABDOMEN should be clearly BELOW the chest but ABOVE lower abdomen
   - LOWER ABDOMEN should be clearly BELOW upper abdomen
8. Use decimal precision for accuracy (e.g., 35.5, not 35)
9. Look at the actual image and identify where each body part visually appears - don't guess!

Body parts to analyze (in anatomical order from top to bottom):
${BODY_PARTS_TO_ANALYZE.map((part, i) => `${i + 1}. ${part.name} (id: ${part.id})`).join('\n')}

Return ONLY valid JSON in this exact format (no markdown, no code blocks, just pure JSON):
{
  "coordinates": [
    {
      "id": "head-top",
      "name": "Head (Top)",
      "coordinates": {
        "x": 35.5,
        "y": 5.2,
        "width": 29.0,
        "height": 12.3
      }
    }
  ]
}

Make sure to include ALL ${BODY_PARTS_TO_ANALYZE.length} body parts in your response. Be especially careful to distinguish CHEST from ABDOMEN regions based on the actual image.`;

  try {
    console.log('Calling GPT-4 Vision API for coordinate analysis...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
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
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high', // High detail for precise coordinates
                },
              },
            ],
          },
        ],
        temperature: 0.1, // Very low temperature for precise, consistent coordinates
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in API response');
    }

    console.log('GPT-4 Vision response received');

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonString = content.trim();
    
    // Remove markdown code blocks if present
    jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Find JSON object
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    if (!result.coordinates || !Array.isArray(result.coordinates)) {
      throw new Error('Invalid response format: coordinates array not found');
    }

    // Validate all body parts are present
    const receivedIds = result.coordinates.map((c: BodyPartCoordinate) => c.id);
    const expectedIds = BODY_PARTS_TO_ANALYZE.map(p => p.id);
    const missingIds = expectedIds.filter(id => !receivedIds.includes(id));
    
    if (missingIds.length > 0) {
      console.warn(`Warning: Missing coordinates for: ${missingIds.join(', ')}`);
    }

    return result.coordinates;
  } catch (error) {
    console.error('Error analyzing image with GPT-4 Vision:', error);
    throw error;
  }
}

/**
 * Update bodyPartsMapping.ts file with new coordinates
 */
export async function updateBodyPartsMappingFile(coordinates: BodyPartCoordinate[]): Promise<void> {
  const mappingPath = path.join(process.cwd(), 'src', 'lib', 'utils', 'bodyPartsMapping.ts');
  let content = fs.readFileSync(mappingPath, 'utf-8');

  // Update each body part's coordinates
  for (const coord of coordinates) {
    // Match the coordinates line for this body part
    const regex = new RegExp(
      `(id: '${coord.id}'[\\s\\S]*?coordinates: )\\{[^}]+\\}`,
      'g'
    );
    
    const newCoords = `{ x: ${coord.coordinates.x}, y: ${coord.coordinates.y}, width: ${coord.coordinates.width}, height: ${coord.coordinates.height} }`;
    
    if (regex.test(content)) {
      content = content.replace(
        regex,
        `$1${newCoords}`
      );
      console.log(`✅ Updated coordinates for ${coord.name}`);
    } else {
      console.warn(`⚠️  Could not find coordinates for ${coord.id} to update`);
    }
  }

  fs.writeFileSync(mappingPath, content, 'utf-8');
  console.log('✅ Successfully updated bodyPartsMapping.ts');
}














