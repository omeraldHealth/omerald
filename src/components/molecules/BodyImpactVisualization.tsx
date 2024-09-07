'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { getSeverityColor, getBodyPartById } from '@/lib/utils/bodyPartsMapping';
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import { analyzeBodyCoordinates } from '@/components/common/lib/constants/urls';
import toast from 'react-hot-toast';

interface BodyPartImpact {
  partId: string;
  partName: string;
  severity: 'low' | 'medium' | 'high';
  impactDescription: string;
  relatedConditions: string[];
  relatedParameters: string[];
  confidence: number;
}

interface BodyImpactVisualizationProps {
  bodyImpactAnalysis?: {
    lastAnalyzedAt?: Date | string;
    bodyParts?: BodyPartImpact[];
    analysisMetadata?: {
      modelVersion?: string;
      totalConditionsAnalyzed?: number;
      totalParametersAnalyzed?: number;
    };
  };
  isLoading?: boolean;
  onAnalyze?: () => void;
  diagnosedConditions?: Array<{ condition: string } | string>;
}

export default function BodyImpactVisualization({
  bodyImpactAnalysis,
  isLoading = false,
  onAnalyze,
  diagnosedConditions = [],
}: BodyImpactVisualizationProps) {
  const [selectedPart, setSelectedPart] = useState<BodyPartImpact | null>(null);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isAnalyzingCoordinates, setIsAnalyzingCoordinates] = useState(false);

  const affectedParts = bodyImpactAnalysis?.bodyParts || [];
  const lastAnalyzed = bodyImpactAnalysis?.lastAnalyzedAt
    ? new Date(bodyImpactAnalysis.lastAnalyzedAt)
    : null;

  // Fallback: Create basic body parts from conditions if no AI analysis
  // Enhanced to better match diagnosed conditions to body parts
  const fallbackParts = React.useMemo(() => {
    if (affectedParts.length > 0) return [];
    if (diagnosedConditions.length === 0) return [];
    
    const conditions = diagnosedConditions.map((dc: any) => 
      typeof dc === 'string' ? dc : (dc?.condition || '')
    );
    
    const conditionsLower = conditions.map(c => c.toLowerCase());
    const conditionsText = conditionsLower.join(' ');
    
    const fallback: BodyPartImpact[] = [];
    const { BODY_PARTS } = require('@/lib/utils/bodyPartsMapping');
    
    // Enhanced mapping: Check each condition against each body part
    BODY_PARTS.forEach((part: any) => {
      const matchingConditions: string[] = [];
      
      // Check if any condition matches this body part's keywords
      conditions.forEach((condition: string) => {
        const conditionLower = condition.toLowerCase();
        const matches = part.keywords.some((keyword: string) => 
          conditionLower.includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(conditionLower)
        );
        
        if (matches) {
          matchingConditions.push(condition);
        }
      });
      
      // Also check for common medical condition-body part mappings
      const conditionBodyPartMap: Record<string, string[]> = {
        'diabetes': ['kidney', 'abdomen-upper', 'abdomen-lower'],
        'hypertension': ['chest-heart', 'kidney'],
        'asthma': ['chest-upper'],
        'copd': ['chest-upper'],
        'heart': ['chest-heart'],
        'cardiac': ['chest-heart'],
        'kidney': ['kidney'],
        'renal': ['kidney'],
        'liver': ['abdomen-upper'],
        'hepatic': ['abdomen-upper'],
        'migraine': ['head-top', 'forehead'],
        'headache': ['head-top', 'forehead'],
        'sinus': ['nose', 'forehead'],
        'thyroid': ['neck'],
        'arthritis': ['left-hand', 'right-hand', 'left-leg-upper', 'right-leg-upper'],
      };
      
      for (const [conditionKey, partIds] of Object.entries(conditionBodyPartMap)) {
        if (conditionsText.includes(conditionKey) && partIds.includes(part.id)) {
          const matchingCondition = conditions.find(c => 
            c.toLowerCase().includes(conditionKey)
          );
          if (matchingCondition && !matchingConditions.includes(matchingCondition)) {
            matchingConditions.push(matchingCondition);
          }
        }
      }
      
      if (matchingConditions.length > 0) {
        // Determine severity based on condition type
        let severity: 'low' | 'medium' | 'high' = 'medium';
        const conditionsStr = matchingConditions.join(' ').toLowerCase();
        
        if (conditionsStr.includes('tumor') || conditionsStr.includes('cancer') || 
            conditionsStr.includes('fracture') || conditionsStr.includes('failure') ||
            conditionsStr.includes('disease') || conditionsStr.includes('chronic')) {
          severity = 'high';
        } else if (conditionsStr.includes('fever') || conditionsStr.includes('covid') ||
                   conditionsStr.includes('infection') || conditionsStr.includes('inflammation')) {
          severity = 'medium';
        } else {
          severity = 'low';
        }
        
        fallback.push({
          partId: part.id,
          partName: part.name,
          severity,
          impactDescription: `This area is affected by the following diagnosed condition(s): ${matchingConditions.join(', ')}.`,
          relatedConditions: matchingConditions,
          relatedParameters: [],
          confidence: 0.7, // Higher confidence when conditions directly match
        });
      }
    });
    
    return fallback;
  }, [affectedParts.length, diagnosedConditions]);

  const displayParts = affectedParts.length > 0 ? affectedParts : fallbackParts;

  // Debug logging
  useEffect(() => {
    console.log('BodyImpactVisualization - bodyImpactAnalysis:', bodyImpactAnalysis);
    console.log('BodyImpactVisualization - affectedParts:', affectedParts);
    console.log('BodyImpactVisualization - fallbackParts:', fallbackParts);
    console.log('BodyImpactVisualization - displayParts:', displayParts);
    console.log('BodyImpactVisualization - isLoading:', isLoading);
  }, [bodyImpactAnalysis, affectedParts, fallbackParts, displayParts, isLoading]);

  // Get severity for a specific body part
  const getPartSeverity = (partId: string): 'low' | 'medium' | 'high' | null => {
    const part = affectedParts.find(p => p.partId === partId);
    return part?.severity || null;
  };

  // Handle coordinate analysis with GPT-4 Vision
  const handleAnalyzeCoordinates = async (silent = false) => {
    if (!silent && !confirm('This will analyze the body image with GPT-4 Vision and update all body part coordinates. Continue?')) {
      return;
    }

    setIsAnalyzingCoordinates(true);
    try {
      const response = await axios.post(analyzeBodyCoordinates);
      if (response.data.success) {
        if (!silent) {
          toast.success(`✅ Coordinates updated! Analyzed ${response.data.count} body parts. Please refresh the page to see changes.`);
          // Optionally reload the page to see updated coordinates
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        if (!silent) {
          toast.error(response.data.error || 'Failed to analyze coordinates');
        }
      }
    } catch (error: any) {
      console.error('Error analyzing coordinates:', error);
      if (!silent) {
        toast.error(error?.response?.data?.error || 'Failed to analyze coordinates');
      }
    } finally {
      setIsAnalyzingCoordinates(false);
    }
  };

  // Auto-analyze coordinates once per app session using sessionStorage
  // This ensures coordinates are analyzed only once when the app is first loaded/reloaded
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const shouldAnalyze = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_COORD_ANALYSIS === 'true';
    if (!shouldAnalyze) return;
    
    // Check if coordinates have been analyzed in this browser session
    // sessionStorage persists across page navigations but clears when tab is closed
    const sessionKey = 'bodyCoordinatesAnalyzed';
    const hasAnalyzed = sessionStorage.getItem(sessionKey);
    
    if (!hasAnalyzed) {
      // Mark as analyzed immediately to prevent multiple calls
      sessionStorage.setItem(sessionKey, 'true');
      handleAnalyzeCoordinates(true);
    }
  }, []);

  // Render overlay regions with accurate coordinate calculation
  const renderOverlayRegions = () => {
    if (!containerRef.current) return null;
    
    return displayParts.map((part) => {
      const bodyPart = getBodyPartById(part.partId);
      if (!bodyPart?.coordinates) return null;

      // Coordinates are already in percentage format, which works with any screen resolution
      // The percentage is relative to the container, which maintains aspect ratio
      const { x, y, width, height } = bodyPart.coordinates;
      const severity = part.severity;
      const color = getSeverityColor(severity);
      const isHovered = hoveredPart === part.partId;
      const isSelected = selectedPart?.partId === part.partId;

      return (
        <div
          key={part.partId}
          className="absolute cursor-pointer transition-all duration-200 rounded-lg border-2"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${width}%`,
            height: `${height}%`,
            backgroundColor: isHovered || isSelected 
              ? `${color}80` 
              : `${color}40`,
            borderColor: isSelected ? color : `${color}60`,
            borderWidth: isSelected ? '3px' : '2px',
            zIndex: isSelected ? 20 : isHovered ? 15 : 10,
            boxShadow: isSelected 
              ? `0 0 15px ${color}` 
              : isHovered 
              ? `0 0 10px ${color}60` 
              : 'none',
          }}
          onMouseEnter={() => setHoveredPart(part.partId)}
          onMouseLeave={() => setHoveredPart(null)}
          onClick={() => setSelectedPart(part)}
          title={`${part.partName} - ${severity.toUpperCase()} severity`}
        >
          {/* Severity indicator dot */}
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
            style={{ backgroundColor: color }}
          />
        </div>
      );
    });
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Body Impact Analysis
          </h3>
          {lastAnalyzed && (
            <p className="text-xs text-gray-500 mt-1">
              Last analyzed: {lastAnalyzed.toLocaleDateString()} at{' '}
              {lastAnalyzed.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onAnalyze && (
            <button
              onClick={onAnalyze}
              disabled={isLoading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <InformationCircleIcon className="w-4 h-4" />
                  Analyze
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-white" />
          <span className="text-xs text-gray-600">Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white" />
          <span className="text-xs text-gray-600">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
          <span className="text-xs text-gray-600">High</span>
        </div>
        {bodyImpactAnalysis?.analysisMetadata && (
          <div className="ml-auto text-xs text-gray-500">
            {bodyImpactAnalysis.analysisMetadata.totalConditionsAnalyzed || 0} conditions,{' '}
            {bodyImpactAnalysis.analysisMetadata.totalParametersAnalyzed || 0} parameters analyzed
          </div>
        )}
      </div>

      {/* Body Visualization */}
      <div className="relative w-full" ref={containerRef}>
        <div className="relative w-full max-w-md mx-auto">
          {/* Body Image - Always shown */}
          <div className="relative w-full aspect-[3/4]">
            <Image
              src="/body.jpg"
              alt="Human body diagram"
              fill
              className="object-contain"
              onLoad={() => setImageLoaded(true)}
              priority
            />
            
            {/* Overlay Regions - Only shown if there are affected parts */}
            {imageLoaded && displayParts.length > 0 && (
              <div className="absolute inset-0">
                {renderOverlayRegions()}
              </div>
            )}
          </div>

          {/* No areas of concern message - Shown below image when no affected parts */}
          {displayParts.length === 0 && !isLoading && (
            <p className="text-center text-gray-500 text-sm mt-4">
              No specific areas of concern identified.
            </p>
          )}
          {/* Fallback indicator */}
          {displayParts.length > 0 && affectedParts.length === 0 && !isLoading && (
            <p className="text-center text-yellow-600 text-xs mt-2">
              Showing basic analysis. Click "Analyze" for AI-powered detailed analysis.
            </p>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Analyzing body impact...</p>
              <p className="text-sm text-gray-500 mt-1">This may take a few seconds</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Part Details Modal */}
      {selectedPart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">
                {selectedPart.partName}
              </h4>
              <button
                onClick={() => setSelectedPart(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Severity Badge */}
              <div className="mb-4">
                <span
                  className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: getSeverityColor(selectedPart.severity) }}
                >
                  {selectedPart.severity.toUpperCase()} Severity
                </span>
                <span className="ml-3 text-sm text-gray-500">
                  Confidence: {Math.round(selectedPart.confidence * 100)}%
                </span>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h5 className="text-sm font-semibold text-gray-900 mb-2">Impact Description</h5>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedPart.impactDescription}
                </p>
              </div>

              {/* Related Conditions */}
              {selectedPart.relatedConditions.length > 0 && (
                <div className="mb-6">
                  <h5 className="text-sm font-semibold text-gray-900 mb-2">Related Conditions</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedPart.relatedConditions.map((condition, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                      >
                        {condition}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Parameters */}
              {selectedPart.relatedParameters.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-2">Related Parameters</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedPart.relatedParameters.map((param, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium"
                      >
                        {param}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Affected Parts List (Collapsible) */}
      {displayParts.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-gray-900 flex items-center justify-between">
              <span>Affected Body Parts ({displayParts.length})</span>
              <svg
                className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-3 space-y-2">
              {displayParts.map((part) => (
                <div
                  key={part.partId}
                  className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setSelectedPart(part)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{part.partName}</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: getSeverityColor(part.severity) }}
                    >
                      {part.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {part.impactDescription}
                  </p>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

