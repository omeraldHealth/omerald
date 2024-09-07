'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { updateProfile } from '@/components/common/lib/constants/urls';
import toast from 'react-hot-toast';

interface EditMemberModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  member: any;
  profile: any;
  onMemberUpdated?: () => void;
}

const RELATION_OPTIONS = [
  { value: 'Self', label: 'Self' },
  { value: 'Father', label: 'Father' },
  { value: 'Mother', label: 'Mother' },
  { value: 'Brother', label: 'Brother' },
  { value: 'Sister', label: 'Sister' },
  { value: 'Son', label: 'Son' },
  { value: 'Daughter', label: 'Daughter' },
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Grandfather', label: 'Grandfather' },
  { value: 'Grandmother', label: 'Grandmother' },
  { value: 'Uncle', label: 'Uncle' },
  { value: 'Aunt', label: 'Aunt' },
  { value: 'Cousin', label: 'Cousin' },
  { value: 'Other', label: 'Other' },
];

export default function EditMemberModal({ visible, setVisible, member, profile, onMemberUpdated }: EditMemberModalProps) {
  const [relation, setRelation] = useState(member?.relation || 'Father');
  const [updating, setUpdating] = useState(false);
  const { refreshProfile } = useAuthContext();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (member?.relation) {
      setRelation(member.relation);
    }
  }, [member]);

  const handleClose = () => {
    setVisible(false);
  };

  const handleUpdate = async () => {
    if (!member || !profile) {
      toast.error('Member information is missing');
      return;
    }

    // Don't allow editing self relation
    if (member.relation === 'Self') {
      toast.error('Cannot edit relation for yourself');
      return;
    }

    setUpdating(true);
    try {
      // Find the member in the profile.members array and update its relation
      const updatedMembers = profile.members.map((m: any) => {
        // Match by memberMetaId (the _id from members array) or by memberId
        const matchesById = member.memberMetaId && m._id?.toString() === member.memberMetaId?.toString();
        const matchesByMemberId = m.memberId?.toString() === member._id?.toString();
        
        if (matchesById || matchesByMemberId) {
          return {
            ...m,
            relation,
          };
        }
        return m;
      });

      // Update the profile with the new members array
      const response = await axios.put(
        updateProfile,
        { id: profile._id, members: updatedMembers }
      );

      if (response.data) {
        toast.success('Member relation updated successfully!');
        setVisible(false);
        refreshProfile();
        queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
        queryClient.invalidateQueries({ queryKey: ['getMembersById'] });
        if (onMemberUpdated) onMemberUpdated();
      } else {
        toast.error('Failed to update member relation');
      }
    } catch (error: any) {
      console.error('Error updating member:', error);
      toast.error(error?.response?.data?.error || 'Failed to update member relation');
    } finally {
      setUpdating(false);
    }
  };

  if (!visible || !member) return null;

  // Don't show edit modal for self
  if (member.relation === 'Self') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Edit Member Relation</h2>
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
              <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-2xl text-gray-600">
                  {member.firstName?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {member.firstName} {member.lastName}
                </h3>
                <p className="text-sm text-gray-600">{member.phoneNumber}</p>
              </div>
            </div>
          </div>

          {/* Relation Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relation to You <span className="text-red-500">*</span>
            </label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {RELATION_OPTIONS.filter(opt => opt.value !== 'Self').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {updating ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

