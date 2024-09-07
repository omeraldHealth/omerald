'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface FooterProps {
  report?: any;
}

interface PathologistDetails {
  name?: string;
  signature?: string;
  designation?: string;
}

const Footer = ({ report }: FooterProps) => {
  const [pathologistDetails, setPathologistDetails] = useState<PathologistDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPathologistDetails = async () => {
      if (!report) {
        setLoading(false);
        return;
      }

      try {
        const pathologistId = report?.pathologist?.id || 
          report?.pathologist?._id || 
          null;
        
        const pathologistName = report?.pathologist?.name || 
          report?.createdBy || 
          null;

        const branchId = report?.branchId ||
          report?.diagnosticCenter?.branch?.id ||
          report?.diagnosticCenter?.branch?._id ||
          (typeof report?.diagnosticCenter?.branch === 'string' 
            ? report.diagnosticCenter.branch 
            : null);

        // Fetch pathologist details if we have pathologistId or branchId
        if (pathologistId || (branchId && pathologistName)) {
          try {
            const response = await fetch('/api/diagnosticCenter/getPathologistDetails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                pathologistId, 
                branchId, 
                pathologistName 
              }),
            });
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data) {
                setPathologistDetails(result.data);
              }
            }
          } catch (error) {
            console.error('Error fetching pathologist details:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching footer details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPathologistDetails();
  }, [report]);

  const pathologistName = pathologistDetails?.name || 
    report?.pathologist?.name || 
    report?.createdBy || 
    '';
  
  const pathologistSignature = pathologistDetails?.signature || 
    report?.pathologist?.signature || 
    null;
  
  const pathologistDesignation = pathologistDetails?.designation || 
    report?.pathologist?.designation || 
    'Pathologist';

  if (loading) {
    return (
      <div className="p-4 px-20 my-2 border-t border-gray-700 py-2">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 px-20 my-2 border-t border-gray-700 py-2">
      <div className="flex justify-between items-end">
        {/* Left side - Signatures */}
        <div className="flex gap-8 items-end">
          <div>
            <p>Thanks for Reference</p>
            <section>
              <Image
                className="w-20"
                src="https://www.signwell.com/assets/vip-signatures/muhammad-ali-signature-3f9237f6fc48c3a04ba083117948e16ee7968aae521ae4ccebdfb8f22596ad22.svg"
                alt="Lab Technician Signature"
                width={80}
                height={80}
                unoptimized
              />
              <p className="mb-1">Lab Technician</p>
              <p className="mb-0">(DMLT, BMLT)</p>
            </section>
          </div>
          {/* Pathologist signature section - hidden */}
          {/* {pathologistName && (
            <div>
              <section>
                {pathologistSignature ? (
                  <Image
                    className="w-20"
                    src={pathologistSignature}
                    alt={`${pathologistName} signature`}
                    width={80}
                    height={80}
                    unoptimized
                  />
                ) : (
                  <div className="w-20 h-20 border-b-2 border-gray-400 mb-2"></div>
                )}
                <p className="mb-1">{pathologistName}</p>
                <p className="mb-0">({pathologistDesignation})</p>
              </section>
            </div>
          )} */}
        </div>
        {/* Right bottom - Powered by omerald */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Powered by</span>
          <Image
            src="/onlyOmeraldLogo.png"
            alt="Omerald Logo"
            width={60}
            height={60}
            unoptimized
            className="h-6 w-auto"
          />
          <span className="text-base font-semibold text-gray-700">omerald</span>
        </div>
      </div>
    </div>
  );
};

export default Footer;










