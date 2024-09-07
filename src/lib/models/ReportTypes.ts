import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const reportTypesSchema = new Schema({
  id: { type: String },
  testName: { type: String, required: true },
  keywords: [{ keyword: String, alias: Array }],
  description: { type: String, required: true },
});

// Check if model already exists to prevent OverwriteModelError in development

const ReportTypesTable =
  mongoose.models.tests || mongoose.model('tests', reportTypesSchema);

export default ReportTypesTable;

