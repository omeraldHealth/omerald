/**
 * Dummy Data Generation Script for Omerald App
 * 
 * This script generates comprehensive dummy data for 10 users with:
 * - User records
 * - Profile records with full health data
 * - Family members with different relations
 * - Reports (local and references to DC reports)
 * - Shared members (accepted, pending, rejected)
 * - Shared reports
 * - BMI, anthropometric, MUAC data
 * - Diagnosed conditions
 * - Health topics
 * - Food allergies
 * 
 * Usage:
 *   node scripts/generate-dummy-data.js
 * 
 * Note: Make sure MongoDB is connected and the API endpoints are accessible
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// American names for users
const USER_NAMES = [
  { firstName: 'James', lastName: 'Anderson', gender: 'male' },
  { firstName: 'Sarah', lastName: 'Martinez', gender: 'female' },
  { firstName: 'Michael', lastName: 'Thompson', gender: 'male' },
  { firstName: 'Emily', lastName: 'Johnson', gender: 'female' },
  { firstName: 'David', lastName: 'Williams', gender: 'male' },
  { firstName: 'Jessica', lastName: 'Brown', gender: 'female' },
  { firstName: 'Christopher', lastName: 'Davis', gender: 'male' },
  { firstName: 'Amanda', lastName: 'Miller', gender: 'female' },
  { firstName: 'Daniel', lastName: 'Wilson', gender: 'male' },
  { firstName: 'Michelle', lastName: 'Moore', gender: 'female' },
];

// Family member names and relations
const FAMILY_RELATIONS = [
  { relation: 'Spouse', gender: 'female' },
  { relation: 'Son', gender: 'male' },
  { relation: 'Daughter', gender: 'female' },
  { relation: 'Father', gender: 'male' },
  { relation: 'Mother', gender: 'female' },
  { relation: 'Brother', gender: 'male' },
  { relation: 'Sister', gender: 'female' },
];

const FAMILY_MEMBER_NAMES = {
  male: ['Robert', 'John', 'William', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Matthew'],
  female: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Karen'],
};

// Blood groups
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

// Test names for reports
const TEST_NAMES = [
  'Complete Blood Count (CBC)',
  'Lipid Profile',
  'Liver Function Test (LFT)',
  'Kidney Function Test (KFT)',
  'Thyroid Function Test (TFT)',
  'HbA1c',
  'Vitamin D',
  'Vitamin B12',
  'Hemoglobin',
  'Blood Sugar (Fasting)',
  'Blood Sugar (Post Prandial)',
  'ECG',
  'Chest X-Ray',
  'Ultrasound Abdomen',
];

// Diagnosed conditions
const CONDITIONS = [
  'Type 2 Diabetes',
  'Hypertension',
  'High Cholesterol',
  'Hypothyroidism',
  'Anemia',
  'Vitamin D Deficiency',
  'Asthma',
  'Arthritis',
  'Migraine',
  'GERD',
];

// Health topics
const HEALTH_TOPICS = [
  { topic: 'Diabetes Management', noOfBlogs: 15, topicUrl: '/health-topics/diabetes' },
  { topic: 'Heart Health', noOfBlogs: 12, topicUrl: '/health-topics/heart' },
  { topic: 'Nutrition', noOfBlogs: 20, topicUrl: '/health-topics/nutrition' },
  { topic: 'Mental Health', noOfBlogs: 10, topicUrl: '/health-topics/mental-health' },
  { topic: 'Exercise & Fitness', noOfBlogs: 18, topicUrl: '/health-topics/fitness' },
];

// Food allergies
const FOOD_ALLERGIES = ['Peanuts', 'Shellfish', 'Dairy', 'Gluten', 'Eggs', 'Soy', 'Tree Nuts'];

// Diagnostic centers (from DC app)
const DIAGNOSTIC_CENTERS = [
  { id: '6923055b15cc341a63c7ced2', name: 'Apollo Diagnostics' },
  { id: '6923055b15cc341a63c7ced3', name: 'Pathkind Labs' },
  { id: '6923055b15cc341a63c7ced4', name: 'Helvetia Diagnostics' },
];

// Helper functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomPhoneNumber(base, index) {
  return `+1555555010${index}`;
}

function generateEmail(firstName, lastName, index) {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`;
}

function generateDOB(minAge = 25, maxAge = 65) {
  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  const year = new Date().getFullYear() - age;
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month, day);
}

function calculateBMI(height, weight) {
  const heightInMeters = height / 100;
  return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
}

function generateBMIEntry() {
  const height = Math.floor(Math.random() * 30) + 150; // 150-180 cm
  const weight = Math.floor(Math.random() * 40) + 50; // 50-90 kg
  const bmi = calculateBMI(height, weight);
  const date = getRandomDate(new Date(2023, 0, 1), new Date());
  
  return {
    height,
    weight,
    bmi,
    updatedDate: date,
    comment: Math.random() > 0.7 ? [{
      text: 'Regular checkup',
      time: date,
      user: 'System',
    }] : [],
  };
}

function generateReport(userId, userName, reportDate) {
  const testName = getRandomElement(TEST_NAMES);
  const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    userId,
    userName,
    reportId,
    name: testName,
    type: 'Lab Report',
    testName,
    reportDate,
    uploadDate: reportDate,
    uploadedAt: reportDate,
    status: 'completed',
    documentType: 'pdf',
    diagnosticCenter: getRandomElement(DIAGNOSTIC_CENTERS).name,
    description: `Laboratory test report for ${testName}`,
    remarks: 'Report reviewed and verified',
    parsedData: [
      {
        keyword: 'Test Parameter',
        value: (Math.random() * 100).toFixed(2),
        unit: 'units',
        normalRange: '0-100',
      },
    ],
    conditions: Math.random() > 0.7 ? [getRandomElement(CONDITIONS)] : [],
    sharedWith: [],
    createdBy: userId,
    updatedBy: userId,
  };
}

// Main data generation function
async function generateDummyData() {
  console.log('🚀 Starting dummy data generation...\n');
  
  const users = [];
  const profiles = [];
  const reports = [];
  const sharedMembers = [];
  
  // Generate 10 users
  for (let i = 0; i < 10; i++) {
    const phoneNumber = getRandomPhoneNumber('+15555550100', i);
    const userInfo = USER_NAMES[i];
    const email = generateEmail(userInfo.firstName, userInfo.lastName, i);
    const dob = generateDOB(25, 65);
    const uid = `uid-${Date.now()}-${i}`;
    
    console.log(`\n📝 Generating data for User ${i + 1}: ${userInfo.firstName} ${userInfo.lastName} (${phoneNumber})`);
    
    // 1. Create User
    try {
      const userResponse = await fetch(`${BASE_URL}/api/user/insertUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          uid,
          role: 'user',
        }),
      });
      
      if (!userResponse.ok) {
        const error = await userResponse.text();
        console.log(`   ⚠️  User creation skipped (may already exist): ${error}`);
      } else {
        const userData = await userResponse.json();
        users.push(userData);
        console.log(`   ✅ User created: ${userData._id}`);
      }
    } catch (error) {
      console.log(`   ⚠️  User creation error: ${error.message}`);
    }
    
    // 2. Generate BMI data (3-5 entries)
    const bmiEntries = [];
    const numBMIEntries = Math.floor(Math.random() * 3) + 3;
    for (let j = 0; j < numBMIEntries; j++) {
      bmiEntries.push(generateBMIEntry());
    }
    
    // 3. Generate diagnosed conditions (0-3)
    const diagnosedConditions = getRandomElements(CONDITIONS, Math.floor(Math.random() * 4))
      .map(condition => ({
        condition,
        date: getRandomDate(new Date(2020, 0, 1), new Date()),
      }));
    
    // 4. Generate health topics (2-4)
    const healthTopics = getRandomElements(HEALTH_TOPICS, Math.floor(Math.random() * 3) + 2);
    
    // 5. Generate food allergies (0-2)
    const foodAllergies = getRandomElements(FOOD_ALLERGIES, Math.floor(Math.random() * 3))
      .map(foodItem => ({
        foodItem,
        updatedDate: getRandomDate(new Date(2023, 0, 1), new Date()),
        comment: [],
      }));
    
    // 6. Generate anthropometric data (1-3 entries)
    const anthopometric = [];
    for (let j = 0; j < Math.floor(Math.random() * 3) + 1; j++) {
      anthopometric.push({
        anthopometric: Math.floor(Math.random() * 20) + 20, // 20-40
        updatedDate: getRandomDate(new Date(2023, 0, 1), new Date()),
        comment: [],
      });
    }
    
    // 7. Generate MUAC data (1-2 entries)
    const muac = [];
    for (let j = 0; j < Math.floor(Math.random() * 2) + 1; j++) {
      muac.push({
        height: Math.floor(Math.random() * 30) + 20, // 20-50 cm
        updatedDate: getRandomDate(new Date(2023, 0, 1), new Date()),
        comment: [],
      });
    }
    
    // 8. Create Profile
    try {
      const profileData = {
        phoneNumber,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email,
        gender: userInfo.gender,
        bloodGroup: getRandomElement(BLOOD_GROUPS),
        dob: dob.toISOString(),
        bio: `Health enthusiast and ${userInfo.gender === 'male' ? 'father' : 'mother'} of two`,
        address: {
          street: `${Math.floor(Math.random() * 9999) + 1} Main Street`,
          city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][i % 5],
          state: ['NY', 'CA', 'IL', 'TX', 'AZ'][i % 5],
          pincode: String(Math.floor(Math.random() * 90000) + 10000),
          type: 'home',
        },
        createdDate: new Date().toISOString(),
        about: `I'm ${userInfo.firstName}, passionate about maintaining good health and wellness.`,
        userType: 'Primary',
        subscription: i < 3 ? 'Premium' : 'Free', // First 3 users have Premium
        members: [],
        reports: [],
        sharedReports: [],
        sharedWith: [],
        sharedMembers: [],
        diagnosedCondition: diagnosedConditions,
        healthTopics,
        bmi: bmiEntries,
        anthopometric,
        muac,
        foodAllergies,
        articles: [],
        notification: [],
        activities: [],
        isPediatric: false,
        isDoctor: false,
      };
      
      const profileResponse = await fetch(`${BASE_URL}/api/profile/insertProfile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      
      if (!profileResponse.ok) {
        const error = await profileResponse.text();
        console.log(`   ⚠️  Profile creation skipped: ${error}`);
      } else {
        const profile = await profileResponse.json();
        profiles.push(profile);
        console.log(`   ✅ Profile created: ${profile._id}`);
        console.log(`      - BMI entries: ${bmiEntries.length}`);
        console.log(`      - Conditions: ${diagnosedConditions.length}`);
        console.log(`      - Health topics: ${healthTopics.length}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Profile creation error: ${error.message}`);
    }
    
    // 9. Generate family members (2-4 members per user)
    const numMembers = Math.floor(Math.random() * 3) + 2;
    const memberProfiles = [];
    
    for (let j = 0; j < numMembers; j++) {
      const relation = getRandomElement(FAMILY_RELATIONS);
      const memberGender = relation.gender || (Math.random() > 0.5 ? 'male' : 'female');
      const memberFirstName = getRandomElement(FAMILY_MEMBER_NAMES[memberGender]);
      const memberLastName = userInfo.lastName; // Same last name for family
      const memberDOB = generateDOB(
        relation.relation === 'Son' || relation.relation === 'Daughter' ? 5 : 30,
        relation.relation === 'Son' || relation.relation === 'Daughter' ? 18 : 80
      );
      const memberPhone = `+1555555${String(1000 + i * 10 + j).padStart(4, '0')}`;
      const memberEmail = generateEmail(memberFirstName, memberLastName, i * 10 + j);
      
      // Create member profile
      try {
        const memberProfileData = {
          phoneNumber: memberPhone,
          firstName: memberFirstName,
          lastName: memberLastName,
          email: memberEmail,
          gender: memberGender,
          bloodGroup: getRandomElement(BLOOD_GROUPS),
          dob: memberDOB.toISOString(),
          bio: `${relation.relation} of ${userInfo.firstName}`,
          address: {
            street: `${Math.floor(Math.random() * 9999) + 1} Main Street`,
            city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][i % 5],
            state: ['NY', 'CA', 'IL', 'TX', 'AZ'][i % 5],
            pincode: String(Math.floor(Math.random() * 90000) + 10000),
            type: 'home',
          },
          createdDate: new Date().toISOString(),
          about: `Family member: ${relation.relation}`,
          userType: 'Member',
          subscription: 'Free',
          members: [],
          reports: [],
          sharedReports: [],
          sharedWith: [],
          sharedMembers: [],
          diagnosedCondition: Math.random() > 0.5 ? [{
            condition: getRandomElement(CONDITIONS),
            date: getRandomDate(new Date(2022, 0, 1), new Date()),
          }] : [],
          healthTopics: getRandomElements(HEALTH_TOPICS, Math.floor(Math.random() * 3) + 1),
          bmi: [generateBMIEntry(), generateBMIEntry()],
          anthopometric: [],
          muac: [],
          foodAllergies: Math.random() > 0.7 ? [{
            foodItem: getRandomElement(FOOD_ALLERGIES),
            updatedDate: new Date(),
            comment: [],
          }] : [],
          articles: [],
          notification: [],
          activities: [],
          isPediatric: relation.relation === 'Son' || relation.relation === 'Daughter',
          isDoctor: false,
        };
        
        const memberProfileResponse = await fetch(`${BASE_URL}/api/profile/insertProfile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(memberProfileData),
        });
        
        if (memberProfileResponse.ok) {
          const memberProfile = await memberProfileResponse.json();
          memberProfiles.push({
            profile: memberProfile,
            relation: relation.relation,
            phoneNumber: memberPhone,
          });
          console.log(`   ✅ Member created: ${memberFirstName} (${relation.relation})`);
          
          // Generate reports for member
          const numMemberReports = Math.floor(Math.random() * 3) + 1;
          for (let k = 0; k < numMemberReports; k++) {
            const reportDate = getRandomDate(new Date(2023, 0, 1), new Date());
            const report = generateReport(memberPhone, `${memberFirstName} ${memberLastName}`, reportDate);
            
            try {
              const reportResponse = await fetch(`${BASE_URL}/api/reports/insertReport`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(report),
              });
              
              if (reportResponse.ok) {
                const reportData = await reportResponse.json();
                reports.push(reportData.data);
                console.log(`      📄 Report created: ${report.testName}`);
              }
            } catch (error) {
              console.log(`      ⚠️  Report creation error: ${error.message}`);
            }
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Member profile creation error: ${error.message}`);
      }
    }
    
    // 10. Update main profile with members
    if (profiles[i]) {
      try {
        const members = memberProfiles.map(mp => ({
          memberId: mp.profile._id,
          relation: mp.relation,
          phoneNumber: mp.phoneNumber,
          sharedWith: [],
        }));
        
        await fetch(`${BASE_URL}/api/profile/updateProfile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: profiles[i]._id,
            members,
          }),
        });
        
        console.log(`   ✅ Updated profile with ${members.length} members`);
      } catch (error) {
        console.log(`   ⚠️  Profile update error: ${error.message}`);
      }
    }
    
    // 11. Generate reports for main user (3-5 reports)
    const numReports = Math.floor(Math.random() * 3) + 3;
    for (let j = 0; j < numReports; j++) {
      const reportDate = getRandomDate(new Date(2023, 0, 1), new Date());
      const report = generateReport(phoneNumber, `${userInfo.firstName} ${userInfo.lastName}`, reportDate);
      
      try {
        const reportResponse = await fetch(`${BASE_URL}/api/reports/insertReport`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
        });
        
        if (reportResponse.ok) {
          const reportData = await reportResponse.json();
          reports.push(reportData.data);
          console.log(`   📄 Report created: ${report.testName}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Report creation error: ${error.message}`);
      }
    }
    
    // 12. Create shared members (share with other users)
    if (i > 0 && profiles[i] && memberProfiles.length > 0) {
      // Share a member with previous users
      const shareWithUserIndex = Math.floor(Math.random() * i);
      const memberToShare = getRandomElement(memberProfiles);
      const shareType = Math.random() > 0.7 ? 'doctor' : 'acquaintance';
      const status = Math.random() > 0.5 ? 'accepted' : 'pending';
      
      try {
        // Create shared member record
        const sharedMemberResponse = await fetch(`${BASE_URL}/api/members/insertSharedMem`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverName: USER_NAMES[shareWithUserIndex].firstName + ' ' + USER_NAMES[shareWithUserIndex].lastName,
            receiverContact: getRandomPhoneNumber('+15555550100', shareWithUserIndex),
            memberId: memberToShare.profile._id,
            sharedTime: new Date().toISOString(),
            status,
            sharedByName: `${userInfo.firstName} ${userInfo.lastName}`,
            sharedById: profiles[i]._id,
            shareType,
          }),
        });
        
        if (sharedMemberResponse.ok) {
          const sharedMemberData = await sharedMemberResponse.json();
          sharedMembers.push(sharedMemberData);
          console.log(`   🔗 Shared member "${memberToShare.profile.firstName}" with user ${shareWithUserIndex + 1} (${status}, ${shareType})`);
        }
      } catch (error) {
        console.log(`   ⚠️  Shared member creation error: ${error.message}`);
      }
    }
  }
  
  console.log('\n✅ Dummy data generation completed!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Users created: ${users.length}`);
  console.log(`   - Profiles created: ${profiles.length}`);
  console.log(`   - Reports created: ${reports.length}`);
  console.log(`   - Shared members created: ${sharedMembers.length}`);
  console.log(`\n📱 Phone numbers used:`);
  for (let i = 0; i < 10; i++) {
    console.log(`   User ${i + 1}: ${getRandomPhoneNumber('+15555550100', i)}`);
  }
  console.log(`\n💡 Note: Reports from DC app can be fetched from:`);
  const DC_API_BASE_URL = process.env.DC_API_BASE_URL || process.env.NEXT_PUBLIC_DC_API_BASE_URL || 'https://diagnostic.omerald.com';
  console.log(`   ${DC_API_BASE_URL}/api/reports`);
  console.log(`\n   These reports will appear when users' phone numbers match the patient contact in DC reports.`);
}

// Run the script
if (require.main === module) {
  generateDummyData().catch(console.error);
}

module.exports = { generateDummyData };

