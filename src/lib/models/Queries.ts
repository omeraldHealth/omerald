import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const querySchema = new Schema({
  id: { type: String },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  message: { type: String, required: true },
});

// Check if model already exists to prevent OverwriteModelError in development

const QueryTable =
  mongoose.models['User Query'] || mongoose.model('User Query', querySchema);

export default QueryTable;

