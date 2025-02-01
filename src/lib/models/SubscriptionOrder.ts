import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const subscriptionOrderSchema = new Schema({
  isPaid: { type: Boolean },
  amount: { type: Number },
  userId: { type: String },
  subscriptionType: { type: String },
  subscriptionStartDate: { type: Date },
  subscriptionExpiryDate: { type: Date },
  paymentMethod: { type: String }, // UPI, Card, Netbanking, Wallet, PayLater
  razorpay: {
    orderId: { type: String },
    paymentId: { type: String },
    signature: { type: String },
  },
  createdAt: { type: Date, default: Date.now },
});

// Check if model already exists to prevent OverwriteModelError in development

const SubscriptionTable =
  mongoose.models.subscriptionOrder ||
  mongoose.model('subscriptionOrder', subscriptionOrderSchema);

export default SubscriptionTable;

