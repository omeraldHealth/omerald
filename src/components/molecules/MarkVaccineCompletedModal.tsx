'use client';

import React, { useState } from 'react';
import { XMarkIcon, CalendarIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import toast from 'react-hot-toast';
import { markVaccineCompleted } from '@/components/common/lib/constants/urls';
import { useQueryClient } from '@tanstack/react-query';

interface MarkVaccineCompletedModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  dose: {
    _id?: string;
    id?: string;
    name: string;
    vaccine: string | { _id: string; id: string; name: string };
    duration?: string | number;
    doseType?: string;
  };
  vaccine: {
    _id?: string;
    id?: string;
    name: string;
  };
  profileId: string;
  onVaccineCompleted?: (completionData?: any) => void | Promise<void>;
}

export default function MarkVaccineCompletedModal({
  visible,
  setVisible,
  dose,
  vaccine,
  profileId,
  onVaccineCompleted,
}: MarkVaccineCompletedModalProps) {
  const [dateAdministered, setDateAdministered] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const vaccineName = typeof vaccine?.name === 'string' ? vaccine.name : vaccine?.name || '';
  const vaccineId = vaccine?._id || vaccine?.id || '';
  const doseName = dose?.name || '';
  // Normalize dose ID to ensure consistency
  const doseId = (dose?._id || dose?.id || '').toString();
  
  // Extract duration
  let duration = '';
  if (dose?.duration) {
    duration = dose.duration.toString();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dateAdministered) {
      toast.error('Please select a date');
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MarkVaccineCompletedModal.tsx:65',message:'Submitting vaccine completion',data:{profileId,doseId,doseName,vaccineId,vaccineName,dateAdministered},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    setIsSubmitting(true);
    try {
      const response = await axios.post(markVaccineCompleted, {
        profileId,
        doseId,
        doseName,
        vaccineId,
        vaccineName,
        duration,
        dateAdministered: new Date(dateAdministered).toISOString(),
        remark: remark.trim(),
      });

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/2fbc7e35-288c-4e48-8204-8ecc0d034a57',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MarkVaccineCompletedModal.tsx:85',message:'API response received',data:{status:response.status,vaccineCompletionsKeys:response.data?.vaccineCompletions?Object.keys(response.data.vaccineCompletions):[],hasDoseId:response.data?.vaccineCompletions?response.data.vaccineCompletions[doseId]!=null:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      toast.success('Vaccine marked as completed successfully!');
      
      // Prepare completion data to pass to callback for immediate UI update
      const completionData = {
        doseId,
        doseName,
        vaccineId,
        vaccineName,
        duration,
        dateAdministered: new Date(dateAdministered).toISOString(),
        remark: remark.trim(),
        completedAt: new Date().toISOString(),
      };
      
      // Call the callback with the new completion data to update UI immediately
      if (onVaccineCompleted) {
        await onVaccineCompleted(completionData);
      }
      
      // Also invalidate queries to ensure data is fresh
      queryClient.invalidateQueries({ queryKey: ['getProfileById', profileId] });
      queryClient.invalidateQueries({ queryKey: ['getProfileByPhone'] });
      
      // Reset form and close modal
      setRemark('');
      setDateAdministered(new Date().toISOString().split('T')[0]);
      setVisible(false);
    } catch (error: any) {
      console.error('Error marking vaccine as completed:', error);
      toast.error(error?.response?.data?.error || 'Failed to mark vaccine as completed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setRemark('');
    setDateAdministered(new Date().toISOString().split('T')[0]);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Mark Vaccine as Completed</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Vaccine Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vaccine</label>
              <p className="text-base font-semibold text-gray-900">{vaccineName}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dose</label>
              <p className="text-base font-semibold text-gray-900">{doseName}</p>
            </div>

            {duration && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <p className="text-base font-semibold text-gray-900">{duration}</p>
              </div>
            )}
          </div>

          {/* Date Administered */}
          <div>
            <label htmlFor="dateAdministered" className="block text-sm font-medium text-gray-700 mb-2">
              Date Administered
            </label>
            <div className="relative">
              <input
                type="date"
                id="dateAdministered"
                value={dateAdministered}
                onChange={(e) => setDateAdministered(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
              <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Remark */}
          <div>
            <label htmlFor="remark" className="block text-sm font-medium text-gray-700 mb-2">
              Remark (Optional)
            </label>
            <textarea
              id="remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Enter any remarks..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Mark as Completed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

