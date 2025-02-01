'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { getProfileByPhone, updateReport } from '@/components/common/lib/constants/urls';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface ShareReportModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  report: any;
  profile: any;
  onReportShared?: () => void;
}

export default function ShareReportModal({ 
  visible, 
  setVisible, 
  report, 
  profile, 
  onReportShared 
}: ShareReportModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundProfile, setFoundProfile] = useState<any>(null);
  const [sharing, setSharing] = useState(false);
  const [unsharing, setUnsharing] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  const [isAlreadyShared, setIsAlreadyShared] = useState(false);
  const { refreshProfile } = useAuthContext();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!visible) {
      setPhoneNumber('');
      setFoundProfile(null);
      setUserNotFound(false);
      setSearching(false);
      setSharing(false);
      setUnsharing(false);
      setIsAlreadyShared(false);
    }
  }, [visible]);

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  };

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (formattedPhone === profile?.phoneNumber) {
      toast.error('Cannot share with yourself');
      return;
    }

    setSearching(true);
    setUserNotFound(false);
    setFoundProfile(null);

    try {
      const response = await axios.get(getProfileByPhone, {
        params: { phoneNumber: formattedPhone },
      });

      if (response.data && response.data._id) {
        const foundUser = response.data;
        setFoundProfile(foundUser);
        setUserNotFound(false);
        
        // Check if report is already shared with this user
        const reportSharedWith = report?.sharedWith || [];
        const recipientId = String(foundUser._id);
        const recipientPhone = formattedPhone;
        
        const alreadyShared = reportSharedWith.some((item: any) => {
          if (item && typeof item === 'object') {
            if (item.profileId) return String(item.profileId) === recipientId;
            if (item.phoneNumber) return String(item.phoneNumber) === recipientPhone;
            if (item.id) return String(item.id) === recipientId || String(item.id) === recipientPhone;
          }
          const itemStr = String(item);
          return itemStr === recipientId || itemStr === recipientPhone;
        });
        
        setIsAlreadyShared(alreadyShared);
      } else {
        setUserNotFound(true);
        setFoundProfile(null);
        setIsAlreadyShared(false);
      }
    } catch (error: any) {
      if (error.response?.status === 404 || !error.response?.data) {
        setUserNotFound(true);
        setFoundProfile(null);
        setIsAlreadyShared(false);
      } else {
        toast.error('Error searching for profile. Please try again.');
        setUserNotFound(false);
        setFoundProfile(null);
        setIsAlreadyShared(false);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleShare = async () => {
    if (!report || !profile) {
      toast.error('Report or profile information is missing');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (formattedPhone === profile?.phoneNumber) {
      toast.error('Cannot share with yourself');
      return;
    }

    if (foundProfile?._id && foundProfile._id === profile._id) {
      toast.error('Cannot share with yourself');
      return;
    }

    setSharing(true);
    try {
      const currentSharedWith = report.sharedWith || [];
      const newSharedEntry = foundProfile 
        ? { profileId: foundProfile._id, phoneNumber: formattedPhone, name: `${foundProfile.firstName} ${foundProfile.lastName}`, sharedAt: new Date() }
        : { phoneNumber: formattedPhone, name: null, sharedAt: new Date() };

      const updatedSharedWith = [...currentSharedWith, newSharedEntry];

      const response = await axios.put(updateReport, {
        id: report._id,
        sharedWith: updatedSharedWith,
      });

      if (response.data) {
        toast.success(
          foundProfile 
            ? 'Report shared successfully!' 
            : 'Share request saved. User will be notified when they register.'
        );
        queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
        if (onReportShared) onReportShared();
        setTimeout(() => {
          setVisible(false);
          refreshProfile();
        }, 100);
      } else {
        toast.error('Failed to share report');
      }
    } catch (error: any) {
      console.error('Error sharing report:', error);
      const errorMessage = error?.response?.data?.error || 'Failed to share report';
      toast.error(errorMessage);
    } finally {
      setSharing(false);
    }
  };

  const handleUnshare = async () => {
    if (!report || !profile) {
      toast.error('Report or profile information is missing');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    setUnsharing(true);
    try {
      const currentSharedWith = report.sharedWith || [];
      const recipientId = foundProfile?._id ? String(foundProfile._id) : null;
      const recipientPhone = formattedPhone;

      const updatedSharedWith = currentSharedWith.filter((item: any) => {
        if (item && typeof item === 'object') {
          if (item.profileId && recipientId) return String(item.profileId) !== recipientId;
          if (item.phoneNumber) return String(item.phoneNumber) !== recipientPhone;
          if (item.id) {
            const itemId = String(item.id);
            return itemId !== recipientId && itemId !== recipientPhone;
          }
        }
        const itemStr = String(item);
        return itemStr !== recipientId && itemStr !== recipientPhone;
      });

      const response = await axios.put(updateReport, {
        id: report._id,
        sharedWith: updatedSharedWith,
      });

      if (response.data) {
        toast.success('Report unshared successfully!');
        queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
        if (onReportShared) onReportShared();
        setTimeout(() => {
          setVisible(false);
          refreshProfile();
        }, 100);
      } else {
        toast.error('Failed to unshare report');
      }
    } catch (error: any) {
      console.error('Error unsharing report:', error);
      const errorMessage = error?.response?.data?.error || 'Failed to unshare report';
      toast.error(errorMessage);
    } finally {
      setUnsharing(false);
    }
  };

  const handleShareWithUnregisteredUser = async () => {
    if (!confirm(
      `User with phone number ${phoneNumber} is not registered. Do you still want to share this report? They will receive the share request when they register with this number.`
    )) {
      return;
    }

    await handleShare();
  };

  const handleClose = () => {
    setVisible(false);
  };

  if (!visible || !report) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto safe-top safe-bottom">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md my-2 sm:my-4 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mobile-scroll">
        {/* Header */}
        <div className="border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Share / Unshare Report</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 tap-target"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Report Info */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-300 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl text-blue-600">📄</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                  {report.name || report.testName || 'Report'}
                </h3>
                <p className="text-sm text-gray-600">Type: {report.type || report.documentType || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Phone Number to Share With <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 9876543210"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <button
                onClick={handleSearch}
                disabled={searching || !phoneNumber.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {searching ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </div>

          {/* User Found */}
          {foundProfile && (
            <div className="space-y-4">
              <div className={`border rounded-lg p-4 ${isAlreadyShared ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                <div className={`flex items-center gap-2 mb-3 ${isAlreadyShared ? 'text-blue-800' : 'text-green-800'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{isAlreadyShared ? 'Already Shared' : 'User found!'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xl text-gray-600">
                      {foundProfile.firstName?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">
                        {foundProfile.isDoctor && foundProfile.doctorApproved 
                          ? `Dr. ${foundProfile.firstName} ${foundProfile.lastName}`
                          : `${foundProfile.firstName} ${foundProfile.lastName}`
                        }
                      </h4>
                      {foundProfile.isDoctor && foundProfile.doctorApproved && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Doctor
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{foundProfile.phoneNumber}</p>
                    <p className="text-sm text-gray-600">{foundProfile.email}</p>
                    {isAlreadyShared && (
                      <p className="text-sm text-blue-700 font-medium mt-1">This report is already shared with this user</p>
                    )}
                  </div>
                </div>
              </div>

              {isAlreadyShared ? (
                <button
                  onClick={handleUnshare}
                  disabled={unsharing}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {unsharing ? 'Unsharing...' : 'Unshare Report'}
                </button>
              ) : (
              <button
                onClick={handleShare}
                disabled={sharing}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {sharing ? 'Sharing...' : 'Share Report'}
              </button>
              )}
            </div>
          )}

          {/* User Not Found */}
          {userNotFound && !foundProfile && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-medium">User not found</span>
                </div>
                <p className="text-sm text-yellow-700">
                  No user found with phone number <strong>{phoneNumber}</strong>. 
                  You can still share this report. They will receive the share request when they register with this number.
                </p>
                {profile?.isDoctor && profile?.doctorApproved && (
                  <p className="text-sm text-yellow-800 font-medium mt-2">
                    ⚠️ As a doctor, you can share with unregistered users. They will see the report when they register.
                  </p>
                )}
              </div>

              <button
                onClick={handleShareWithUnregisteredUser}
                disabled={sharing}
                className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {sharing ? 'Sharing...' : 'Share Anyway'}
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


