import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ReportsTable from '@/lib/models/Reports';
import ProfileTable from '@/lib/models/Profile';
import mongoose from 'mongoose';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed. Only DELETE is supported.`,
      },
    });
  }

  const reportId = req.query.id || req.body.id;
  const userId = req.query.userId || req.body.userId; // Optional: userId (phoneNumber) to narrow down search
  const memberId = req.query.memberId || req.body.memberId; // Optional: memberId (profile _id) to find member profile
  const currentUserPhoneNumber = req.query.currentUserPhoneNumber || req.body.currentUserPhoneNumber; // Optional: current user's phoneNumber to find members list
  
  if (!reportId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_REPORT_ID',
        message: 'Report ID is required (provide as query parameter ?id= or in request body)',
      },
    });
  }

  try {
    let deletedReport = null;
    let foundUserId: string | null = null;
    let reportIdValue: string | null = null;
    let profilesToSearch: any[] = []; // Initialize outside to avoid undefined error

    console.log('Delete report request:', { 
      reportId, 
      userId, 
      memberId,
      currentUserPhoneNumber,
      isValidObjectId: mongoose.Types.ObjectId.isValid(reportId) 
    });

    // First, try to find the report in Reports collection
    // Try multiple search methods
    let reportFromCollection = null;
    
    // Method 1: Try findById with ObjectId conversion
    try {
      if (mongoose.Types.ObjectId.isValid(reportId)) {
        const objectId = new mongoose.Types.ObjectId(reportId);
        reportFromCollection = await ReportsTable.findById(objectId);
        if (reportFromCollection) {
          console.log('Found report using findById with ObjectId conversion');
        }
      }
    } catch (e) {
      console.error('Error in findById with ObjectId:', e);
    }
    
    // Method 2: Try findById with string (Mongoose should handle conversion)
    if (!reportFromCollection) {
      try {
        reportFromCollection = await ReportsTable.findById(reportId);
        if (reportFromCollection) {
          console.log('Found report using findById with string');
        }
      } catch (e) {
        console.error('Error in findById with string:', e);
      }
    }
    
    // Method 3: Try finding by reportId field
    if (!reportFromCollection) {
      try {
        reportFromCollection = await ReportsTable.findOne({ reportId: reportId });
        if (reportFromCollection) {
          console.log('Found report using reportId field');
        }
      } catch (e) {
        console.error('Error finding by reportId field:', e);
      }
    }
    
    // Method 4: Try finding by _id with userId filter (if userId provided)
    if (!reportFromCollection && userId) {
      try {
        if (mongoose.Types.ObjectId.isValid(reportId)) {
          const objectId = new mongoose.Types.ObjectId(reportId);
          reportFromCollection = await ReportsTable.findOne({ 
            _id: objectId,
            userId: userId 
          });
          if (reportFromCollection) {
            console.log('Found report using _id + userId filter');
          }
        }
      } catch (e) {
        console.error('Error finding by _id + userId:', e);
      }
    }
    
    // Method 5: Try finding by _id as string with userId filter
    if (!reportFromCollection && userId) {
      try {
        reportFromCollection = await ReportsTable.findOne({ 
          _id: reportId,
          userId: userId 
        });
        if (reportFromCollection) {
          console.log('Found report using _id string + userId filter');
        }
      } catch (e) {
        console.error('Error finding by _id string + userId:', e);
      }
    }
    
    if (reportFromCollection) {
      foundUserId = reportFromCollection.userId;
      reportIdValue = reportFromCollection.reportId || reportId;
      
      console.log('Found report in Reports collection:', { foundUserId, reportIdValue });
      
      // Delete from Reports collection
      deletedReport = await ReportsTable.findByIdAndDelete(reportFromCollection._id);
      
      // Also check and remove from the member's profile.reports if it exists there
      // This handles cases where reports are synced to both places
      if (foundUserId) {
        try {
          const memberProfile = await ProfileTable.findOne({ phoneNumber: foundUserId });
          if (memberProfile && memberProfile.reports && Array.isArray(memberProfile.reports)) {
            const initialLength = memberProfile.reports.length;
            // Remove report from member's profile.reports
            memberProfile.reports = memberProfile.reports.filter((r: any) => {
              const rId = r._id?.toString() || r.id?.toString();
              const rReportId = r.reportId;
              return rId !== reportId.toString() && 
                     rId !== String(reportId) &&
                     rReportId !== reportIdValue &&
                     rReportId !== reportId;
            });
            
            if (memberProfile.reports.length < initialLength) {
              await memberProfile.save();
              console.log('Removed report from member profile.reports');
            }
          }
        } catch (profileError: any) {
          console.error('Error removing report from member profile:', profileError);
        }
      }
    } else {
      console.log('Report not found in Reports collection, searching profile.reports...');
      // Report not in Reports collection, search in profile.reports
      // If userId is provided, search only that profile (more efficient)
      // Otherwise, search all profiles
      
      if (userId || memberId) {
        let memberProfile = null;
        
        // Method 1: Try finding by memberId (profile _id) first - most direct
        if (memberId && mongoose.Types.ObjectId.isValid(memberId)) {
          try {
            const memberObjectId = new mongoose.Types.ObjectId(memberId);
            memberProfile = await ProfileTable.findById(memberObjectId);
            if (memberProfile) {
              console.log(`Found member profile by memberId: ${memberId}`);
            }
          } catch (e) {
            console.error('Error finding profile by memberId:', e);
          }
        }
        
        // Method 2: Try finding by phoneNumber (userId)
        if (!memberProfile && userId) {
          memberProfile = await ProfileTable.findOne({ phoneNumber: userId });
          if (memberProfile) {
            console.log(`Found member profile by phoneNumber (userId): ${userId}`);
          }
        }
        
        // Method 3: If userId provided but profile not found, try finding through current user's members list
        if (!memberProfile && userId && currentUserPhoneNumber) {
          try {
            const currentUserProfile = await ProfileTable.findOne({ phoneNumber: currentUserPhoneNumber });
            if (currentUserProfile && currentUserProfile.members && Array.isArray(currentUserProfile.members)) {
              // Find member in the members array with matching phoneNumber
              const memberMeta = currentUserProfile.members.find((m: any) => 
                m.phoneNumber === userId || String(m.phoneNumber) === String(userId)
              );
              
              if (memberMeta && memberMeta.memberId) {
                console.log(`Found member in current user's members list, memberId: ${memberMeta.memberId}`);
                // Find the member's profile by memberId (which is the profile _id)
                if (mongoose.Types.ObjectId.isValid(memberMeta.memberId)) {
                  const memberObjectId = new mongoose.Types.ObjectId(memberMeta.memberId);
                  memberProfile = await ProfileTable.findById(memberObjectId);
                  if (memberProfile) {
                    console.log(`Found member profile through members list lookup`);
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error finding member through current user profile:', e);
          }
        }
        
        if (memberProfile) {
          profilesToSearch = [memberProfile];
          console.log(`Searching in member profile:`, {
            phoneNumber: memberProfile.phoneNumber,
            profileId: memberProfile._id?.toString(),
            reportsCount: memberProfile.reports?.length || 0
          });
          
          // Log all report IDs in this profile for debugging
          if (memberProfile.reports && Array.isArray(memberProfile.reports)) {
            const reportIds = memberProfile.reports.map((r: any) => ({
              _id: r._id?.toString(),
              reportId: r.reportId,
              name: r.name,
              userId: r.userId
            }));
            console.log(`Report IDs in member profile:`, reportIds);
          }
        } else {
          console.log(`Member profile not found for userId: ${userId}, memberId: ${memberId}`);
          // If member profile not found, also try searching in Reports collection by userId
          // in case the report exists there but wasn't found earlier
          if (userId) {
            const reportByUserId = await ReportsTable.findOne({ 
              userId: userId,
              $or: [
                { _id: reportId },
                { reportId: reportId }
              ]
            });
            if (reportByUserId) {
              console.log('Found report in Reports collection by userId');
              foundUserId = reportByUserId.userId;
              reportIdValue = reportByUserId.reportId || reportId;
              deletedReport = await ReportsTable.findByIdAndDelete(reportByUserId._id);
            }
          }
        }
      } else {
        // Search all profiles that have reports
        profilesToSearch = await ProfileTable.find({ 'reports': { $exists: true, $ne: [] } });
        console.log(`Searching in ${profilesToSearch.length} profiles`);
        
        // Also try one more time in Reports collection without userId filter
        // in case the report exists but userId wasn't provided
        if (!deletedReport) {
          try {
            if (mongoose.Types.ObjectId.isValid(reportId)) {
              const objectId = new mongoose.Types.ObjectId(reportId);
              const reportByObjectId = await ReportsTable.findById(objectId);
              if (reportByObjectId) {
                console.log('Found report in Reports collection (retry without userId filter)');
                foundUserId = reportByObjectId.userId;
                reportIdValue = reportByObjectId.reportId || reportId;
                deletedReport = await ReportsTable.findByIdAndDelete(reportByObjectId._id);
              }
            }
          } catch (e) {
            console.error('Error in final Reports collection search:', e);
          }
        }
      }
      
      for (const profile of profilesToSearch) {
        if (profile.reports && Array.isArray(profile.reports)) {
          console.log(`Checking profile ${profile.phoneNumber} with ${profile.reports.length} reports`);
          
          // Try to find the report using multiple comparison methods
          const reportIndex = profile.reports.findIndex((r: any) => {
            if (!r) return false;
            
            // Convert both to strings for comparison
            const rIdStr = r._id?.toString() || r.id?.toString() || '';
            const reportIdStr = reportId.toString();
            
            console.log(`Comparing report:`, {
              rIdStr,
              reportIdStr,
              match: rIdStr === reportIdStr,
              rReportId: r.reportId,
              rIdType: typeof r._id,
              reportIdType: typeof reportId
            });
            
            // Direct string comparison (most reliable)
            if (rIdStr === reportIdStr) {
              console.log('Match found by direct string comparison');
              return true;
            }
            
            // Compare reportId field
            if (r.reportId === reportId || r.reportId === reportIdStr) {
              console.log('Match found by reportId field');
              return true;
            }
            
            // Try ObjectId comparison if both are valid ObjectIds
            try {
              if (mongoose.Types.ObjectId.isValid(reportIdStr) && mongoose.Types.ObjectId.isValid(rIdStr)) {
                const reportIdObj = new mongoose.Types.ObjectId(reportIdStr);
                const rIdObj = new mongoose.Types.ObjectId(rIdStr);
                if (reportIdObj.equals(rIdObj)) {
                  console.log('Match found by ObjectId.equals()');
                  return true;
                }
              }
            } catch (e) {
              // Ignore ObjectId conversion errors
            }
            
            // Try comparing as ObjectId if r._id is an ObjectId
            if (r._id) {
              try {
                // If r._id is already an ObjectId, use its equals method
                if (r._id.equals && mongoose.Types.ObjectId.isValid(reportIdStr)) {
                  const reportIdObj = new mongoose.Types.ObjectId(reportIdStr);
                  if (r._id.equals(reportIdObj)) {
                    console.log('Match found by r._id.equals()');
                    return true;
                  }
                }
                // Also try string comparison
                if (String(r._id) === reportIdStr) {
                  console.log('Match found by String(r._id) comparison');
                  return true;
                }
              } catch (e) {
                // Ignore ObjectId conversion errors
              }
            }
            
            return false;
          });
          
          if (reportIndex !== -1) {
            // Found the report in this profile
            const foundReport = profile.reports[reportIndex];
            foundUserId = foundReport.userId || profile.phoneNumber;
            reportIdValue = foundReport.reportId || reportId;
            deletedReport = foundReport;
            
            console.log('Found report in profile.reports, removing...', {
              profilePhoneNumber: profile.phoneNumber,
              reportIndex,
              reportId: foundReport._id?.toString(),
              reportIdValue,
              foundReportUserId: foundReport.userId
            });
            
            // Remove from profile.reports array using $pull for more reliable deletion
            try {
              // Try using $pull operator with multiple conditions
              let pullResult = null;
              
              // Method 1: Try by _id (ObjectId)
              if (foundReport._id) {
                try {
                  // Convert to ObjectId if it's a string
                  const reportObjectId = mongoose.Types.ObjectId.isValid(foundReport._id) 
                    ? (foundReport._id instanceof mongoose.Types.ObjectId 
                        ? foundReport._id 
                        : new mongoose.Types.ObjectId(foundReport._id))
                    : foundReport._id;
                  
                  pullResult = await ProfileTable.updateOne(
                    { phoneNumber: profile.phoneNumber },
                    { $pull: { reports: { _id: reportObjectId } } }
                  );
                  console.log('$pull by _id result:', pullResult);
                } catch (pullError: any) {
                  console.error('Error in $pull by _id:', pullError);
                }
              }
              
              // Method 2: If that didn't work, try by reportId
              if (!pullResult || pullResult.modifiedCount === 0) {
                try {
                  pullResult = await ProfileTable.updateOne(
                    { phoneNumber: profile.phoneNumber },
                    { $pull: { reports: { reportId: reportIdValue || reportId } } }
                  );
                  console.log('$pull by reportId result:', pullResult);
                } catch (pullError: any) {
                  console.error('Error in $pull by reportId:', pullError);
                }
              }
              
              // Method 3: If $pull didn't work, try manual removal
              if (!pullResult || pullResult.modifiedCount === 0) {
                console.log('$pull did not modify, using manual removal');
                profile.reports.splice(reportIndex, 1);
                await profile.save();
                console.log('Manually removed report from profile.reports');
              } else {
                console.log('Successfully removed using $pull, modifiedCount:', pullResult.modifiedCount);
              }
            } catch (pullError: any) {
              // Fallback to manual removal if $pull fails
              console.error('Error using $pull, falling back to manual removal:', pullError);
              profile.reports.splice(reportIndex, 1);
              await profile.save();
              console.log('Manually removed report after $pull error');
            }
            break;
          } else {
            console.log(`Report not found in profile ${profile.phoneNumber} reports array`);
          }
        }
      }
    }

    if (!deletedReport) {
      // Final attempt: Try to find the report in Reports collection with any userId
      // This handles cases where the report exists but userId doesn't match
      try {
        if (mongoose.Types.ObjectId.isValid(reportId)) {
          const objectId = new mongoose.Types.ObjectId(reportId);
          const finalAttempt = await ReportsTable.findById(objectId);
          if (finalAttempt) {
            console.log('Found report in final attempt (any userId)');
            foundUserId = finalAttempt.userId;
            reportIdValue = finalAttempt.reportId || reportId;
            deletedReport = await ReportsTable.findByIdAndDelete(finalAttempt._id);
          }
        }
      } catch (e) {
        console.error('Error in final attempt:', e);
      }
    }
    
    if (!deletedReport) {
      // Log detailed information for debugging
      console.error('Report not found after all attempts:', { 
        reportId, 
        userId, 
        searchedProfiles: profilesToSearch.length,
        isValidObjectId: mongoose.Types.ObjectId.isValid(reportId),
        reportIdType: typeof reportId
      });
      
      // Try to check if report exists with different search
      try {
        const checkReport = await ReportsTable.findOne({ _id: reportId });
        const checkByReportId = await ReportsTable.findOne({ reportId: reportId });
        console.error('Debug check:', {
          foundById: !!checkReport,
          foundByReportId: !!checkByReportId,
          checkReportUserId: checkReport?.userId,
          checkByReportIdUserId: checkByReportId?.userId
        });
      } catch (e) {
        console.error('Error in debug check:', e);
      }
      
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: `Report with ID ${reportId} not found in Reports collection or any profile`,
        },
      });
    }
    
    console.log('Report deleted successfully:', { reportId, foundUserId, reportIdValue });

    // Also remove from profile.reports if it exists there (for reports that were in both places)
    // This handles the case where a report exists in both Reports collection and profile.reports
    try {
      if (foundUserId) {
        const profile = await ProfileTable.findOne({ phoneNumber: foundUserId });
        if (profile && profile.reports && Array.isArray(profile.reports)) {
          const initialLength = profile.reports.length;
          // Remove report by _id, id, or reportId
          profile.reports = profile.reports.filter(
            (r: any) => {
              const rId = r._id?.toString() || r.id?.toString();
              const rReportId = r.reportId;
              return rId !== reportId.toString() && 
                     rId !== String(reportId) &&
                     rReportId !== reportIdValue &&
                     rReportId !== reportId;
            }
          );
          
          // Only save if something was removed
          if (profile.reports.length < initialLength) {
            await profile.save();
          }
        }
      }
    } catch (profileError: any) {
      // Log error but don't fail the request if profile update fails
      console.error('Error removing report from profile:', profileError);
      // Continue with successful response since report was deleted
    }

    return res.status(200).json({
      success: true,
      data: deletedReport,
      message: 'Report deleted successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete report',
      },
    });
  }
};

export default connectDBMiddleware(handler);

