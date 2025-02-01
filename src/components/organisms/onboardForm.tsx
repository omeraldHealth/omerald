'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import axios from 'axios';
import { createProfile } from '@/components/common/lib/constants/urls';
import toast from 'react-hot-toast';

export function OnboardForm() {
  const router = useRouter();
  const { phoneNumber, refreshProfile, user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  
  // Extract firstName and lastName from Clerk user
  const getClerkName = React.useCallback(() => {
    if (!user) return { firstName: '', lastName: '' };
    
    // Try to get from firstName and lastName properties directly
    let firstName = user.firstName || '';
    let lastName = user.lastName || '';
    
    // If not available, try parsing from fullName
    if (!firstName && !lastName && user.fullName) {
      const nameParts = user.fullName.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      } else if (nameParts.length === 1) {
        firstName = nameParts[0] || '';
      }
    }
    
    return { firstName, lastName };
  }, [user]);
  
  const clerkName = getClerkName();
  const hasClerkName = !!(clerkName.firstName || clerkName.lastName);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gender: 'male',
    bloodGroup: 'A+',
    dob: '',
  });
  
  // Auto-populate form data from Clerk user when available
  useEffect(() => {
    if (user) {
      const name = getClerkName();
      const email = user.primaryEmailAddress?.emailAddress || '';
      
      setFormData(prev => ({
        ...prev,
        firstName: name.firstName || prev.firstName,
        lastName: name.lastName || prev.lastName,
        email: email || prev.email,
      }));
    }
  }, [user, getClerkName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(createProfile, {
        ...formData,
        phoneNumber,
        dob: new Date(formData.dob),
      });
      toast.success('Profile created successfully!');
      await refreshProfile();
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name
            {hasClerkName && formData.firstName && (
              <span className="ml-2 text-xs text-gray-500">(from Clerk)</span>
            )}
          </label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) =>
              setFormData({ ...formData, firstName: e.target.value })
            }
            readOnly={hasClerkName && !!formData.firstName}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
              hasClerkName && formData.firstName
                ? 'bg-gray-100 cursor-not-allowed'
                : 'bg-white'
            }`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name
            {hasClerkName && formData.lastName && (
              <span className="ml-2 text-xs text-gray-500">(from Clerk)</span>
            )}
          </label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) =>
              setFormData({ ...formData, lastName: e.target.value })
            }
            readOnly={hasClerkName && !!formData.lastName}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
              hasClerkName && formData.lastName
                ? 'bg-gray-100 cursor-not-allowed'
                : 'bg-white'
            }`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Birth
          </label>
          <input
            type="date"
            required
            value={formData.dob}
            onChange={(e) =>
              setFormData({ ...formData, dob: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gender
          </label>
          <select
            value={formData.gender}
            onChange={(e) =>
              setFormData({ ...formData, gender: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Blood Group
          </label>
          <select
            value={formData.bloodGroup}
            onChange={(e) =>
              setFormData({ ...formData, bloodGroup: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
        </div>
      </div>
      <div className="mt-8">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-orange-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Profile...' : 'Complete Profile'}
        </button>
      </div>
    </form>
  );
}

