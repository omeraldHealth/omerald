'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import toast from 'react-hot-toast';
import { updateReport } from '@/components/common/lib/constants/urls';
import { useQueryClient } from '@tanstack/react-query';

interface EditReportModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  report: any;
  onReportUpdated?: () => void;
}

export default function EditReportModal({
  visible,
  setVisible,
  report,
  onReportUpdated,
}: EditReportModalProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    reportDate: '',
    reportTime: '',
    description: '',
    remarks: '',
  });

  useEffect(() => {
    if (visible && report) {
      const reportDate = report.reportDate ? new Date(report.reportDate).toISOString().split('T')[0] : '';
      const reportTime = report.reportDate ? new Date(report.reportDate).toTimeString().split(' ')[0].slice(0, 5) : '';
      
      setFormData({
        name: report.name || report.testName || '',
        type: report.type || report.documentType || '',
        reportDate: reportDate,
        reportTime: reportTime,
        description: report.description || '',
        remarks: report.remarks || '',
      });
    }
  }, [visible, report]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.reportDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Combine date and time
      const reportDateTime = new Date(`${formData.reportDate}T${formData.reportTime || '00:00'}`);

      const updateData = {
        id: report._id,
        name: formData.name,
        testName: formData.name,
        type: formData.type,
        documentType: formData.type,
        reportDate: reportDateTime,
        description: formData.description || '',
        remarks: formData.remarks || '',
      };

      const response = await axios.put(updateReport, updateData);

      if (response.data) {
        toast.success('Report updated successfully!');
        queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
        handleClose();
        if (onReportUpdated) onReportUpdated();
      } else {
        toast.error('Failed to update report');
      }
    } catch (error: any) {
      console.error('Error updating report:', error);
      toast.error(error?.response?.data?.error?.message || 'Failed to update report');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      type: '',
      reportDate: '',
      reportTime: '',
      description: '',
      remarks: '',
    });
    setVisible(false);
  };

  if (!visible || !report) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">Edit Report</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Report Name"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="Report Type"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Date & Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Date & Time <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={formData.reportDate}
                  onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="time"
                  value={formData.reportTime}
                  onChange={(e) => setFormData({ ...formData, reportTime: e.target.value })}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Enter report description..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
                placeholder="Write remarks here..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}






