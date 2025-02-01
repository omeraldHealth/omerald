import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import ProfileTable from '@/lib/models/Profile';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, ...updateData } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Profile ID is required' });
    }

    // Calculate isPediatric if DOB is being updated
    if (updateData.dob) {
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

      const dobDate = new Date(updateData.dob);
      const age = calculateAge(dobDate);
      // Set isPediatric to true if age < 2, otherwise use the value from request body (if provided)
      updateData.isPediatric = age < 2 ? true : (updateData.isPediatric !== undefined ? updateData.isPediatric : false);
      // Ensure dob is a Date object
      updateData.dob = dobDate;
    }

    // Handle iapGrowthCharts date conversion
    if (updateData.iapGrowthCharts && Array.isArray(updateData.iapGrowthCharts)) {
      updateData.iapGrowthCharts = updateData.iapGrowthCharts.map((entry: any) => {
        const processedEntry: any = {
          age: entry.age || 0,
          weight: entry.weight || 0,
          height: entry.height || 0,
        };
        
        // Convert date to Date object if it's a string or Date
        if (entry.date) {
          processedEntry.date = new Date(entry.date);
        }
        
        // Preserve comments if they exist
        if (entry.comment && Array.isArray(entry.comment)) {
          processedEntry.comment = entry.comment;
        }
        
        return processedEntry;
      });
      
      console.log('Processed iapGrowthCharts:', JSON.stringify(updateData.iapGrowthCharts, null, 2));
    }

    const profile = await ProfileTable.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Convert to plain object to ensure proper serialization
    const profileData = profile.toObject ? profile.toObject() : profile;
    
    console.log('Updated profile iapGrowthCharts:', profileData.iapGrowthCharts?.length || 0, 'entries');
    
    return res.status(200).json(profileData);
  } catch (error: any) {
    console.error('Error updating profile:', error);
    console.error('Error details:', error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
};

export default connectDBMiddleware(handler);

