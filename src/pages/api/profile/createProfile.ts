import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      email,
      gender,
      bloodGroup,
      dob,
      diagnosedCondition,
      bmi,
      foodAllergies,
    } = req.body;

    // Validate required fields
    if (!phoneNumber || !firstName || !lastName || !email || !gender || !bloodGroup || !dob) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Format phone number
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber.replace(' ', '');

    // Check if profile already exists
    const existingProfile = await ProfileTable.findOne({ phoneNumber: formattedPhone });
    if (existingProfile) {
      return res.status(400).json({ error: 'Profile already exists' });
    }

    // Calculate age from DOB to determine if pediatric (age < 2 years)
    const calculateAge = (dob: Date): number => {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    const dobDate = new Date(dob);
    const age = calculateAge(dobDate);
    // Set isPediatric to true if age < 2, otherwise use the value from request body (if provided)
    const isPediatric = age < 2 ? true : (req.body.isPediatric || false);

    // Prepare profile data
    const profileData: any = {
      phoneNumber: formattedPhone,
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      gender,
      bloodGroup,
      dob: dobDate,
      createdDate: new Date(),
      userType: 'Primary',
      subscription: 'Free',
      isPediatric,
    };

    // Add optional fields if provided
    if (diagnosedCondition && Array.isArray(diagnosedCondition) && diagnosedCondition.length > 0) {
      profileData.diagnosedCondition = diagnosedCondition;
    }

    if (bmi && Array.isArray(bmi) && bmi.length > 0) {
      profileData.bmi = bmi;
    }

    if (foodAllergies && Array.isArray(foodAllergies) && foodAllergies.length > 0) {
      profileData.foodAllergies = foodAllergies;
    }

    // Create new profile
    const profile = new ProfileTable(profileData);

    const savedProfile = await profile.save();
    return res.status(201).json(savedProfile);
  } catch (error: any) {
    console.error('Error creating profile:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

