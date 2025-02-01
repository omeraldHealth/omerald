import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const keywordsSchema = new Schema({
  id: { type: String },
  keyword: { type: String, required: true },
  aliases: [{ type: String }],
});

// Check if model already exists to prevent OverwriteModelError in development

const KeywordsTable =
  mongoose.models.keyWords || mongoose.model('keyWords', keywordsSchema);

export default KeywordsTable;

