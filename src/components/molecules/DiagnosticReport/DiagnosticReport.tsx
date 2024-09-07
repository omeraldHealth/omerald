'use client';

import React, { useState, useEffect } from 'react';
import PatientInfo from './PatientInfo';
import Footer from './Footer';
import Header from './Header';
import LabReportTable from './LabReportTable';

interface DCDetails {
  centerName?: string;
  logoUrl?: string;
  phoneNumber?: string;
  email?: string;
}

interface BranchDetails {
  branchName?: string;
  branchAddress?: string;
}

interface DiagnosticReportProps {
  report: any;
  isTest?: boolean;
  dcDetails?: DCDetails | null;
  branchDetails?: BranchDetails | null;
}

const DiagnosticReport = ({ report, isTest = false, dcDetails: propDCDetails, branchDetails: propBranchDetails }: DiagnosticReportProps) => {
  const [dcDetails, setDCDetails] = useState<DCDetails | null>(propDCDetails || null);
  const [branchDetails, setBranchDetails] = useState<BranchDetails | null>(propBranchDetails || null);
  const [loading, setLoading] = useState(!propDCDetails && !propBranchDetails);

  // Normalize report structure - ensure reportData exists for accepted reports
  const normalizedReport = React.useMemo(() => {
    if (!report) return report;
    
    // If reportData already exists, use it
    if (report.reportData) return report;
    
    // If parsedData exists but reportData doesn't, reconstruct reportData
    if (report.parsedData && typeof report.parsedData === 'object' && !Array.isArray(report.parsedData)) {
      return {
        ...report,
        reportData: {
          reportName: report.name || report.testName || 'Report',
          parsedData: report.parsedData,
          reportDate: report.reportDate,
          updatedDate: report.uploadDate || report.uploadedAt,
        },
      };
    }
    
    return report;
  }, [report]);

  // Update state when props change
  useEffect(() => {
    if (propDCDetails) {
      setDCDetails(propDCDetails);
    }
    if (propBranchDetails) {
      setBranchDetails(propBranchDetails);
    }
    if (propDCDetails || propBranchDetails) {
      setLoading(false);
    }
  }, [propDCDetails, propBranchDetails]);

  // Only fetch if props are not provided
  useEffect(() => {
    // If details are already provided via props, skip fetching
    if (propDCDetails || propBranchDetails) {
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      if (!normalizedReport) {
        setLoading(false);
        return;
      }

      try {
        // Get DC ID - handle multiple formats
        const dcId = normalizedReport?.diagnosticCenterId || 
          normalizedReport?.diagnosticCenter?.diagnostic?.id ||
          normalizedReport?.diagnosticCenter?.diagnostic?._id ||
          (typeof normalizedReport?.diagnosticCenter?.diagnostic === 'string' 
            ? normalizedReport.diagnosticCenter.diagnostic 
            : null) ||
          (normalizedReport?.diagnosticCenter?.diagnostic?.diagnostic 
            ? (typeof normalizedReport.diagnosticCenter.diagnostic.diagnostic === 'string'
                ? normalizedReport.diagnosticCenter.diagnostic.diagnostic
                : normalizedReport.diagnosticCenter.diagnostic.diagnostic?.id || normalizedReport.diagnosticCenter.diagnostic.diagnostic?._id)
            : null);

        // Get Branch ID - handle multiple formats
        const branchId = normalizedReport?.branchId ||
          normalizedReport?.diagnosticCenter?.branch?.id ||
          normalizedReport?.diagnosticCenter?.branch?._id ||
          (typeof normalizedReport?.diagnosticCenter?.branch === 'string' 
            ? normalizedReport.diagnosticCenter.branch 
            : null) ||
          (normalizedReport?.diagnosticCenter?.branch?.branch
            ? (typeof normalizedReport.diagnosticCenter.branch.branch === 'string'
                ? normalizedReport.diagnosticCenter.branch.branch
                : normalizedReport.diagnosticCenter.branch.branch?.id || normalizedReport.diagnosticCenter.branch.branch?._id)
            : null);

        // Fetch DC details if we have DC ID
        if (dcId) {
          try {
            const dcResponse = await fetch('/api/diagnosticCenter/getDCDetails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dcId }),
            });
            if (dcResponse.ok) {
              const dcResult = await dcResponse.json();
              if (dcResult.success && dcResult.data) {
                setDCDetails(dcResult.data);
              }
            }
          } catch (error) {
            console.error('Error fetching DC details:', error);
          }
        }

        // Fetch Branch details if we have Branch ID
        if (branchId) {
          try {
            const branchResponse = await fetch('/api/diagnosticCenter/getBranchDetails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ branchId }),
            });
            if (branchResponse.ok) {
              const branchResult = await branchResponse.json();
              if (branchResult.success && branchResult.data) {
                setBranchDetails(branchResult.data);
              }
            }
          } catch (error) {
            console.error('Error fetching branch details:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching report details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [normalizedReport, propDCDetails, propBranchDetails]);

  if (loading) {
    return (
      <div className="container m-4 mx-auto border bg-white p-4 shadow-lg max-w-full">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
            <p className="text-gray-600">Loading report...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border bg-white p-2 sm:p-4 shadow-lg">
      {/* Header Section */}
      <div className="border-b border-gray-300 pb-2 sm:pb-4">
        <Header report={normalizedReport} dcDetails={dcDetails} branchDetails={branchDetails} />
      </div>

      {/* Gradient Divider */}
      <div className="relative my-2 sm:my-4 h-2">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-blue-700"></div>
      </div>

      {/* Patient Information */}
      <div className="p-2 sm:p-4">
        <PatientInfo record={normalizedReport} />
      </div>

      {/* Report Title */}
      <div className="border-y border-gray-300 p-2 sm:p-4 relative">
        <div className="text-center">
          <h2 className="text-lg sm:text-2xl font-bold break-words">
            {normalizedReport?.reportData?.reportName || 
             normalizedReport?.name || 
             normalizedReport?.testName || 
             'Report Name'}
          </h2>
        </div>
        {/* Color Legend - Right corner, tiny */}
        <div className="absolute bottom-1 right-2 sm:bottom-2 sm:right-4 flex items-center gap-1 sm:gap-3 text-[10px] sm:text-xs flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-600"></div>
            <span className="text-gray-600">In Range</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
            <span className="text-gray-600">Below Range</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-600"></div>
            <span className="text-gray-600">Above Range</span>
          </div>
        </div>
      </div>

      {/* Lab Report Table */}
      <div className="p-2 sm:p-4">
        <LabReportTable report={normalizedReport} isTest={isTest} />
      </div>

      {/* Footer Section */}
      <div className="mt-8">
        <Footer report={normalizedReport} />
      </div>
    </div>
  );
};

export default DiagnosticReport;

