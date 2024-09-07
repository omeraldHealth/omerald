'use client';

import React, { useState, useRef, useMemo } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { extractReportTypes, getAllReportTypes } from '@/lib/utils/report-type-analyzer';

interface DiagnosedConditionsAndReportTypesProps {
  member: any;
  onUpdate: (updates: any) => Promise<void>;
  diagnosedConditions: any[];
  reports: any[];
  onAnalyzeConditions?: (silent?: boolean) => void;
  onAnalyzeBodyImpact?: (silent?: boolean) => void;
  isAnalyzingConditions?: boolean;
}

export function DiagnosedConditionsAndReportTypes({
  member,
  onUpdate,
  diagnosedConditions = [],
  reports = [],
  onAnalyzeConditions,
  onAnalyzeBodyImpact,
  isAnalyzingConditions = false,
}: DiagnosedConditionsAndReportTypesProps) {
  const [showAddCondition, setShowAddCondition] = useState(false);
  const [newCondition, setNewCondition] = useState('');
  const [showAddReportType, setShowAddReportType] = useState(false);
  const [newReportType, setNewReportType] = useState('');
  const [showConditionsTooltip, setShowConditionsTooltip] = useState(false);
  const [showReportTypesTooltip, setShowReportTypesTooltip] = useState(false);
  const conditionsTooltipRef = useRef<HTMLDivElement>(null);
  const reportTypesTooltipRef = useRef<HTMLDivElement>(null);

  // Extract report types from reports
  const extractedReportTypes = useMemo(() => {
    if (!reports || reports.length === 0) return [];
    return extractReportTypes(reports);
  }, [reports]);

  // Combine stored report types with extracted ones for display
  const displayReportTypes = useMemo(() => {
    const storedTypes = member?.reportTypes || [];
    const allTypes = Array.from(new Set([...storedTypes, ...extractedReportTypes]));
    return allTypes;
  }, [member?.reportTypes, extractedReportTypes]);

  const handleAddCondition = async () => {
    if (!newCondition.trim()) {
      toast.error('Please enter a condition name');
      return;
    }

    const conditionExists = diagnosedConditions.some((c: any) => {
      const conditionText = typeof c === 'string' ? c : c.condition;
      return conditionText.toLowerCase() === newCondition.trim().toLowerCase();
    });

    if (conditionExists) {
      toast.error('This condition already exists');
      return;
    }

    try {
      const updatedConditions = [
        ...diagnosedConditions,
        { condition: newCondition.trim(), date: new Date().toISOString() },
      ];
      await onUpdate({ diagnosedCondition: updatedConditions });
      setNewCondition('');
      setShowAddCondition(false);
      toast.success('Condition added successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to add condition');
    }
  };

  const handleRemoveCondition = async (index: number) => {
    try {
      const updatedConditions = diagnosedConditions.filter((_: any, i: number) => i !== index);
      await onUpdate({ diagnosedCondition: updatedConditions });
      toast.success('Condition removed successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to remove condition');
    }
  };

  const handleAddReportType = async () => {
    if (!newReportType.trim()) {
      toast.error('Please enter a report type');
      return;
    }

    const reportTypes = member?.reportTypes || [];
    if (reportTypes.includes(newReportType.trim())) {
      toast.error('This report type already exists');
      return;
    }

    try {
      const updatedReportTypes = [...reportTypes, newReportType.trim()];
      await onUpdate({ reportTypes: updatedReportTypes });
      setNewReportType('');
      setShowAddReportType(false);
      toast.success('Report type added successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to add report type');
    }
  };

  const handleRemoveReportType = async (reportType: string) => {
    try {
      const reportTypes = member?.reportTypes || [];
      const updatedReportTypes = reportTypes.filter((rt: string) => rt !== reportType);
      await onUpdate({ reportTypes: updatedReportTypes });
      toast.success('Report type removed successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to remove report type');
    }
  };

  return (
    <div className="space-y-4">
      {/* Diagnosed Conditions Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Diagnosed Conditions</h3>
          <div className="flex gap-2">
            {onAnalyzeConditions && (
              <button
                onClick={() => onAnalyzeConditions(false)}
                disabled={isAnalyzingConditions}
                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzingConditions ? 'Scanning...' : 'Scan Reports'}
              </button>
            )}
            {/* {onAnalyzeBodyImpact && (
              <button
                onClick={() => onAnalyzeBodyImpact(false)}
                className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Analyze Body Impact
              </button>
            )} */}
            <button
              onClick={() => setShowAddCondition(!showAddCondition)}
              className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center gap-1"
            >
              <PlusIcon className="w-3 h-3" />
              Add
            </button>
          </div>
        </div>

        {showAddCondition && (
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCondition()}
              placeholder="Enter condition name"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddCondition}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddCondition(false);
                setNewCondition('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          {diagnosedConditions.length > 0 ? (
            <>
              {diagnosedConditions.slice(0, 10).map((condition: any, index: number) => {
                const conditionText = typeof condition === 'string' ? condition : condition.condition;
                return (
                  <span
                    key={index}
                    className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium flex items-center gap-2"
                  >
                    {conditionText}
                    <button
                      onClick={() => handleRemoveCondition(index)}
                      className="text-orange-600 hover:text-orange-800"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              {diagnosedConditions.length > 10 && (
                <div className="relative" ref={conditionsTooltipRef}>
                  <span 
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                    onMouseEnter={() => setShowConditionsTooltip(true)}
                    onMouseLeave={() => setShowConditionsTooltip(false)}
                  >
                    +{diagnosedConditions.length - 10} more...
                  </span>
                  {showConditionsTooltip && (
                    <div 
                      className="absolute z-50 mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 max-w-xs max-h-64 overflow-y-auto"
                      style={{ minWidth: '200px' }}
                      onMouseEnter={() => setShowConditionsTooltip(true)}
                      onMouseLeave={() => setShowConditionsTooltip(false)}
                    >
                      <p className="text-xs font-semibold text-gray-700 mb-2">All Diagnosed Conditions ({diagnosedConditions.length}):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {diagnosedConditions.map((condition: any, index: number) => {
                          const conditionText = typeof condition === 'string' ? condition : condition.condition;
                          return (
                            <span
                              key={index}
                              className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs"
                            >
                              {conditionText}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500">No diagnosed conditions</p>
          )}
        </div>
      </div>

      {/* Report Types Section */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Report Types</h3>
          <button
            onClick={() => setShowAddReportType(!showAddReportType)}
            className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center gap-1"
          >
            <PlusIcon className="w-3 h-3" />
            Add
          </button>
        </div>

        {showAddReportType && (
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={newReportType}
              onChange={(e) => setNewReportType(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddReportType()}
              placeholder="Enter report type"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddReportType}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddReportType(false);
                setNewReportType('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          {displayReportTypes.length > 0 ? (
            <>
              {displayReportTypes.slice(0, 10).map((reportType: string, index: number) => {
                const isStored = member?.reportTypes?.includes(reportType);
                const isExtracted = extractedReportTypes.includes(reportType);
                
                return (
                  <span
                    key={index}
                    className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${
                      isExtracted && !isStored
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {reportType}
                    {isExtracted && !isStored && (
                      <span className="text-xs" title="Extracted from reports">
                        📄
                      </span>
                    )}
                    {isStored && (
                      <button
                        onClick={() => handleRemoveReportType(reportType)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                );
              })}
              {displayReportTypes.length > 10 && (
                <div className="relative" ref={reportTypesTooltipRef}>
                  <span 
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                    onMouseEnter={() => setShowReportTypesTooltip(true)}
                    onMouseLeave={() => setShowReportTypesTooltip(false)}
                  >
                    +{displayReportTypes.length - 10} more...
                  </span>
                  {showReportTypesTooltip && (
                    <div 
                      className="absolute z-50 mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 max-w-xs max-h-64 overflow-y-auto"
                      style={{ minWidth: '200px' }}
                      onMouseEnter={() => setShowReportTypesTooltip(true)}
                      onMouseLeave={() => setShowReportTypesTooltip(false)}
                    >
                      <p className="text-xs font-semibold text-gray-700 mb-2">All Report Types ({displayReportTypes.length}):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {displayReportTypes.map((reportType: string, index: number) => {
                          const isStored = member?.reportTypes?.includes(reportType);
                          const isExtracted = extractedReportTypes.includes(reportType);
                          return (
                            <span
                              key={index}
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                isExtracted && !isStored
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {reportType}
                              {isExtracted && !isStored && (
                                <span className="ml-1 text-xs" title="Extracted from reports">
                                  📄
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500">
              {reports.length > 0 
                ? 'No report types found in reports' 
                : 'No report types'}
            </p>
          )}
        </div>
        
        {extractedReportTypes.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {extractedReportTypes.length} report type(s) found in {reports.length} report(s)
          </p>
        )}
      </div>
    </div>
  );
}

