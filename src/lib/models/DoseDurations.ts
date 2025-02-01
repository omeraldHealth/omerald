import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const doseDurationSchema = new Schema({
  id: { type: String },
  duration: { type: String, required: true },
});

// Check if model already exists to prevent OverwriteModelError in development
const DoseDurationsTable =
  (mongoose.models.DoseDurations as mongoose.Model<any>) ||
  mongoose.model('DoseDurations', doseDurationSchema);

export default DoseDurationsTable;

