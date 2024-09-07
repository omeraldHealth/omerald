import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const vaccinesSchema = new Schema({
  id: { type: String },
  name: { type: String, required: true },
});

// Check if model already exists to prevent OverwriteModelError in development

const VaccinesTable =
  mongoose.models.Vaccines || mongoose.model('Vaccines', vaccinesSchema);

export default VaccinesTable;

