import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const dosesSchema = new Schema({
  id: { type: String },
  name: { type: String, required: true },
  vaccine: { type: String, required: true },
  duration: { type: String, required: true },
});

// Check if model already exists to prevent OverwriteModelError in development

const DosesTable =
  mongoose.models.Doses || mongoose.model('Doses', dosesSchema);

export default DosesTable;

