import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';
import fs from 'fs';
import path from 'path';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Profile ID is required' });
    }

    const profile = await ProfileTable.findById(id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // CRITICAL FIX: Extract vaccineCompletions BEFORE toObject() because Mongoose Mixed types
    // may not serialize properly with toObject(). Get it directly from the document.
    const vaccineCompletionsFromDoc = profile.vaccineCompletions || {};
    
    // Ensure all fields are included, especially isDoctor, doctorApproved, doctorCertificate
    const profileData = profile.toObject ? profile.toObject() : profile;
    
    // #region agent log
    try{fs.appendFileSync(path.join(process.cwd(),'.cursor','debug.log'),JSON.stringify({location:'getProfileById.ts:22',message:'Profile fetched from DB, BEFORE processing',data:{profileId:profileData._id||profileData.id,hasVaccineCompletionsFromDoc:!!vaccineCompletionsFromDoc,vaccineCompletionsFromDocKeys:Object.keys(vaccineCompletionsFromDoc),hasVaccineCompletionsInToObject:!!profileData.vaccineCompletions,vaccineCompletionsType:typeof profileData.vaccineCompletions,vaccineCompletionsKeys:profileData.vaccineCompletions?Object.keys(profileData.vaccineCompletions):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix'})+'\n');}catch(e){}
    // #endregion
    
    // Ensure vaccineCompletions is a plain object - use the value from document directly
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
    try{fs.appendFileSync(path.join(process.cwd(),'.cursor','debug.log'),JSON.stringify({location:'getProfileById.ts:30',message:'Profile data being returned',data:{profileId:profileData._id||profileData.id,vaccineCompletionsKeys:Object.keys(profileData.vaccineCompletions),vaccineCompletions:vaccineCompletionsObj},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n');}catch(e){}
    // #endregion
    
    return res.status(200).json(profileData);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

