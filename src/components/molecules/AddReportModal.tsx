'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, DocumentIcon, TrashIcon, MagnifyingGlassPlusIcon, CameraIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import toast from 'react-hot-toast';
import { insertReport, uploadReportToS3 } from '@/components/common/lib/constants/urls';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { useQueryClient } from '@tanstack/react-query';
import CameraCapture from './CameraCapture';
import { convertImagesToPdf, mergeFilesToPdf, isCameraSupported } from '@/lib/utils/imageToPdf';
import { canAddReport, getReportsLimit, getSubscriptionPlan } from '@/lib/utils/subscription';
import { useGetManyReports } from '@/hooks/reactQuery/reports';
import { useGetReportTypesFromAdmin, useGetLegacyHealthTopics } from '@/hooks/reactQuery';
import { useSetRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';

interface AddReportModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  onReportAdded?: () => void;
  memberPhoneNumber?: string;
  memberName?: string;
}

export default function AddReportModal({
  visible,
  setVisible,
  onReportAdded,
  memberPhoneNumber,
  memberName,
}: AddReportModalProps) {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();
  const setDash = useSetRecoilState(dashTabs);
  
  // Get all users (profile + members) to count reports
  const users: string[] = [];
  if (profile?.phoneNumber) {
    users.push(profile.phoneNumber);
  }
  profile?.members?.forEach((member: any) => {
    if (member.phoneNumber) {
      users.push(member.phoneNumber);
    }
  });
  const { data: allReports = [] } = useGetManyReports(users.length > 0 ? users : undefined);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Use React Query hooks for report types and health topics with automatic caching
  const { data: reportTypesData = [] } = useGetReportTypesFromAdmin();
  const { data: healthTopicsData = [] } = useGetLegacyHealthTopics();
  const reportTypes = Array.isArray(reportTypesData) ? reportTypesData : [];
  const allHealthTopics = Array.isArray(healthTopicsData) ? healthTopicsData : [];
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [selectedHealthTopics, setSelectedHealthTopics] = useState<string[]>([]);
  const [searchReportType, setSearchReportType] = useState('');
  const [searchHealthTopic, setSearchHealthTopic] = useState('');
  const [showReportTypeDropdown, setShowReportTypeDropdown] = useState(false);
  const [showHealthTopicDropdown, setShowHealthTopicDropdown] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    reportType: '',
    reportDate: '',
    reportTime: '',
    description: '',
    remarks: '',
  });

  useEffect(() => {
    if (visible) {
      // Report types and health topics are now fetched via React Query hooks
      // Set default date/time to now
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);
      setFormData(prev => ({
        ...prev,
        reportDate: dateStr,
        reportTime: timeStr,
      }));
    }
  }, [visible]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowReportTypeDropdown(false);
        setShowHealthTopicDropdown(false);
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [visible]);

  // Report types and health topics are now fetched via React Query hooks above

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      return validTypes.includes(file.type);
    });

    if (validFiles.length !== files.length) {
      toast.error('Some files were skipped. Only PDF and image files are allowed.');
    }

    if (validFiles.length === 0) return;

    // If multiple files selected, give option to merge or upload separately
    // For now, upload separately for faster performance (merge can be done server-side if needed)
    // Or merge asynchronously without blocking
    if (validFiles.length > 1) {
      // Option 1: Upload separately (faster) - just add all files
      setSelectedFiles(prev => [...prev, ...validFiles]);
      
      // Option 2: Merge into PDF (slower but single file) - uncomment if needed
      // setProcessingImages(true);
      // toast.loading(`Processing ${validFiles.length} file(s) and merging into PDF...`, { id: 'file-processing' });
      // 
      // try {
      //   // Merge all files (images and PDFs) into a single PDF
      //   const pdfBlob = await mergeFilesToPdf(validFiles);
      //   const pdfFile = new File(
      //     [pdfBlob],
      //     `merged-report-${Date.now()}.pdf`,
      //     { type: 'application/pdf', lastModified: Date.now() }
      //   );
      //   setSelectedFiles(prev => [...prev, pdfFile]);
      //   toast.success(`Successfully merged ${validFiles.length} file(s) into a single PDF`, { id: 'file-processing' });
      // } catch (error: any) {
      //   console.error('Error processing files:', error);
      //   toast.error(error?.message || 'Failed to process files. Please try again.', { id: 'file-processing' });
      // } finally {
      //   setProcessingImages(false);
      // }
      
      toast.success(`Added ${validFiles.length} file(s) for upload`, { id: 'file-processing' });
      // Reset file input
      e.target.value = '';
    } else {
      // Single file - add as-is
      setSelectedFiles(prev => [...prev, ...validFiles]);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFileUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleCameraCapture = async (capturedFiles: File[]) => {
    if (capturedFiles.length === 0) {
      setShowCamera(false);
      return;
    }

    setProcessingImages(true);
    setShowCamera(false);

    try {
      // Always merge camera captures into a single PDF for easy report creation
      toast.loading(`Processing ${capturedFiles.length} photo(s) and creating PDF...`, { id: 'camera-pdf-conversion' });
      
      const pdfBlob = await convertImagesToPdf(capturedFiles);
      const pdfFile = new File(
        [pdfBlob],
        `camera-report-${Date.now()}.pdf`,
        { type: 'application/pdf', lastModified: Date.now() }
      );
      
      // Add the merged PDF to selected files
      setSelectedFiles(prev => [...prev, pdfFile]);
      toast.success(
        `${capturedFiles.length} photo(s) merged into PDF report`,
        { id: 'camera-pdf-conversion', duration: 3000 }
      );
    } catch (error: any) {
      console.error('Error processing camera images:', error);
      toast.error(
        error?.message || 'Failed to process photos. Please try again.',
        { id: 'camera-pdf-conversion' }
      );
    } finally {
      setProcessingImages(false);
    }
  };

  const filteredReportTypes = reportTypes.filter((type: any) => {
    // API returns testName and sampleName fields
    const name = (type.testName || type.name || type.type || type.title || '').toLowerCase();
    const sampleName = (type.sampleName || '').toLowerCase();
    const searchTerm = searchReportType.toLowerCase();
    return name.includes(searchTerm) || sampleName.includes(searchTerm);
  });

  const filteredHealthTopics = allHealthTopics.filter((topic: any) => {
    const title = (topic.title || topic.name || '').toLowerCase();
    return title.includes(searchHealthTopic.toLowerCase()) && 
           !selectedHealthTopics.includes(topic.title || topic.name);
  });

  const handleSelectReportType = (type: any) => {
    // API returns testName field
    const typeName = type.testName || type.name || type.type || type.title || '';
    setFormData(prev => ({ ...prev, reportType: typeName }));
    setSearchReportType(typeName);
    setShowReportTypeDropdown(false);
  };

  const handleReportTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchReportType(value);
    setFormData(prev => ({ ...prev, reportType: value }));
    // Show dropdown if there are suggestions and user is typing
    if (value && filteredReportTypes.length > 0) {
      setShowReportTypeDropdown(true);
    } else {
      setShowReportTypeDropdown(false);
    }
  };

  const handleSelectHealthTopic = (topic: any) => {
    const topicName = topic.title || topic.name || '';
    if (topicName && !selectedHealthTopics.includes(topicName)) {
      setSelectedHealthTopics(prev => [...prev, topicName]);
      setSearchHealthTopic('');
      setShowHealthTopicDropdown(false);
    }
  };

  const handleRemoveHealthTopic = (topic: string) => {
    setSelectedHealthTopics(prev => prev.filter(t => t !== topic));
  };

  const uploadFilesToS3 = async (files: File[], userId: string): Promise<string[]> => {
    if (files.length === 0) {
      return [];
    }

    // Show upload progress
    const totalFiles = files.length;
    let uploadedCount = 0;

    // Track upload progress across all files
    const uploadProgress = Array(files.length).fill(0);
    let overallProgress = 0;

    const uploadPromises = files.map(async (file, index) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      try {
        const response = await axios.post(uploadReportToS3, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 300000, // 5 minutes timeout for large files
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const fileProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              uploadProgress[index] = fileProgress;
              
              // Calculate overall progress
              overallProgress = Math.round(
                uploadProgress.reduce((sum, p) => sum + p, 0) / totalFiles
              );

              // Update toast with progress
              toast.loading(`Uploading ${index + 1}/${totalFiles}: ${fileProgress}% (Overall: ${overallProgress}%)`, {
                id: 'file-upload',
              });
            }
          },
        });

        uploadedCount++;
        uploadProgress[index] = 100;
        
        // Update overall progress
        overallProgress = Math.round(
          uploadProgress.reduce((sum, p) => sum + p, 0) / totalFiles
        );

        return response.data.url || response.data.directUrl;
      } catch (error: any) {
        console.error(`Error uploading file ${file.name}:`, error);
        uploadProgress[index] = 0;
        throw error;
      }
    });

    const urls = await Promise.all(uploadPromises);
    toast.success(`Successfully uploaded ${totalFiles} file(s)`, { id: 'file-upload' });
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.reportDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error('Please upload at least one report file');
      return;
    }

    // Check report limit
    const currentReportsCount = Array.isArray(allReports) ? allReports.length : 0;
    const subscription = profile?.subscription || 'Free';
    
    if (!canAddReport(currentReportsCount, subscription)) {
      const limit = getReportsLimit(subscription);
      const plan = getSubscriptionPlan(subscription);
      toast.error(
        `You've reached the report limit (${limit}) for your ${plan.name} plan. Upgrade to upload more reports.`,
        { duration: 5000 }
      );
      // Optionally redirect to subscription page
      setTimeout(() => {
        setDash('Subscription');
      }, 2000);
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      const userId = memberPhoneNumber || profile?.phoneNumber;
      const userName = memberName || `${profile?.firstName} ${profile?.lastName}`;

      // Upload files to S3
      const uploadedUrls = await uploadFilesToS3(selectedFiles, userId || '');
      
      // Combine date and time
      const reportDateTime = new Date(`${formData.reportDate}T${formData.reportTime || '00:00'}`);

      // Create report - map all form data to report schema
      const reportData = {
        userId: userId,
        userName: userName,
        reportId: `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        reportUrl: uploadedUrls[0], // Primary report URL
        reportDoc: uploadedUrls.join(','), // All file URLs comma-separated
        name: formData.name,
        type: formData.reportType,
        testName: formData.name,
        documentType: formData.reportType,
        reportDate: reportDateTime,
        uploadDate: new Date(),
        uploadedAt: new Date(),
        description: formData.description,
        remarks: formData.remarks || '',
        conditions: selectedHealthTopics, // Health topics as conditions
        status: 'accepted', // User-uploaded reports are auto-accepted
        createdBy: userId,
        updatedBy: userId,
      };

      const response = await axios.post(insertReport, reportData);

      if (response.data.success) {
        toast.success('Report added successfully!');
        queryClient.invalidateQueries({ queryKey: ['getManyReports'] });
        handleClose();
        if (onReportAdded) onReportAdded();
      } else {
        toast.error('Failed to add report');
      }
    } catch (error: any) {
      console.error('Error adding report:', error);
      toast.error(error?.response?.data?.error?.message || 'Failed to add report');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      reportType: '',
      reportDate: '',
      reportTime: '',
      description: '',
      remarks: '',
    });
    setSelectedFiles([]);
    setFileUrls([]);
    setSelectedHealthTopics([]);
    setSearchReportType('');
    setSearchHealthTopic('');
    setShowReportTypeDropdown(false);
    setShowHealthTopicDropdown(false);
    // Report types and health topics are managed by React Query, no need to reset
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto safe-top safe-bottom">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl my-2 sm:my-4 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mobile-scroll">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Add Reports</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 tap-target"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Report Name"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 tap-target"
              />
            </div>

            {/* Report Type */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <div className="relative dropdown-container">
                <input
                  type="text"
                  value={searchReportType}
                  onChange={handleReportTypeChange}
                  onFocus={() => {
                    if (filteredReportTypes.length > 0) {
                    setShowReportTypeDropdown(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay closing dropdown to allow click on suggestions
                    setTimeout(() => setShowReportTypeDropdown(false), 200);
                  }}
                  placeholder="Enter report type manually or select from suggestions..."
                  className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {showReportTypeDropdown && filteredReportTypes.length > 0 && searchReportType && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredReportTypes.slice(0, 20).map((type: any, index: number) => {
                      // API returns testName and sampleName fields
                      const typeName = type.testName || type.name || type.type || type.title || '';
                      const sampleName = type.sampleName ? ` (${type.sampleName})` : '';
                      return (
                        <button
                          key={type.id || type._id || index}
                          type="button"
                          onMouseDown={(e) => {
                            // Prevent blur from closing dropdown before click
                            e.preventDefault();
                            handleSelectReportType(type);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-indigo-50 transition-colors text-sm"
                        >
                          {typeName}{sampleName}
                        </button>
                      );
                    })}
                  </div>
                )}
                {reportTypes.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">You can enter the report type manually</p>
                )}
              </div>
            </div>

            {/* Date & Time */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Date & Time <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={formData.reportDate}
                  onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                  className="flex-1 px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="time"
                  value={formData.reportTime}
                  onChange={(e) => setFormData({ ...formData, reportTime: e.target.value })}
                  className="px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Health Topics */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Health Topics
              </label>
              <div className="relative dropdown-container">
                <input
                  type="text"
                  value={searchHealthTopic}
                  onChange={(e) => {
                    setSearchHealthTopic(e.target.value);
                    setShowHealthTopicDropdown(true);
                  }}
                  onFocus={() => setShowHealthTopicDropdown(true)}
                  placeholder="Search and select health topics..."
                  className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {showHealthTopicDropdown && filteredHealthTopics.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredHealthTopics.slice(0, 10).map((topic: any, index: number) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectHealthTopic(topic)}
                        className="w-full text-left px-4 py-2 hover:bg-indigo-50 transition-colors text-sm"
                      >
                        {topic.title || topic.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedHealthTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {selectedHealthTopics.map((topic, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs"
                    >
                      {topic}
                      <button
                        type="button"
                        onClick={() => handleRemoveHealthTopic(topic)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Report Files - Full Width */}
          <div className="md:col-span-2 mt-2">
            <label className="block text-base font-medium text-gray-700 mb-2">
              Report Files <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileSelect}
                className="hidden"
                id="report-files"
              />
              <label
                htmlFor="report-files"
                className="px-4 py-2.5 text-base bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer inline-flex items-center gap-2"
              >
                <DocumentIcon className="w-5 h-5" />
                Browse...
              </label>
              {isCameraSupported() && (
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  disabled={processingImages}
                  className="px-4 py-2.5 text-base bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CameraIcon className="w-5 h-5" />
                  Capture Photos
                </button>
              )}
              {processingImages && (
                <span className="text-xs text-blue-600 font-medium">Processing and merging files into PDF...</span>
              )}
              {selectedFiles.length > 0 && !processingImages && (
                <span className="text-xs text-gray-600">
                  {selectedFiles.length} file(s) ready
                  {(selectedFiles.some(f => f.name.includes('merged-report')) || 
                    selectedFiles.some(f => f.name.includes('camera-report'))) && (
                    <span className="text-green-600 ml-1">(merged PDF)</span>
                  )}
                </span>
              )}
              {isCameraSupported() && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 Camera photos are automatically merged into a single PDF report
                </p>
              )}
            </div>
            {selectedFiles.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-2">
                      <DocumentIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs font-medium text-gray-900 truncate max-w-xs">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="md:col-span-2 mt-2">
            <label className="block text-base font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Enter report description..."
              className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Remarks */}
          <div className="md:col-span-2 mt-2">
            <label className="block text-base font-medium text-gray-700 mb-2">
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={3}
              placeholder="Write remarks here..."
              className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-gray-200 md:col-span-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 text-base bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-6 py-2.5 text-base bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          maxPhotos={10}
        />
      )}
    </div>
  );
}

