'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { getProfileByPhone, createProfile, addMember } from '@/components/common/lib/constants/urls';
import { useUpdateProfile } from '@/hooks/reactQuery/profile';
import toast from 'react-hot-toast';
import { canAddMember, getSubscriptionPlan, getEffectiveSubscription, getEffectiveMembersLimit } from '@/lib/utils/subscription';
import { useSetRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';

interface AddMemberModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  profile: any;
  onMemberAdded?: () => void;
  editingMember?: any; // Member to edit (if provided, modal is in edit mode)
  onMemberUpdated?: () => void; // Callback when member is updated
}

type Step = 'search' | 'found' | 'notFound' | 'relation';

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

export default function AddMemberModal({ visible, setVisible, profile, onMemberAdded, editingMember, onMemberUpdated }: AddMemberModalProps) {
  const isEditMode = !!editingMember;
  const [step, setStep] = useState<Step>(isEditMode ? 'notFound' : 'search');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundProfile, setFoundProfile] = useState<any>(null);
  const [relation, setRelation] = useState('Father');
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [showConditionsTooltip, setShowConditionsTooltip] = useState(false);
  const { refreshProfile, profile: authProfile } = useAuthContext();
  const queryClient = useQueryClient();
  const setDash = useSetRecoilState(dashTabs);

  // Form data for creating/editing profile
  const [formData, setFormData] = useState({
    relation: 'Father',
    profileImage: null as File | null,
    firstName: '',
    lastName: '',
    phoneNumber: '',
    countryCode: '+91',
    email: '',
    dob: '',
    gender: 'male',
    bloodGroup: 'A+',
    height: '',
    weight: '',
    majorHealthEvents: [] as string[],
    diagnosedConditions: [] as string[],
    foodAllergies: [] as string[],
    isPediatric: false,
  });

  // Helper function to calculate age from DOB
  const calculateAge = (dob: string): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    // Check if date is valid
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Auto-update isPediatric based on DOB (age < 2 years)
  // Always calculate from DOB - pediatric is auto-determined, not manually editable
  useEffect(() => {
    if (formData.dob) {
      const age = calculateAge(formData.dob);
      // Always auto-set pediatric based on age (< 2 years = pediatric)
      const isPediatric = age !== null && age < 2;
      setFormData(prev => ({ ...prev, isPediatric }));
    } else {
      // If no DOB, default to false
      setFormData(prev => ({ ...prev, isPediatric: false }));
    }
  }, [formData.dob]);

  // Pre-populate form when editing
  useEffect(() => {
    if (isEditMode && editingMember) {
      const dob = editingMember.dob ? new Date(editingMember.dob).toISOString().split('T')[0] : '';
      const phone = editingMember.phoneNumber || '';
      const countryCode = phone.startsWith('+91') ? '+91' : phone.startsWith('+1') ? '+1' : phone.startsWith('+44') ? '+44' : '+91';
      const phoneNumberOnly = phone.replace(/^\+\d{1,3}/, '');
      
      // Get latest BMI data
      const latestBMI = editingMember.bmi && editingMember.bmi.length > 0 
        ? editingMember.bmi[editingMember.bmi.length - 1] 
        : null;

      // Calculate isPediatric based on DOB (age < 2 years)
      // Always calculate from DOB to ensure accuracy, regardless of stored value
      let isPediatric = false;
      if (dob) {
        const age = calculateAge(dob);
        if (age !== null) {
          isPediatric = age < 2;
        }
      }
      // If DOB calculation fails, fall back to stored value
      if (!dob && editingMember.isPediatric) {
        isPediatric = editingMember.isPediatric;
      }

      setFormData({
        relation: editingMember.relation || 'Father',
        profileImage: null,
        firstName: editingMember.firstName || '',
        lastName: editingMember.lastName || '',
        phoneNumber: phoneNumberOnly,
        countryCode,
        email: editingMember.email || '',
        dob,
        gender: editingMember.gender || 'male',
        bloodGroup: editingMember.bloodGroup || 'A+',
        height: latestBMI?.height?.toString() || '',
        weight: latestBMI?.weight?.toString() || '',
        majorHealthEvents: editingMember.majorHealthEvents?.map((e: any) => typeof e === 'string' ? e : e.event) || [],
        diagnosedConditions: editingMember.diagnosedCondition?.map((c: any) => typeof c === 'string' ? c : c.condition) || [],
        foodAllergies: editingMember.foodAllergies?.map((a: any) => typeof a === 'string' ? a : a.foodItem) || [],
        isPediatric,
      });
      setRelation(editingMember.relation || 'Father');
      setShowMoreFields(true); // Show all fields in edit mode
    }
  }, [isEditMode, editingMember]);

  const [showMoreFields, setShowMoreFields] = useState(false);
  const [newHealthEvent, setNewHealthEvent] = useState('');
  const [newDiagnosedCondition, setNewDiagnosedCondition] = useState('');
  const [newFoodAllergy, setNewFoodAllergy] = useState('');

  // Calculate BMI
  const calculateBMI = () => {
    if (formData.height && formData.weight) {
      const heightInMeters = parseFloat(formData.height) / 100;
      const weightInKg = parseFloat(formData.weight);
      if (heightInMeters > 0 && weightInKg > 0) {
        const bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
        return bmi;
      }
    }
    return null;
  };

  const bmi = calculateBMI();

  const updateProfileMutation = useUpdateProfile(
    `/api/profile/updateProfile?id=${profile?._id}`,
    () => {
      // This callback is used when adding a found member
      toast.success('Member added successfully!');
      setVisible(false);
      resetModal();
      refreshProfile();
      if (onMemberAdded) onMemberAdded();
    },
    () => {
      toast.error('Failed to add member');
    },
    ['getProfileByPhoneNumber', 'getMembersById']
  );

  const resetModal = () => {
    if (!isEditMode) {
      setStep('search');
      setPhoneNumber('');
      setFoundProfile(null);
      setRelation('Father');
      setShowMoreFields(false);
      setNewHealthEvent('');
      setNewDiagnosedCondition('');
      setNewFoodAllergy('');
      setFormData({
        relation: 'Father',
        profileImage: null,
        firstName: '',
        lastName: '',
        phoneNumber: '',
        countryCode: '+91',
        email: '',
        dob: '',
        gender: 'male',
        bloodGroup: 'A+',
        height: '',
        weight: '',
        majorHealthEvents: [],
        diagnosedConditions: [],
        foodAllergies: [],
        isPediatric: false,
      });
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      resetModal();
    }, 300);
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Add + if not present
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  };

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    setSearching(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      // Check if trying to add own profile
      if (formattedPhone === profile?.phoneNumber) {
        toast.error('Cannot add your own profile as a member');
        setSearching(false);
        return;
      }

      // Check if member already exists
      const existingMember = profile?.members?.find(
        (m: any) => m.phoneNumber === formattedPhone
      );
      if (existingMember) {
        toast.error('This member is already added to your profile');
        setSearching(false);
        return;
      }

      const response = await axios.get(getProfileByPhone, {
        params: { phoneNumber: formattedPhone },
      });

      if (response.data && response.data._id) {
        setFoundProfile(response.data);
        setStep('found');
      } else {
        setStep('notFound');
      }
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 400) {
        setStep('notFound');
      } else {
        toast.error('Error searching for profile. Please try again.');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleAddFoundMember = async () => {
    if (!relation) {
      toast.error('Please select a relation');
      return;
    }

    // Check member limit (effective = own or inherited; inheritors get sublimits)
    const currentMembersCount = profile?.members?.length || 0;
    const subscription = getEffectiveSubscription(profile);
    const membersLimit = getEffectiveMembersLimit(profile);
    if (!canAddMember(currentMembersCount, membersLimit)) {
      const plan = getSubscriptionPlan(subscription);
      toast.error(
        `You've reached the member limit (${membersLimit}) for your ${plan.name} plan. Upgrade to add more members.`,
        { duration: 5000 }
      );
      // Optionally redirect to subscription page
      setTimeout(() => {
        setDash('Subscription');
      }, 2000);
      return;
    }

    try {
      // Add the found profile as a member to the current user's profile
      const response = await axios.post(addMember, {
        profileId: profile._id,
        memberId: foundProfile._id,
        relation,
        phoneNumber: foundProfile.phoneNumber,
        sharedWith: [],
      });

      if (response.data?.success) {
        // Success - refresh the profile data and invalidate queries
        toast.success('Member added successfully!');
        setVisible(false);
        resetModal();
        
        // Refresh profile and invalidate/refetch all related queries
        await refreshProfile();
        
        // Invalidate and refetch profile queries
        await queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
        await queryClient.invalidateQueries({ queryKey: ['getProfileByPhone'] });
        
        // Refetch profile queries to ensure fresh data
        await queryClient.refetchQueries({ queryKey: ['getProfileByPhone'] });
        
        // Invalidate and refetch members queries - use refetch to force immediate update
        await queryClient.invalidateQueries({ queryKey: ['getMembersById'] });
        await queryClient.refetchQueries({ queryKey: ['getMembersById'] });
        
        if (onMemberAdded) onMemberAdded();
      } else {
        toast.error('Failed to add member. Please try again.');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 'Failed to add member';
      if (errorMessage.includes('already exists')) {
        toast.error('This member is already in your profile');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, profileImage: e.target.files[0] });
    }
  };

  const addHealthEvent = () => {
    if (newHealthEvent.trim()) {
      setFormData({
        ...formData,
        majorHealthEvents: [...formData.majorHealthEvents, newHealthEvent.trim()],
      });
      setNewHealthEvent('');
    }
  };

  const removeHealthEvent = (index: number) => {
    setFormData({
      ...formData,
      majorHealthEvents: formData.majorHealthEvents.filter((_, i) => i !== index),
    });
  };

  const addDiagnosedCondition = () => {
    if (newDiagnosedCondition.trim()) {
      setFormData({
        ...formData,
        diagnosedConditions: [...formData.diagnosedConditions, newDiagnosedCondition.trim()],
      });
      setNewDiagnosedCondition('');
    }
  };

  const removeDiagnosedCondition = (index: number) => {
    setFormData({
      ...formData,
      diagnosedConditions: formData.diagnosedConditions.filter((_, i) => i !== index),
    });
  };

  const addFoodAllergy = () => {
    if (newFoodAllergy.trim()) {
      setFormData({
        ...formData,
        foodAllergies: [...formData.foodAllergies, newFoodAllergy.trim()],
      });
      setNewFoodAllergy('');
    }
  };

  const removeFoodAllergy = (index: number) => {
    setFormData({
      ...formData,
      foodAllergies: formData.foodAllergies.filter((_, i) => i !== index),
    });
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.phoneNumber || !formData.email || !formData.dob || !formData.relation) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!editingMember || !profile) {
      toast.error('Member information is missing');
      return;
    }

    setUpdatingProfile(true);
    try {
      const formattedPhone = formData.countryCode + formData.phoneNumber.replace(/\D/g, '');
      
      // Prepare profile update data
      const profileUpdateData: any = {
        phoneNumber: formattedPhone,
        firstName: formData.firstName,
        lastName: formData.lastName || '',
        email: formData.email.toLowerCase().trim(),
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        dob: new Date(formData.dob),
        isPediatric: formData.isPediatric,
      };

      // Update BMI if height/weight provided
      if (formData.height && editingMember.bmi && editingMember.bmi.length > 0) {
        const latestBMI = editingMember.bmi[editingMember.bmi.length - 1];
        latestBMI.height = parseFloat(formData.height);
        latestBMI.weight = formData.weight ? parseFloat(formData.weight) : latestBMI.weight;
        latestBMI.bmi = bmi ? parseFloat(bmi) : latestBMI.bmi;
        profileUpdateData.bmi = editingMember.bmi;
      } else if (formData.height) {
        profileUpdateData.bmi = [{
          height: parseFloat(formData.height),
          weight: formData.weight ? parseFloat(formData.weight) : 0,
          bmi: bmi ? parseFloat(bmi) : null,
          updatedDate: new Date(),
        }];
      }

      // Update diagnosed conditions
      if (formData.diagnosedConditions.length > 0) {
        profileUpdateData.diagnosedCondition = formData.diagnosedConditions.map((condition) => ({
          condition,
          date: new Date(),
        }));
      } else {
        profileUpdateData.diagnosedCondition = [];
      }

      // Update food allergies
      if (formData.foodAllergies.length > 0) {
        profileUpdateData.foodAllergies = formData.foodAllergies.map((foodItem) => ({
          foodItem,
          updatedDate: new Date(),
        }));
      } else {
        profileUpdateData.foodAllergies = [];
      }

      // Update major health events if they exist
      if (formData.majorHealthEvents.length > 0) {
        profileUpdateData.majorHealthEvents = formData.majorHealthEvents.map((event) => ({
          event,
          date: new Date(),
        }));
      }

      // Step 1: Update the member's profile
      const updateResponse = await axios.put(`/api/profile/updateProfile`, {
        id: editingMember._id,
        ...profileUpdateData,
      });

      if (!updateResponse.data) {
        toast.error('Failed to update profile. Please try again.');
        return;
      }

      // Step 2: Update the relation in the members array (only if not self)
      if (editingMember.relation !== 'Self') {
        const updatedMembers = profile.members.map((m: any) => {
          const matchesById = editingMember.memberMetaId && m._id?.toString() === editingMember.memberMetaId?.toString();
          const matchesByMemberId = m.memberId?.toString() === editingMember._id?.toString();
          
          if (matchesById || matchesByMemberId) {
            return {
              ...m,
              relation: formData.relation,
              phoneNumber: formattedPhone,
            };
          }
          return m;
        });

        const memberUpdateResponse = await axios.put('/api/profile/updateProfile', {
          id: profile._id,
          members: updatedMembers,
        });

        if (!memberUpdateResponse.data) {
          toast.error('Profile updated but failed to update member relation.');
          return;
        }
      }

      toast.success('Member updated successfully!');
      setVisible(false);
      resetModal();
      
      // Refresh profile and invalidate/refetch all related queries
      await refreshProfile();
      
      // Invalidate and refetch profile queries
      await queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
      await queryClient.invalidateQueries({ queryKey: ['getProfileByPhone'] });
      await queryClient.invalidateQueries({ queryKey: ['getProfileById', editingMember._id] });
      
      // Refetch profile queries to ensure fresh data
      await queryClient.refetchQueries({ queryKey: ['getProfileByPhone'] });
      await queryClient.refetchQueries({ queryKey: ['getProfileById', editingMember._id] });
      
      // Invalidate and refetch members queries - use refetch to force immediate update
      await queryClient.invalidateQueries({ queryKey: ['getMembersById'] });
      await queryClient.refetchQueries({ queryKey: ['getMembersById'] });
      
      if (onMemberUpdated) onMemberUpdated();
    } catch (error: any) {
      console.error('Error updating member:', error);
      toast.error(error?.response?.data?.error || 'Failed to update member. Please try again.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.phoneNumber || !formData.email || !formData.dob || !formData.relation) {
      toast.error('Please fill all required fields');
      return;
    }

    // Check member limit (effective = own or inherited; inheritors get sublimits)
    const currentMembersCount = profile?.members?.length || 0;
    const subscription = getEffectiveSubscription(profile);
    const membersLimit = getEffectiveMembersLimit(profile);
    if (!canAddMember(currentMembersCount, membersLimit)) {
      const plan = getSubscriptionPlan(subscription);
      toast.error(
        `You've reached the member limit (${membersLimit}) for your ${plan.name} plan. Upgrade to add more members.`,
        { duration: 5000 }
      );
      // Optionally redirect to subscription page
      setTimeout(() => {
        setDash('Subscription');
      }, 2000);
      setCreatingProfile(false);
      return;
    }

    setCreatingProfile(true);
    try {
      const formattedPhone = formData.countryCode + formData.phoneNumber.replace(/\D/g, '');
      
      // Prepare profile data
      const profileData: any = {
        phoneNumber: formattedPhone,
        firstName: formData.firstName,
        lastName: formData.lastName || '',
        email: formData.email.toLowerCase().trim(),
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        dob: new Date(formData.dob),
        isPediatric: formData.isPediatric,
      };

      // Add optional fields if provided
      if (formData.height) {
        profileData.bmi = [{
          height: parseFloat(formData.height),
          weight: formData.weight ? parseFloat(formData.weight) : 0,
          bmi: bmi ? parseFloat(bmi) : null,
          updatedDate: new Date(),
        }];
      }

      if (formData.diagnosedConditions.length > 0) {
        profileData.diagnosedCondition = formData.diagnosedConditions.map((condition) => ({
          condition,
          date: new Date(),
        }));
      }

      if (formData.foodAllergies.length > 0) {
        profileData.foodAllergies = formData.foodAllergies.map((foodItem) => ({
          foodItem,
          updatedDate: new Date(),
        }));
      }

      if (formData.majorHealthEvents.length > 0) {
        profileData.majorHealthEvents = formData.majorHealthEvents.map((event) => ({
          event,
          date: new Date(),
        }));
      }

      // Step 1: Create new profile
      const createResponse = await axios.post(createProfile, profileData);

      // Step 2: Get the created profile's ID
      const newProfileId = createResponse.data?._id;
      
      if (!newProfileId) {
        toast.error('Failed to create profile. Please try again.');
        return;
      }

      // Step 3: Add the new profile as a member to the current user's profile
      const addResponse = await axios.post(addMember, {
        profileId: profile._id,
        memberId: newProfileId,
        relation: formData.relation,
        phoneNumber: formattedPhone,
        sharedWith: [],
      });

      if (addResponse.data?.success) {
        // Success - the member has been added to the current user's profile
        toast.success('Profile created and added as member successfully!');
        setVisible(false);
        resetModal();
        
        // Refresh profile and invalidate/refetch all related queries
        await refreshProfile();
        
        // Invalidate and refetch profile queries
        await queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] });
        await queryClient.invalidateQueries({ queryKey: ['getProfileByPhone'] });
        
        // Refetch profile queries to ensure fresh data
        await queryClient.refetchQueries({ queryKey: ['getProfileByPhone'] });
        
        // Invalidate and refetch members queries - use refetch to force immediate update
        await queryClient.invalidateQueries({ queryKey: ['getMembersById'] });
        await queryClient.refetchQueries({ queryKey: ['getMembersById'] });
        
        if (onMemberAdded) onMemberAdded();
      } else {
        toast.error('Profile created but failed to add as member. Please try again.');
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error || '';
        if (errorMessage.includes('already exists') || errorMessage.includes('Profile already exists')) {
          toast.error('A profile with this phone number or email already exists');
        } else if (errorMessage.includes('Member already exists')) {
          toast.error('This member is already in your profile');
        } else {
          toast.error(errorMessage);
        }
      } else {
        toast.error(error?.response?.data?.error || 'Failed to create profile. Please try again.');
      }
    } finally {
      setCreatingProfile(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Member' : (
              step === 'search' ? 'Add Member' :
              step === 'found' ? 'Confirm Member Details' :
              'Add Profile'
            )}
          </h2>
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
        <div className="px-6 py-6">
          {/* Step 1: Search by Phone (only show in add mode) */}
          {step === 'search' && !isEditMode && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-600 mb-4">
                  Search for a member by their phone number. If they have an Omerald account, we'll fetch their profile details.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
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
            </div>
          )}

          {/* Step 2a: Profile Found (only show in add mode) */}
          {step === 'found' && foundProfile && !isEditMode && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Profile found!</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-2xl text-gray-600">
                      {foundProfile.firstName?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {foundProfile.firstName} {foundProfile.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{foundProfile.phoneNumber}</p>
                    <p className="text-sm text-gray-600">{foundProfile.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                  <div>
                    <span className="text-xs text-gray-500">Date of Birth</span>
                    <p className="text-sm font-medium text-gray-900">
                      {foundProfile.dob ? new Date(foundProfile.dob).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Gender</span>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {foundProfile.gender || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Blood Group</span>
                    <p className="text-sm font-medium text-gray-900">
                      {foundProfile.bloodGroup || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relation to You <span className="text-red-500">*</span>
                </label>
                <select
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {RELATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep('search')}
                  className="flex-1 px-4 py-3.5 sm:py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base tap-target"
                >
                  Back
                </button>
                <button
                  onClick={handleAddFoundMember}
                  disabled={updateProfileMutation.isPending}
                  className="flex-1 px-4 py-3.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base tap-target"
                >
                  {updateProfileMutation.isPending ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2b: Profile Not Found - Create Form / Edit Form */}
          {step === 'notFound' && (
            <form onSubmit={isEditMode ? handleUpdateMember : handleCreateAndAdd} className="space-y-4 sm:space-y-6">
              {!isEditMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Profile not found. Please create a new profile.</span>
                  </div>
                </div>
              )}
              {isEditMode && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="font-medium">Edit member profile information. All fields can be updated.</span>
                  </div>
                </div>
              )}

              {/* Relation */}
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Select Relation <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.relation}
                  onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                  disabled={isEditMode && editingMember?.relation === 'Self'}
                  className="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed tap-target"
                  required
                >
                  <option value="">Select Relation</option>
                  {RELATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {isEditMode && editingMember?.relation === 'Self' && (
                  <p className="text-xs text-gray-500 mt-1">Relation cannot be changed for self profile</p>
                )}
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="profile-image-upload"
                  />
                  <label
                    htmlFor="profile-image-upload"
                    className="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm"
                  >
                    Choose file
                  </label>
                  <span className="text-sm text-gray-500">
                    {formData.profileImage ? formData.profileImage.name : 'No file chosen'}
                  </span>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input
                    type="text"
                    required
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="flex-1 px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tap-target"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="flex-1 px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tap-target"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <select
                    value={formData.countryCode}
                    onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                    className="px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tap-target"
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                  </select>
                  <input
                    type="tel"
                    required
                    placeholder="Mobile Number"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="flex-1 px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tap-target"
                  />
                </div>
              </div>

              {/* DOB and Gender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    DOB <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => {
                      const newDob = e.target.value;
                      // Always auto-calculate isPediatric from DOB (age < 2 years)
                      // Pediatric status is auto-determined, not manually editable
                      let newIsPediatric = false;
                      if (newDob) {
                        const age = calculateAge(newDob);
                        // Auto-calculate: pediatric if age < 2 years
                        newIsPediatric = age !== null && age < 2;
                      }
                      // Update both dob and isPediatric in one call
                      setFormData({ ...formData, dob: newDob, isPediatric: newIsPediatric });
                    }}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tap-target"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tap-target"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Blood Group <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tap-target"
                  required
                >
                  <option value="">Select Blood Group</option>
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

              {/* Email */}
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tap-target"
                />
              </div>

              {/* Is Pediatric - Auto-calculated from DOB, always disabled */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                {(() => {
                  const age = formData.dob ? calculateAge(formData.dob) : null;
                  // Always calculate from DOB - pediatric is auto-determined based on age < 2 years
                  const isPediatric = age !== null && age < 2;
                  
                  return (
                    <label className="flex items-center gap-3 cursor-not-allowed opacity-75">
                      <input
                        type="checkbox"
                        checked={isPediatric}
                        onChange={() => {}} // Disabled - no manual changes allowed
                        disabled={true}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div>
                        <span className="text-base font-semibold text-gray-900">Pediatric Patient</span>
                        <p className="text-sm text-gray-600 mt-1">
                          {isPediatric ? (
                            <>
                              Automatically enabled for patients under 2 years of age. This provides access to pediatric-specific features: MUAC, Anthropometric, Immunization Schedule, and IAP Growth Charts.
                              {age !== null && (
                                <span className="block mt-1 text-blue-700 font-medium">
                                  Current age: {age} {age === 1 ? 'year' : 'years'} (Auto-detected)
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              This option is automatically determined based on the patient's date of birth. Patients under 2 years of age will have pediatric features enabled.
                              {age !== null && (
                                <span className="block mt-1 text-gray-600">
                                  Current age: {age} {age === 1 ? 'year' : 'years'} (Not pediatric)
                                </span>
                              )}
                              {!formData.dob && (
                                <span className="block mt-1 text-amber-600 font-medium">
                                  Please enter date of birth to determine pediatric status
                                </span>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                    </label>
                  );
                })()}
              </div>

              {/* Height, Weight, BMI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    placeholder="Height (cm)"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tap-target"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    placeholder="Weight (kg)"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tap-target"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    BMI
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-600 tap-target">
                      {bmi ? bmi : '---'}
                    </div>
                    <button
                      type="button"
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="BMI Information"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* More Fields Toggle */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowMoreFields(!showMoreFields)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {showMoreFields ? 'Show Less' : '+ More'}
                </button>
              </div>

              {/* More Fields Section */}
              {showMoreFields && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  {/* Major Health Events */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Major Health Events
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Select Health Event"
                        value={newHealthEvent}
                        onChange={(e) => setNewHealthEvent(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addHealthEvent();
                          }
                        }}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={addHealthEvent}
                        className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {formData.majorHealthEvents.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.majorHealthEvents.map((event, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {event}
                            <button
                              type="button"
                              onClick={() => removeHealthEvent(index)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Diagnosed Conditions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Diagnosed Conditions
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Select Health Event"
                        value={newDiagnosedCondition}
                        onChange={(e) => setNewDiagnosedCondition(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addDiagnosedCondition();
                          }
                        }}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={addDiagnosedCondition}
                        className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {formData.diagnosedConditions.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center">
                        {formData.diagnosedConditions.slice(0, 10).map((condition, index) => {
                          // Handle both string and object formats
                          const conditionText = typeof condition === 'string' 
                            ? condition 
                            : ((condition as any)?.condition || String(condition));
                          return (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                            >
                              {conditionText}
                              <button
                                type="button"
                                onClick={() => removeDiagnosedCondition(index)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                        {formData.diagnosedConditions.length > 10 && (
                          <div className="relative">
                            <span 
                              className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                              onMouseEnter={() => setShowConditionsTooltip(true)}
                              onMouseLeave={() => setShowConditionsTooltip(false)}
                            >
                              +{formData.diagnosedConditions.length - 10} more...
                            </span>
                            {showConditionsTooltip && (
                              <div 
                                className="absolute z-50 mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 max-w-xs max-h-64 overflow-y-auto"
                                style={{ minWidth: '200px' }}
                                onMouseEnter={() => setShowConditionsTooltip(true)}
                                onMouseLeave={() => setShowConditionsTooltip(false)}
                              >
                                <p className="text-xs font-semibold text-gray-700 mb-2">All Diagnosed Conditions ({formData.diagnosedConditions.length}):</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {formData.diagnosedConditions.map((condition, idx) => {
                                    const conditionText = typeof condition === 'string' 
                                      ? condition 
                                      : ((condition as any)?.condition || String(condition));
                                    return (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
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
                      </div>
                    )}
                  </div>

                  {/* Known Food Allergies */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Known Food Allergies
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={newFoodAllergy}
                        onChange={(e) => setNewFoodAllergy(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addFoodAllergy();
                          }
                        }}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={addFoodAllergy}
                        className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {formData.foodAllergies.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.foodAllergies.map((allergy, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                          >
                            {allergy}
                            <button
                              type="button"
                              onClick={() => removeFoodAllergy(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={() => setStep('search')}
                    className="flex-1 px-4 py-3.5 sm:py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base tap-target"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isEditMode ? updatingProfile : creatingProfile}
                  className={`${isEditMode ? 'w-full' : 'flex-1'} px-4 py-3.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base tap-target`}
                >
                  {isEditMode 
                    ? (updatingProfile ? 'Updating...' : 'Update Member')
                    : (creatingProfile ? 'Creating...' : 'Submit')
                  }
                </button>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-3.5 sm:py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base tap-target"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

