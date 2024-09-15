import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';
import { getMembersLimit, getReportsLimit } from '@/lib/utils/subscription';
import fs from 'fs';
import path from 'path';

/** Sublimit multiplier for members who inherit plan from primary (e.g. 0.1 = 10%). */
const INHERITED_PLAN_SUBLIMIT_MULTIPLIER = 0.1;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const phoneNumberParam = req.query.phoneNumber?.toString() || '';
  
  // Decode URL encoding and clean up the phone number
  let phone = decodeURIComponent(phoneNumberParam).replace(/\s/g, '');
  
  // Ensure phone number starts with +
  if (!phone.startsWith('+')) {
    phone = '+' + phone;
  }

  try {
    const profile = await ProfileTable.findOne({ phoneNumber: phone });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // CRITICAL FIX: Extract vaccineCompletions BEFORE toObject() because Mongoose Mixed types
    // may not serialize properly with toObject(). Get it directly from the document.
    const vaccineCompletionsFromDoc = profile.vaccineCompletions || {};
    
    // Ensure all fields are included, especially isDoctor, doctorApproved, doctorCertificate
    const profileData = profile.toObject ? profile.toObject() : profile;
    
    // #region agent log
    try{fs.appendFileSync(path.join(process.cwd(),'.cursor','debug.log'),JSON.stringify({location:'getProfileByPhone.ts:36',message:'Profile fetched from DB, BEFORE processing',data:{profileId:profileData._id||profileData.id,hasVaccineCompletionsFromDoc:!!vaccineCompletionsFromDoc,vaccineCompletionsFromDocKeys:Object.keys(vaccineCompletionsFromDoc),hasVaccineCompletionsInToObject:!!profileData.vaccineCompletions,vaccineCompletionsType:typeof profileData.vaccineCompletions,vaccineCompletionsKeys:profileData.vaccineCompletions?Object.keys(profileData.vaccineCompletions):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix'})+'\n');}catch(e){}
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

    // Effective subscription: if this user is added as a member by an Enterprise/Premium primary,
    // they get that plan for entitlements (with sublimits). Tier order: Enterprise > Premium > Free.
    const profileIdStr = String(profileData._id || profileData.id || '');
    const tierRank: Record<string, number> = { Free: 0, Premium: 1, Enterprise: 2 };
    const ownTier = (profileData.subscription && tierRank[profileData.subscription] !== undefined)
      ? profileData.subscription
      : 'Free';
    let effectiveSubscription: string = ownTier;
    let bestPrimary: { _id: string; firstName: string; lastName: string; phoneNumber: string; subscription: string } | null = null;

    const primaries = await ProfileTable.find({
      $or: [
        { 'members.memberId': profileIdStr },
        { 'members.phoneNumber': phone },
      ],
      subscription: { $in: ['Premium', 'Enterprise'] },
    }).select('_id firstName lastName phoneNumber subscription').lean();

    for (const p of primaries) {
      const t = (p as any).subscription;
      if (t && tierRank[t] !== undefined && tierRank[t] > tierRank[effectiveSubscription]) {
        effectiveSubscription = t;
        bestPrimary = {
          _id: String((p as any)._id),
          firstName: (p as any).firstName ?? '',
          lastName: (p as any).lastName ?? '',
          phoneNumber: (p as any).phoneNumber ?? '',
          subscription: t,
        };
      }
    }

    (profileData as any).effectiveSubscription = effectiveSubscription;

    if (bestPrimary) {
      (profileData as any).effectiveSubscriptionSource = {
        primaryProfileId: bestPrimary._id,
        primaryFirstName: bestPrimary.firstName,
        primaryLastName: bestPrimary.lastName,
        primaryPhoneNumber: bestPrimary.phoneNumber,
        primaryName: [bestPrimary.firstName, bestPrimary.lastName].filter(Boolean).join(' ') || bestPrimary.phoneNumber || 'Primary',
      };
      const fullMembersLimit = getMembersLimit(effectiveSubscription);
      const fullReportsLimit = getReportsLimit(effectiveSubscription);
      (profileData as any).effectiveMembersLimit = Math.max(1, Math.floor(fullMembersLimit * INHERITED_PLAN_SUBLIMIT_MULTIPLIER));
      (profileData as any).effectiveReportsLimit = Math.max(1, Math.floor(fullReportsLimit * INHERITED_PLAN_SUBLIMIT_MULTIPLIER));
    } else {
      (profileData as any).effectiveMembersLimit = getMembersLimit(effectiveSubscription);
      (profileData as any).effectiveReportsLimit = getReportsLimit(effectiveSubscription);
    }

    // #region agent log
    try{fs.appendFileSync(path.join(process.cwd(),'.cursor','debug.log'),JSON.stringify({location:'getProfileByPhone.ts:44',message:'Profile data being returned',data:{profileId:profileData._id||profileData.id,vaccineCompletionsKeys:Object.keys(profileData.vaccineCompletions),vaccineCompletions:vaccineCompletionsObj},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n');}catch(e){}
    // #endregion
    
    return res.status(200).json(profileData);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

