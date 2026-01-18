'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { DEFAULT_DC_LOGO_URL } from '@/components/common/lib/constants/constants';

interface HeaderProps {
  report?: any;
  dcDetails?: {
    centerName?: string;
    logoUrl?: string;
    phoneNumber?: string;
    email?: string;
  } | null;
  branchDetails?: {
    branchName?: string;
    branchAddress?: string;
  } | null;
}

// Helper function to check if logo URL is broken or invalid
const isValidLogoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  // Filter out broken Unsplash URLs and other invalid URLs
  if (url.includes('images.unsplash.com') && url.includes('photo-1559757148')) {
    return false;
  }
  return true;
};

const Header = ({ report, dcDetails, branchDetails }: HeaderProps) => {
  // State to handle image loading errors
  const [imageError, setImageError] = useState(false);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);

  // Get diagnostic center name - handle multiple formats
  const centerName = dcDetails?.centerName || 
    report?.diagnosticCenter?.diagnostic?.name ||
    report?.diagnosticCenter?.name ||
    (typeof report?.diagnosticCenter === 'string' ? report.diagnosticCenter : null) ||
    'Diagnostic Center';

  // Get logo URL - filter out broken Unsplash URLs
  const originalLogoUrl = dcDetails?.logoUrl || 
    report?.diagnosticCenter?.diagnostic?.logo ||
    report?.diagnosticCenter?.logo ||
    null;

  // Determine the logo URL to use
  const logoUrl = useMemo(() => {
    if (imageError) {
      return DEFAULT_DC_LOGO_URL;
    }
    if (currentLogoUrl) {
      return currentLogoUrl;
    }
    return isValidLogoUrl(originalLogoUrl) ? originalLogoUrl : DEFAULT_DC_LOGO_URL;
  }, [originalLogoUrl, imageError, currentLogoUrl]);

  // Handle image load error - fallback to default logo
  const handleImageError = () => {
    setImageError(true);
    setCurrentLogoUrl(DEFAULT_DC_LOGO_URL);
  };

  // Get contact information
  const phoneNumber = dcDetails?.phoneNumber || 
    report?.diagnosticCenter?.diagnostic?.phoneNumber ||
    report?.diagnosticCenter?.phoneNumber ||
    '';

  const email = dcDetails?.email || 
    report?.diagnosticCenter?.diagnostic?.email ||
    report?.diagnosticCenter?.email ||
    '';

  // Get branch information - handle multiple formats
  const branchName = branchDetails?.branchName || 
    report?.diagnosticCenter?.branch?.name ||
    report?.branch?.name ||
    (typeof report?.branch === 'string' ? report.branch : null) ||
    report?.branchName ||
    '';

  const branchAddress = branchDetails?.branchAddress || 
    report?.diagnosticCenter?.branch?.address ||
    report?.branch?.address ||
    report?.branchAddress ||
    '';

  return (
    <div className="flex items-start justify-between gap-6 px-4 py-4">
      {/* Left side - Logo and Center Name */}
      <div className="flex items-start gap-4">
        {/* Always show logo placeholder or actual logo */}
        <div className="flex-shrink-0">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${centerName} Logo`}
              width={80}
              height={80}
              className="object-contain"
              unoptimized
              onError={handleImageError}
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{centerName}</h1>
          {branchName && (
            <p className="text-sm text-gray-600 mb-1">{branchName}</p>
          )}
          {branchAddress && (
            <p className="text-sm text-gray-600">{branchAddress}</p>
          )}
          {!branchName && !branchAddress && centerName === 'Diagnostic Center' && report?.diagnosticCenter && typeof report.diagnosticCenter === 'string' && (
            <p className="text-sm text-gray-600">{report.diagnosticCenter}</p>
          )}
        </div>
      </div>

      {/* Right side - Contact Information */}
      <div className="text-right">
        {phoneNumber && (
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-semibold">Phone:</span> {phoneNumber}
          </p>
        )}
        {email && (
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Email:</span> {email}
          </p>
        )}
        {!phoneNumber && !email && (
          <p className="text-sm text-gray-500 italic">Contact information not available</p>
        )}
      </div>
    </div>
  );
};

export default Header;








