import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';
import fs from 'fs';
import path from 'path';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { profileId, doseId, doseName, vaccineId, vaccineName, duration, dateAdministered, remark } = req.body;

    // #region agent log
    try{fs.appendFileSync(path.join(process.cwd(),'.cursor','debug.log'),JSON.stringify({location:'markVaccineCompleted.ts:11',message:'API request received',data:{profileId,doseId,doseName,vaccineId,vaccineName,dateAdministered},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n');}catch(e){}
    // #endregion

    if (!profileId || !doseId || !doseName || !vaccineId || !vaccineName || !dateAdministered) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the profile
    const profile = await ProfileTable.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // #region agent log
    try{fs.appendFileSync(path.join(process.cwd(),'.cursor','debug.log'),JSON.stringify({location:'markVaccineCompleted.ts:22',message:'Profile found, current vaccineCompletions BEFORE update',data:{profileId,existingCompletions:profile.vaccineCompletions?Object.keys(profile.vaccineCompletions):[],vaccineCompletionsType:typeof profile.vaccineCompletions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n');}catch(e){}
    // #endregion

    // Normalize doseId to string for consistent comparison
    const normalizedDoseId = doseId.toString();

    // #region agent log
    try{fs.appendFileSync(path.join(process.cwd(),'.cursor','debug.log'),JSON.stringify({location:'markVaccineCompleted.ts:30',message:'DoseId normalization',data:{originalDoseId:doseId,normalizedDoseId,originalType:typeof doseId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n');}catch(e){}
    // #endregion

    const completionData = {
      doseId: normalizedDoseId,
      doseName,
      vaccineId: vaccineId.toString(),
      vaccineName,
      duration: duration || '',
      completed: true,
      dateAdministered: new Date(dateAdministered),
      remark: remark || '',
      completedAt: new Date(),
    };

    // CRITICAL FIX: Create a NEW object to ensure Mongoose detects the change
    // Mongoose Mixed types don't detect nested property changes, so we must
    // create a completely new object reference
    let currentCompletions: any = {};
    if (profile.vaccineCompletions && typeof profile.vaccineCompletions === 'object') {
      // Convert to plain object if it's a Map or other type
      if (profile.vaccineCompletions instanceof Map) {
        currentCompletions = Object.fromEntries(profile.vaccineCompletions);
      } else {
        // Create a new object by spreading to ensure new reference
        currentCompletions = { ...profile.vaccineCompletions };
      }
    }
    
    // Add the new completion data to the new object
    currentCompletions[normalizedDoseId] = completionData;
    
    // Assign the entire new object - this triggers Mongoose change detection
    profile.vaccineCompletions = currentCompletions;

    // #region agent log
    try{fs.appendFileSync(path.join(process.cwd(),'.cursor','debug.log'),JSON.stringify({location:'markVaccineCompleted.ts:58',message:'Completion data set in profile, BEFORE save',data:{normalizedDoseId,completionData,allKeys:Object.keys(profile.vaccineCompletions),vaccineCompletionsValue:JSON.stringify(profile.vaccineCompletions)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix'})+'\n');}catch(e){}
    // #endregion

    // Mark the object as modified to ensure Mongoose saves it
    profile.markModified('vaccineCompletions');
    
    // #region agent log
    try{fs.appendFileSync(path.join(process.cwd(),'.cursor','debug.log'),JSON.stringify({location:'markVaccineCompleted.ts:65',message:'BEFORE save - profile.vaccineCompletions',data:{hasVaccineCompletions:!!profile.vaccineCompletions,vaccineCompletionsType:typeof profile.vaccineCompletions,isObject:typeof profile.vaccineCompletions==='object',keys:profile.vaccineCompletions?Object.keys(profile.vaccineCompletions):[],hasNormalizedKey:profile.vaccineCompletions?profile.vaccineCompletions[normalizedDoseId]!=null:false,normalizedDoseId,vaccineCompletionsValue:JSON.stringify(profile.vaccineCompletions)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix'})+'\n');}catch(e){}
    // #endregion
    
    const updatedProfile = await profile.save();

    // #region agent log
    try{fs.appendFileSync(path.join(process.cwd(),'.cursor','debug.log'),JSON.stringify({location:'markVaccineCompleted.ts:72',message:'AFTER save - updatedProfile.vaccineCompletions',data:{hasVaccineCompletions:!!updatedProfile.vaccineCompletions,vaccineCompletionsType:typeof updatedProfile.vaccineCompletions,isObject:typeof updatedProfile.vaccineCompletions==='object',keys:updatedProfile.vaccineCompletions?Object.keys(updatedProfile.vaccineCompletions):[],hasNormalizedKey:updatedProfile.vaccineCompletions?updatedProfile.vaccineCompletions[normalizedDoseId]!=null:false,normalizedDoseId,vaccineCompletionsValue:JSON.stringify(updatedProfile.vaccineCompletions)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix'})+'\n');}catch(e){}
    // #endregion
    
    // Verify by re-fetching from DB immediately after save
    const verifyProfile = await ProfileTable.findById(profileId);
    // #region agent log
    try{fs.appendFileSync(path.join(process.cwd(),'.cursor','debug.log'),JSON.stringify({location:'markVaccineCompleted.ts:78',message:'VERIFY - Re-fetched from DB after save',data:{hasVaccineCompletions:!!verifyProfile?.vaccineCompletions,vaccineCompletionsType:typeof verifyProfile?.vaccineCompletions,keys:verifyProfile?.vaccineCompletions?Object.keys(verifyProfile.vaccineCompletions):[],hasNormalizedKey:verifyProfile?.vaccineCompletions?verifyProfile.vaccineCompletions[normalizedDoseId]!=null:false,normalizedDoseId,vaccineCompletionsValue:JSON.stringify(verifyProfile?.vaccineCompletions)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix'})+'\n');}catch(e){}
    // #endregion

    // CRITICAL FIX: Extract vaccineCompletions BEFORE toObject() because Mongoose Mixed types
    // may not serialize properly with toObject(). Get it directly from the document.
    const vaccineCompletionsFromDoc = updatedProfile.vaccineCompletions || {};
    
    // Convert to plain object to ensure vaccineCompletions is properly serialized
    const profileData = updatedProfile.toObject ? updatedProfile.toObject() : updatedProfile;
    
    // Ensure vaccineCompletions is a plain object (not Map) - use the value from document directly
    let vaccineCompletionsObj: any = {};
    if (vaccineCompletionsFromDoc) {
      if (vaccineCompletionsFromDoc instanceof Map) {
        vaccineCompletionsObj = Object.fromEntries(vaccineCompletionsFromDoc);
      } else if (typeof vaccineCompletionsFromDoc === 'object') {
        vaccineCompletionsObj = vaccineCompletionsFromDoc;
      }
    }
    
    // If toObject() didn't include it, use the value we extracted directly
    if (!profileData.vaccineCompletions || Object.keys(profileData.vaccineCompletions).length === 0) {
      profileData.vaccineCompletions = vaccineCompletionsObj;
    } else {
      vaccineCompletionsObj = profileData.vaccineCompletions;
    }

    // #region agent log
    try{fs.appendFileSync(path.join(process.cwd(),'.cursor','debug.log'),JSON.stringify({location:'markVaccineCompleted.ts:75',message:'Response data being sent',data:{normalizedDoseId,vaccineCompletionsKeys:Object.keys(vaccineCompletionsObj),hasNormalizedKey:vaccineCompletionsObj[normalizedDoseId]!=null,completionData:vaccineCompletionsObj[normalizedDoseId]},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix'})+'\n');}catch(e){}
    // #endregion

    return res.status(200).json({
      message: 'Vaccine marked as completed successfully',
      profile: {
        ...profileData,
        vaccineCompletions: vaccineCompletionsObj,
      },
      vaccineCompletions: vaccineCompletionsObj,
    });
  } catch (error: any) {
    console.error('Error marking vaccine as completed:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

