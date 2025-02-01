import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const userSchema = new Schema({
  id: { type: String },
  uid: { type: String, required: true, index: true },
  phoneNumber: { type: String, required: true, unique: true },
  role: { type: String, default: 'user' },
  profileId: { type: String },
});

// Check if model already exists to prevent OverwriteModelError in development

const UserTable = mongoose.models.User || mongoose.model('User', userSchema);

export default UserTable;

