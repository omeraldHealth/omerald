/**
 * Body Parts Mapping - 20 regions for body impact visualization
 */

export interface BodyPart {
  id: string;
  name: string;
  keywords: string[]; // Keywords to match AI responses
  svgPath?: string; // For future SVG path coordinates
  coordinates?: { x: number; y: number; width: number; height: number }; // For clickable regions (percentage-based)
}

export const BODY_PARTS: BodyPart[] = [
  {
    id: 'head-top',
    name: 'Head (Top)',
    keywords: ['head', 'skull', 'scalp', 'brain', 'cerebral', 'neurological'],
    coordinates: { x: 45, y: 2, width: 10, height: 8 }, // Top of head
  },
  {
    id: 'forehead',
    name: 'Forehead',
    keywords: ['forehead', 'frontal', 'sinus', 'frontal sinus'],
    coordinates: { x: 46, y: 10, width: 8, height: 4 },
  },
  {
    id: 'eyes',
    name: 'Eyes',
    keywords: ['eye', 'eyes', 'vision', 'retina', 'cornea', 'ocular', 'visual'],
    coordinates: { x: 46, y: 14, width: 8, height: 3 },
  },
  {
    id: 'nose',
    name: 'Nose',
    keywords: ['nose', 'nasal', 'sinus', 'sinuses', 'rhinitis'],
    coordinates: { x: 47, y: 17, width: 6, height: 3 },
  },
  {
    id: 'mouth-throat',
    name: 'Mouth/Throat',
    keywords: ['mouth', 'throat', 'oral', 'pharynx', 'larynx', 'tongue', 'teeth', 'gums'],
    coordinates: { x: 46.5, y: 20, width: 7, height: 4 },
  },
  {
    id: 'neck',
    name: 'Neck',
    keywords: ['neck', 'cervical', 'thyroid', 'trachea', 'esophagus'],
    coordinates: { x: 46, y: 24, width: 8, height: 5 },
  },
  {
    id: 'left-shoulder',
    name: 'Left Shoulder',
    keywords: ['left shoulder', 'left arm', 'left upper arm'],
    coordinates: { x: 38, y: 29, width: 8, height: 5 },
  },
  {
    id: 'right-shoulder',
    name: 'Right Shoulder',
    keywords: ['right shoulder', 'right arm', 'right upper arm'],
    coordinates: { x: 54, y: 29, width: 8, height: 5 },
  },
  {
    id: 'chest-upper',
    name: 'Chest (Upper)',
    keywords: ['upper chest', 'lungs', 'pulmonary', 'respiratory', 'bronchi', 'bronchial'],
    coordinates: { x: 45, y: 29, width: 10, height: 12 }, // Chest area: from below neck to above abdomen
  },
  {
    id: 'chest-heart',
    name: 'Chest (Heart)',
    keywords: ['heart', 'cardiac', 'cardiovascular', 'chest', 'myocardial', 'coronary'],
    coordinates: { x: 48, y: 33, width: 4, height: 6 }, // Heart: centered in upper chest, slightly left
  },
  {
    id: 'left-arm',
    name: 'Left Arm',
    keywords: ['left arm', 'left forearm', 'left elbow'],
    coordinates: { x: 34, y: 34, width: 4, height: 20 },
  },
  {
    id: 'right-arm',
    name: 'Right Arm',
    keywords: ['right arm', 'right forearm', 'right elbow'],
    coordinates: { x: 62, y: 34, width: 4, height: 20 },
  },
  {
    id: 'abdomen-upper',
    name: 'Abdomen (Upper)',
    keywords: ['upper abdomen', 'stomach', 'gastric', 'liver', 'hepatic', 'gallbladder', 'spleen'],
    coordinates: { x: 45, y: 41, width: 10, height: 10 }, // Upper abdomen: clearly below chest, above lower abdomen
  },
  {
    id: 'kidney',
    name: 'Kidney',
    keywords: ['kidney', 'kidneys', 'renal', 'nephron', 'nephritis', 'nephropathy', 'kidney disease', 'kidney failure', 'renal failure'],
    coordinates: { x: 45, y: 51, width: 10, height: 5 }, // Kidneys: mid-back/flank area, spanning upper to mid abdomen level
  },
  {
    id: 'abdomen-lower',
    name: 'Abdomen (Lower)',
    keywords: ['lower abdomen', 'intestines', 'bowel', 'colon', 'rectal', 'appendix', 'pancreas'],
    coordinates: { x: 45, y: 56, width: 10, height: 12 }, // Lower abdomen: clearly below upper abdomen
  },
  {
    id: 'left-hand',
    name: 'Left Hand',
    keywords: ['left hand', 'left wrist', 'left fingers'],
    coordinates: { x: 32, y: 54, width: 6, height: 8 },
  },
  {
    id: 'right-hand',
    name: 'Right Hand',
    keywords: ['right hand', 'right wrist', 'right fingers'],
    coordinates: { x: 62, y: 54, width: 6, height: 8 },
  },
  {
    id: 'left-leg-upper',
    name: 'Left Leg (Upper)',
    keywords: ['left leg', 'left thigh', 'left hip', 'left knee'],
    coordinates: { x: 45, y: 68, width: 5, height: 15 },
  },
  {
    id: 'right-leg-upper',
    name: 'Right Leg (Upper)',
    keywords: ['right leg', 'right thigh', 'right hip', 'right knee'],
    coordinates: { x: 50, y: 68, width: 5, height: 15 },
  },
  {
    id: 'left-leg-lower',
    name: 'Left Leg (Lower/Foot)',
    keywords: ['left foot', 'left ankle', 'left lower leg', 'left calf'],
    coordinates: { x: 45, y: 83, width: 5, height: 17 },
  },
  {
    id: 'right-leg-lower',
    name: 'Right Leg (Lower/Foot)',
    keywords: ['right foot', 'right ankle', 'right lower leg', 'right calf'],
    coordinates: { x: 50, y: 83, width: 5, height: 17 },
  },
];

/**
 * Map AI response body part names to our standardized body parts
 */
export function mapToBodyPart(aiPartName: string): BodyPart | null {
  const lowerName = aiPartName.toLowerCase();
  
  // Find matching body part by keywords
  for (const part of BODY_PARTS) {
    if (part.keywords.some(keyword => lowerName.includes(keyword))) {
      return part;
    }
  }
  
  // Try direct name match
  const directMatch = BODY_PARTS.find(part => 
    part.name.toLowerCase() === lowerName || 
    part.id.toLowerCase() === lowerName
  );
  
  return directMatch || null;
}

/**
 * Get body part by ID
 */
export function getBodyPartById(id: string): BodyPart | undefined {
  return BODY_PARTS.find(part => part.id === id);
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'low':
      return '#fbbf24'; // Yellow
    case 'medium':
      return '#f97316'; // Orange
    case 'high':
      return '#ef4444'; // Red
    default:
      return '#6b7280'; // Gray
  }
}

