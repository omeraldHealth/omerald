'use client';

import React from 'react';

interface LabReportTableProps {
  report: any;
  isTest?: boolean;
}

interface Parameter {
  name?: string;
  units?: string;
  value?: number | string;
  bioRefRange?: {
    basicRange?: Array<{
      value?: number | string;
      min?: number;
      max?: number;
      unit?: string;
    }>;
    advanceRange?: {
      ageRange?: Array<{
        ageRangeType?: string;
        value?: number | string;
        min?: number;
        max?: number;
        unit?: string;
      }>;
      genderRange?: Array<{
        genderRangeType?: string;
        value?: number | string;
        min?: number;
        max?: number;
        unit?: string;
      }>;
    };
  };
}

interface Component {
  title?: string;
  content?: string;
  images?: string[];
}

const LabReportTable = ({ report, isTest = false }: LabReportTableProps) => {
  // Extract parameters and components - handle both pending (reportData.parsedData) and accepted (parsedData) formats
  const parameters = (isTest
    ? (report?.parameters as Parameter[])
    : (report?.reportData?.parsedData?.parameters || 
       report?.parsedData?.parameters ||
       (typeof report?.parsedData === 'object' && !Array.isArray(report?.parsedData) 
         ? report?.parsedData?.parameters 
         : undefined))) as Parameter[] | undefined;

  const components = (isTest
    ? (report?.components as Component[])
    : (report?.reportData?.parsedData?.components ||
       report?.parsedData?.components ||
       (typeof report?.parsedData === 'object' && !Array.isArray(report?.parsedData) 
         ? report?.parsedData?.components 
         : undefined))) as Component[] | undefined;

  const hasParameters = parameters && parameters.length > 0;
  const hasComponents = components && components.length > 0;

  const isOutOfRange = (value: number | string | undefined, min: number | undefined, max: number | undefined) => {
    if (value === undefined || min === undefined || max === undefined) return false;
    const numericValue = Number(value);
    return numericValue < min || numericValue > max;
  };

  // Determine value status: 'below', 'in-range', 'above', or 'unknown'
  const getValueStatus = (param: Parameter): 'below' | 'in-range' | 'above' | 'unknown' => {
    const resultValue = param?.value;
    if (resultValue === undefined || resultValue === null || resultValue === 'N/A') return 'unknown';
    
    const numericValue = Number(resultValue);
    if (isNaN(numericValue)) return 'unknown';

    if (!param?.bioRefRange) return 'unknown';

    let isBelow = false;
    let isAbove = false;
    let isInRange = false;

    // Check basic ranges
    if (param.bioRefRange.basicRange && param.bioRefRange.basicRange.length > 0) {
      for (const range of param.bioRefRange.basicRange) {
        if (range.min !== undefined && range.max !== undefined) {
          if (numericValue < range.min) {
            isBelow = true;
          } else if (numericValue > range.max) {
            isAbove = true;
          } else {
            isInRange = true;
          }
        }
      }
    }

    // Check gender ranges
    if (param.bioRefRange.advanceRange?.genderRange && param.bioRefRange.advanceRange.genderRange.length > 0) {
      for (const range of param.bioRefRange.advanceRange.genderRange) {
        if (range.min !== undefined && range.max !== undefined) {
          if (numericValue < range.min) {
            isBelow = true;
          } else if (numericValue > range.max) {
            isAbove = true;
          } else {
            isInRange = true;
          }
        }
      }
    }

    // Check age ranges
    if (param.bioRefRange.advanceRange?.ageRange && param.bioRefRange.advanceRange.ageRange.length > 0) {
      for (const range of param.bioRefRange.advanceRange.ageRange) {
        if (range.min !== undefined && range.max !== undefined) {
          if (numericValue < range.min) {
            isBelow = true;
          } else if (numericValue > range.max) {
            isAbove = true;
          } else {
            isInRange = true;
          }
        }
      }
    }

    // Priority: if in range, return in-range; otherwise return the first issue found
    if (isInRange && !isBelow && !isAbove) return 'in-range';
    if (isBelow) return 'below';
    if (isAbove) return 'above';
    return 'unknown';
  };

  // Get color class based on value status
  const getValueColorClass = (status: 'below' | 'in-range' | 'above' | 'unknown'): string => {
    switch (status) {
      case 'in-range':
        return 'text-green-600 font-semibold';
      case 'below':
        return 'text-yellow-600 font-semibold';
      case 'above':
        return 'text-red-600 font-semibold';
      default:
        return 'text-gray-600';
    }
  };

  const getRangeTypeLabel = (range?: any, rangeType?: string): string => {
    if (range?.genderRangeType) {
      const genderType = range.genderRangeType;
      if (genderType === 'male') return 'Male';
      if (genderType === 'female') return 'Female';
      return genderType.charAt(0).toUpperCase() + genderType.slice(1);
    } else if (range?.ageRangeType) {
      const ageType = range.ageRangeType;
      return ageType.charAt(0).toUpperCase() + ageType.slice(1);
    } else if (rangeType === 'basic' || !rangeType) {
      return 'Normal';
    }
    return '';
  };

  const getAllReferenceRanges = (param: Parameter): string => {
    if (!param?.bioRefRange) return '-';

    const ranges: string[] = [];
    
    if (param.bioRefRange.basicRange && param.bioRefRange.basicRange.length > 0) {
      param.bioRefRange.basicRange.forEach((range) => {
        ranges.push(`Normal: ${range.min} - ${range.max}${range.unit ? ` ${range.unit}` : ''}`);
      });
    }

    if (param.bioRefRange.advanceRange?.genderRange && param.bioRefRange.advanceRange.genderRange.length > 0) {
      param.bioRefRange.advanceRange.genderRange.forEach((range) => {
        const genderLabel = getRangeTypeLabel(range, 'gender');
        ranges.push(`${genderLabel}: ${range.min} - ${range.max}${range.unit ? ` ${range.unit}` : ''}`);
      });
    }

    if (param.bioRefRange.advanceRange?.ageRange && param.bioRefRange.advanceRange.ageRange.length > 0) {
      param.bioRefRange.advanceRange.ageRange.forEach((range) => {
        const ageLabel = getRangeTypeLabel(range, 'age');
        ranges.push(`${ageLabel}: ${range.min} - ${range.max}${range.unit ? ` ${range.unit}` : ''}`);
      });
    }

    if (ranges.length === 0) return '-';
    return ranges.join(', ');
  };

  const getPrimaryRange = (param: Parameter) => {
    if (param?.bioRefRange?.basicRange && param.bioRefRange.basicRange.length > 0) {
      return { range: param.bioRefRange.basicRange[0], type: 'basic' };
    }
    if (param?.bioRefRange?.advanceRange?.genderRange && param.bioRefRange.advanceRange.genderRange.length > 0) {
      return { range: param.bioRefRange.advanceRange.genderRange[0], type: 'gender' };
    }
    if (param?.bioRefRange?.advanceRange?.ageRange && param.bioRefRange.advanceRange.ageRange.length > 0) {
      return { range: param.bioRefRange.advanceRange.ageRange[0], type: 'age' };
    }
    return null;
  };

  return (
    <div className="w-full overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-5">
      {hasParameters && (
        <div className="min-w-full inline-block align-middle">
          <table className="min-w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-1.5 sm:p-2 text-left text-xs sm:text-sm font-semibold">Investigation</th>
                <th className="p-1.5 sm:p-2 text-left text-xs sm:text-sm font-semibold">Result</th>
                <th className="p-1.5 sm:p-2 text-left text-xs sm:text-sm font-semibold">Reference Value</th>
                <th className="p-1.5 sm:p-2 text-left text-xs sm:text-sm font-semibold">Unit</th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((param, paramIndex) => {
                const primaryRange = getPrimaryRange(param);
                const resultValue = param?.value !== undefined && param?.value !== null ? param.value : 'N/A';
                const displayUnit = param?.units || primaryRange?.range?.unit || 'N/A';
                
                const valueStatus = getValueStatus(param);
                const valueColorClass = getValueColorClass(valueStatus);

                const referenceValue = getAllReferenceRanges(param);

                return (
                  <tr key={paramIndex} className="border-b text-left">
                    <td className="text-xs sm:text-sm md:text-base p-1.5 sm:p-2 font-semibold">{param?.name}</td>
                    <td className={`text-md p-2 ${valueColorClass}`}>
                      {resultValue}
                    </td>
                    <td className="text-md p-2">
                      <div className="space-y-1">
                        {referenceValue.split(', ').map((range, idx) => (
                          <div key={idx} className="text-xs sm:text-sm">
                            {range}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="text-md p-2">{displayUnit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasComponents && (
        <div className="mt-4 sm:mt-6">
          <h2 className="mb-2 sm:mb-3 text-lg sm:text-xl font-bold">Information</h2>
          {components.map((component, index) => (
            <div key={index} className="mt-3 sm:mt-4 border-t pt-3 sm:pt-4">
              <h3 className="text-base sm:text-lg font-bold">{component.title}</h3>
              <div
                className="ck-content text-sm sm:text-base"
                dangerouslySetInnerHTML={{ __html: component.content || '' }}
              ></div>
              {component.images && component.images.length > 0 && (
                <div className="mt-4 space-y-2">
                  {component.images.map((imageUrl, imgIndex) => (
                    <img
                      key={imgIndex}
                      src={imageUrl}
                      alt={`${component.title} - Image ${imgIndex + 1}`}
                      className="max-w-full h-auto rounded"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasParameters && !hasComponents && (
        <div className="p-4 sm:p-5 text-center text-sm sm:text-base text-gray-500">
          No report data available
        </div>
      )}
    </div>
  );
};

export default LabReportTable;

