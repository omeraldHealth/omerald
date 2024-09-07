import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const healthTopicsSchema = new Schema({
  id: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  active: { type: Boolean, default: false },
});

// Check if model already exists to prevent OverwriteModelError in development

const HealthTopicsTable =
  mongoose.models.HealthTopics ||
  mongoose.model('HealthTopics', healthTopicsSchema);

export default HealthTopicsTable;

