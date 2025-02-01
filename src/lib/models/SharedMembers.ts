import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const sharedMembersSchema = new Schema({
  id: { type: String },
  receiverName: { type: String, required: true },
  receiverContact: { type: String, required: true },
  memberId: { type: String, required: true },
  sharedTime: { type: Date, default: Date.now },
  status: { type: String },
  sharedByName: { type: String },
  sharedById: { type: String },
  shareType: { type: String, enum: ['doctor', 'acquaintance'], default: 'acquaintance' }, // Type of share: doctor or acquaintance
});

// Check if model already exists to prevent OverwriteModelError in development

const SharedMembersTable =
  mongoose.models.SharedMembers ||
  mongoose.model('SharedMembers', sharedMembersSchema);

export default SharedMembersTable;

