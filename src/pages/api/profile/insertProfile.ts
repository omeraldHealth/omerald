import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.body) {
    return res.status(400).json({ error: 'Input cannot be empty' });
  }

  try {
    // Calculate age from DOB to determine if pediatric (age < 2 years)
    let isPediatric = req.body.isPediatric || false;
    if (req.body.dob) {
      const calculateAge = (dob: Date | string): number => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      const dobDate = new Date(req.body.dob);
      const age = calculateAge(dobDate);
      // Set isPediatric to true if age < 2, otherwise use the value from request body
      isPediatric = age < 2 ? true : (req.body.isPediatric || false);
    }

    const profileObject = new ProfileTable({
      phoneNumber: req.body.phoneNumber,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      gender: req.body.gender,
      bloodGroup: req.body.bloodGroup,
      dob: req.body.dob ? new Date(req.body.dob) : undefined,
      createdDate: new Date(),
      address: req.body.address || {},
      about: req.body.about,
      profileUrl: req.body.profileUrl,
      members: req.body.members || [],
      userType: req.body.userType || 'Primary',
      subscription: req.body.subscription || 'Free',
      articles: req.body.articles || [],
      reports: req.body.reports || [],
      sharedReports: req.body.sharedReports || [],
      sharedWith: req.body.sharedWith || [],
      diagnosedCondition: req.body.diagnosedCondition || req.body.diagnosticCondition || [],
      healthTopics: req.body.healthTopics || [],
      bmi: req.body.bmi || [],
      anthopometric: req.body.anthopometric || [],
      muac: req.body.muac || [],
      foodAllergies: req.body.foodAllergies || [],
      notification: req.body.notification || [],
      activities: req.body.activities || [],
      isPediatric,
    });

    const profiles = await profileObject.save();
    return res.status(201).json(profiles);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

