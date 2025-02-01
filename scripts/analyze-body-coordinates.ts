/**
 * Script to analyze body.jpg image using GPT-4 Vision
 * and generate accurate coordinates for body parts
 */

import fs from 'fs';
import path from 'path';

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

async function analyzeBodyImageWithGPT(): Promise<BodyPartCoordinate[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
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
  const sharp = require('sharp');
  const metadata = await sharp(imageBuffer).metadata();
  const imageWidth = metadata.width;
  const imageHeight = metadata.height;

  console.log(`Image dimensions: ${imageWidth}x${imageHeight}`);

  // Create prompt for GPT-4 Vision
  const prompt = `You are analyzing a human body diagram image. I need you to identify the precise coordinates for each body part listed below.

For each body part, provide the bounding box coordinates as percentages of the image dimensions:
- x: left edge as percentage (0-100)
- y: top edge as percentage (0-100)  
- width: width as percentage (0-100)
- height: height as percentage (0-100)

The coordinates should form a rectangle that accurately covers the anatomical region. Be precise and ensure the rectangles don't overlap unnecessarily.

Body parts to analyze:
${BODY_PARTS_TO_ANALYZE.map((part, i) => `${i + 1}. ${part.name} (id: ${part.id})`).join('\n')}

Return ONLY valid JSON in this exact format:
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
    },
    ...
  ]
}

Important:
- Use decimal precision (e.g., 35.5 not 35)
- Ensure coordinates are anatomically accurate
- Left/Right should be from the person's perspective (left shoulder is on the left side of the image)
- Make sure rectangles are properly sized to cover the body part without being too large or too small
- All coordinates must be between 0 and 100`;

  try {
    console.log('Calling GPT-4 Vision API...');
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
                },
              },
            ],
          },
        ],
        temperature: 0.1, // Low temperature for precise coordinates
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

    console.log('API Response received');
    console.log('Raw response:', content.substring(0, 500));

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return result.coordinates || [];
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
}

async function updateBodyPartsMapping(coordinates: BodyPartCoordinate[]) {
  const mappingPath = path.join(process.cwd(), 'src', 'lib', 'utils', 'bodyPartsMapping.ts');
  let content = fs.readFileSync(mappingPath, 'utf-8');

  // Update each body part's coordinates
  for (const coord of coordinates) {
    const regex = new RegExp(
      `(id: '${coord.id}'[\\s\\S]*?coordinates: )\\{[^}]+\\}`,
      'g'
    );
    
    const newCoords = `{ x: ${coord.coordinates.x}, y: ${coord.coordinates.y}, width: ${coord.coordinates.width}, height: ${coord.coordinates.height} }`;
    
    content = content.replace(
      regex,
      `$1${newCoords}`
    );
  }

  fs.writeFileSync(mappingPath, content, 'utf-8');
  console.log('✅ Updated bodyPartsMapping.ts with new coordinates');
}

// Main execution
async function main() {
  try {
    console.log('🔍 Analyzing body image with GPT-4 Vision...\n');
    
    const coordinates = await analyzeBodyImageWithGPT();
    
    console.log('\n📊 Generated coordinates:');
    coordinates.forEach((coord) => {
      console.log(`  ${coord.name}: x=${coord.coordinates.x}%, y=${coord.coordinates.y}%, w=${coord.coordinates.width}%, h=${coord.coordinates.height}%`);
    });

    console.log('\n💾 Updating bodyPartsMapping.ts...');
    await updateBodyPartsMapping(coordinates);
    
    console.log('\n✅ Done! Coordinates have been updated.');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// REDUNDANT: Commented out - This script duplicates functionality in src/lib/utils/analyze-body-coordinates.ts
// The utils version (analyzeBodyCoordinatesWithGPT) is used by the API endpoint /api/body/analyzeCoordinates
// Will revisit and consolidate into single implementation.
// Run if executed directly
// if (require.main === module) {
//   main();
// }

export { analyzeBodyImageWithGPT, updateBodyPartsMapping };














