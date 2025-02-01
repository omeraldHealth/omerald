import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const profileSchema = new Schema({
  id: { type: String },
  phoneNumber: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    required: [true, 'Email address is required'],
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other'],
  },
  bloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
  },
  dob: { type: Date, required: true },
  bio: { type: String, default: '' },
  address: {
    id: { type: String },
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '0001' },
    type: { type: String, default: 'home' },
  },
  createdDate: { type: Date },
  about: { type: String },
  profileUrl: { type: String },
  members: [
    {
      memberId: { type: String },
      relation: { type: String },
      phoneNumber: { type: String },
      sharedWith: [{ type: String }], // Array of profile IDs this member is shared with
    },
  ],
  userType: { type: String, default: 'Primary' },
  subscription: { type: String, default: 'Free' },
  subscriptionStartDate: { type: Date },
  subscriptionExpiryDate: { type: Date },
  articles: [{ type: Object }],
  reports: { type: Array },
  sharedReports: [{ type: String }],
  sharedWith: [
    {
      sharedProfileId: { type: String },
      name: { type: String },
      phoneNumber: { type: String },
    },
  ],
  sharedMembers: [
    {
      id: { type: String }, // Profile ID of the shared member
      memberId: { type: String }, // Member ID that was shared
      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
      sharedBy: { type: String }, // Profile ID of the person who shared
      sharedByName: { type: String }, // Name of the person who shared
      sharedByPhone: { type: String }, // Phone of the person who shared
      phoneNumber: { type: String }, // Phone number (for pending shares when user not found)
      shareType: { type: String, enum: ['doctor', 'acquaintance'], default: 'acquaintance' }, // Type of share: doctor or acquaintance
      createdAt: { type: Date, default: Date.now },
    },
  ],
  diagnosedCondition: [
    {
      condition: { type: String },
      date: { type: Date, default: Date.now },
    },
  ],
  healthTopics: [
    {
      topic: { type: String },
      noOfBlogs: { type: Number },
      topicUrl: { type: String },
    },
  ],
  bmi: [
    {
      height: { type: Number },
      weight: { type: Number },
      bmi: { type: Number },
      updatedDate: { type: Date },
      comment: [
        {
          text: { type: String },
          time: { type: Date, default: Date.now },
          user: { type: String },
        },
      ],
    },
  ],
  anthopometric: [
    {
      anthopometric: { type: Number },
      updatedDate: { type: Date },
      comment: [
        {
          text: { type: String },
          time: { type: Date, default: Date.now },
          user: { type: String },
        },
      ],
    },
  ],
  muac: [
    {
      height: { type: Number },
      updatedDate: { type: Date },
      comment: [
        {
          text: { type: String },
          time: { type: Date, default: Date.now },
          user: { type: String },
        },
      ],
    },
  ],
  foodAllergies: [
    {
      foodItem: { type: String },
      updatedDate: { type: Date },
      comment: [
        {
          text: { type: String },
          time: { type: Date, default: Date.now },
          user: { type: String },
        },
      ],
    },
  ],
  iapGrowthCharts: [
    {
      age: { type: Number },
      weight: { type: Number },
      height: { type: Number },
      date: { type: Date },
      comment: [
        {
          text: { type: String },
          time: { type: Date, default: Date.now },
          user: { type: String },
        },
      ],
    },
  ],
  notification: [
    {
      id: { type: String },
      title: { type: String },
      message: { type: String },
    },
  ],
  activities: [
    {
      id: { type: String },
      action: { type: String },
      actionContent: { type: String },
      actionTime: { type: Date, default: Date.now },
      actionBy: { type: String },
      actionFor: { type: String },
    },
  ],
  isPediatric: { type: Boolean, default: false },
  isDoctor: { type: Boolean, default: false },
  doctorApproved: { type: Boolean, default: false },
  doctorCertificate: { type: String, default: '' },
  bodyImpactAnalysis: {
    lastAnalyzedAt: { type: Date },
    bodyParts: [
      {
        partId: { type: String },
        partName: { type: String },
        severity: { type: String, enum: ['low', 'medium', 'high'] },
        impactDescription: { type: String },
        relatedConditions: [{ type: String }],
        relatedParameters: [{ type: String }],
        confidence: { type: Number, min: 0, max: 1 },
        lastUpdated: { type: Date, default: Date.now },
      },
    ],
    analysisMetadata: {
      modelVersion: { type: String, default: '1.0' },
      totalConditionsAnalyzed: { type: Number, default: 0 },
      totalParametersAnalyzed: { type: Number, default: 0 },
    },
  },
  vaccineCompletions: {
    type: Schema.Types.Mixed,
    default: {},
  },
});

// Check if model already exists to prevent OverwriteModelError in development

const ProfileTable =
  mongoose.models.Profile || mongoose.model('Profile', profileSchema);

export default ProfileTable;

