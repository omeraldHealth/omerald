import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const reportsSchema = new Schema({
  id: { type: String },
  userId: { type: String, required: true, index: true },
  userName: { type: String },
  reportId: { type: String, unique: true, index: true },
  originalReportId: { type: String, index: true }, // Reference to original report if this is an accepted shared report
  reportUrl: { type: String },
  sharedWith: [
    {
      profileId: { type: String },
      phoneNumber: { type: String },
      name: { type: String },
      sharedAt: { type: Date, default: Date.now },
    },
  ],
  reportDate: { type: Date, index: true },
  status: { type: String, default: 'pending' },
  parsedData: [
    {
      keyword: { type: String },
      value: { type: String },
      unit: { type: String },
      normalRange: { type: String },
    },
  ],
  // Parameters extracted from report (following DC parameter schema)
  parameters: [
    {
      name: { type: String },
      value: { type: Schema.Types.Mixed }, // Can be string or number
      units: { type: String },
      bioRefRange: { type: Schema.Types.Mixed }, // Can be object or string
      subText: { type: String },
      description: { type: String },
    },
  ],
  // Flag to track if report has been scanned for parameters
  parametersScanned: { type: Boolean, default: false },
  documentType: { type: String },
  conditions: [{ type: String }],
  testName: { type: String },
  updatedTime: { type: Date, default: Date.now },
  name: { type: String },
  type: { type: String },
  uploadedAt: { type: Date },
  uploadDate: { type: Date, default: Date.now },
  diagnosticCenter: { type: String },
  remarks: { type: String },
  description: { type: String },
  createdBy: { type: String },
  updatedBy: { type: String },
  reportDoc: { type: String },
});

// Check if model already exists to prevent OverwriteModelError in development

const ReportsTable =
  mongoose.models.Reports || mongoose.model('Reports', reportsSchema);

export default ReportsTable;

