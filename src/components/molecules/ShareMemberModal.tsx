'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { getProfileByPhone, shareMember, unshareMember } from '@/components/common/lib/constants/urls';
import toast from 'react-hot-toast';

interface ShareMemberModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  member: any;
  profile: any;
  onMemberShared?: () => void;
}

export default function ShareMemberModal({ 
  visible, 
  setVisible, 
  member, 
  profile, 
  onMemberShared 
}: ShareMemberModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundProfile, setFoundProfile] = useState<any>(null);
  const [sharing, setSharing] = useState(false);
  const [unsharing, setUnsharing] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  const [isAlreadyShared, setIsAlreadyShared] = useState(false);
  const [shareType, setShareType] = useState<'doctor' | 'acquaintance'>('acquaintance');
  const { refreshProfile } = useAuthContext();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
      setPhoneNumber('');
      setFoundProfile(null);
      setUserNotFound(false);
      setSearching(false);
      setSharing(false);
      setUnsharing(false);
      setIsAlreadyShared(false);
      setShareType('acquaintance');
    }
    // Note: We don't refresh profile on open to avoid glitches
    // The profile prop should already have the latest data
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

    // Don't allow sharing with yourself
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
        
        // Check if member is already shared with this user
        // The sharedWith can be in the profile's members array OR on the member object itself
        // It might be in enriched format (objects with id property) or plain strings/IDs
        const memberEntry = profile?.members?.find(
          (m: any) => String(m.memberId) === String(member._id)
        );
        const memberSharedWith = memberEntry?.sharedWith || member?.sharedWith || [];
        const recipientId = String(foundUser._id);
        const recipientPhone = formattedPhone;
        
        // Check if already shared - handle both enriched format and plain IDs
        const alreadyShared = memberSharedWith.some((item: any) => {
          // Handle enriched format (object with id property)
          if (item && typeof item === 'object' && item.id) {
            const itemId = String(item.id);
            return itemId === recipientId || itemId === recipientPhone;
          }
          // Handle plain string/ID format
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
    if (!member || !profile) {
      toast.error('Member or profile information is missing');
      return;
    }

    // Validate: Don't allow sharing with yourself
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (formattedPhone === profile?.phoneNumber) {
      toast.error('Cannot share with yourself');
      return;
    }

    // Also check by profile ID if found profile exists
    if (foundProfile?._id && foundProfile._id === profile._id) {
      toast.error('Cannot share with yourself');
      return;
    }

    setSharing(true);
    try {
      const response = await axios.post(shareMember, {
        sharerProfileId: profile._id,
        memberId: member._id,
        recipientPhoneNumber: formattedPhone,
        recipientProfileId: foundProfile?._id || null,
        shareType: shareType, // 'doctor' or 'acquaintance'
      });

      if (response.data?.success) {
        toast.success(
          foundProfile 
            ? 'Member shared successfully!' 
            : 'Share request saved. User will be notified when they register.'
        );
        // Invalidate queries first, then close modal
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
        queryClient.invalidateQueries({ queryKey: ['getMembersById'] });
        if (onMemberShared) onMemberShared();
        // Close modal after a brief delay to allow state updates
        setTimeout(() => {
          setVisible(false);
          refreshProfile();
        }, 100);
      } else {
        toast.error('Failed to share member');
      }
    } catch (error: any) {
      console.error('Error sharing member:', error);
      const errorMessage = error?.response?.data?.error || 'Failed to share member';
      toast.error(errorMessage);
    } finally {
      setSharing(false);
    }
  };

  const handleUnshare = async () => {
    if (!member || !profile) {
      toast.error('Member or profile information is missing');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    setUnsharing(true);
    try {
      const response = await axios.post(unshareMember, {
        sharerProfileId: profile._id,
        memberId: member._id,
        recipientPhoneNumber: formattedPhone,
        recipientProfileId: foundProfile?._id || null,
      });

      if (response.data?.success) {
        toast.success('Member unshared successfully!');
        // Invalidate queries first, then close modal
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
        queryClient.invalidateQueries({ queryKey: ['getMembersById'] });
        if (onMemberShared) onMemberShared();
        // Close modal after a brief delay to allow state updates
        setTimeout(() => {
          setVisible(false);
          refreshProfile();
        }, 100);
      } else {
        toast.error('Failed to unshare member');
      }
    } catch (error: any) {
      console.error('Error unsharing member:', error);
      const errorMessage = error?.response?.data?.error || 'Failed to unshare member';
      toast.error(errorMessage);
    } finally {
      setUnsharing(false);
    }
  };

  const handleShareWithUnregisteredUser = async () => {
    if (!confirm(
      `User with phone number ${phoneNumber} is not registered. Do you still want to share this member? They will receive the share request when they register with this number.`
    )) {
      return;
    }

    await handleShare();
  };

  const handleClose = () => {
    setVisible(false);
  };

  if (!visible || !member) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Share / Unshare Member</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Member Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center bg-gray-300">
                <span className="text-2xl text-gray-600">
                  {member.firstName?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {member.firstName} {member.lastName}
                </h3>
                <p className="text-sm text-gray-600">Relation: {member.relation}</p>
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
                      <p className="text-sm text-blue-700 font-medium mt-1">This member is already shared with this user</p>
                    )}
                  </div>
                </div>
              </div>

              {!isAlreadyShared && (
                <div className="space-y-4">
                  {/* Share Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Share As <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShareType('doctor')}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                          shareType === 'doctor'
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>Doctor</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareType('acquaintance')}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                          shareType === 'acquaintance'
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Acquaintance</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {sharing ? 'Sharing...' : 'Share Member'}
                  </button>
                </div>
              )}

              {isAlreadyShared && (
                <button
                  onClick={handleUnshare}
                  disabled={unsharing}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {unsharing ? 'Unsharing...' : 'Unshare Member'}
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
                  You can still share this member. They will receive the share request when they register with this number.
                </p>
              </div>

              <div className="space-y-4">
                {/* Share Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Share As <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShareType('doctor')}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                        shareType === 'doctor'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Doctor</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareType('acquaintance')}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                        shareType === 'acquaintance'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Acquaintance</span>
                      </div>
                    </button>
                  </div>
              </div>

              <button
                onClick={handleShareWithUnregisteredUser}
                disabled={sharing}
                className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {sharing ? 'Sharing...' : 'Share Anyway'}
              </button>
              </div>
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

