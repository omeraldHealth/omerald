import { NextApiRequest, NextApiResponse } from 'next';
import connectDBMiddleware from '@/lib/middleware/connectDB';
import SubscriptionTable from '@/lib/models/SubscriptionOrder';
import ProfileTable from '@/lib/models/Profile';
import crypto from 'crypto';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Received payment request body:', req.body);
    
    const {
      amount,
      subscriptionType,
      userId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    // Check each field individually to provide specific error messages
    const missingFields = [];
    if (!amount) missingFields.push('amount');
    if (!subscriptionType) missingFields.push('subscriptionType');
    if (!userId) missingFields.push('userId');
    if (!razorpayOrderId) missingFields.push('razorpayOrderId');
    if (!razorpayPaymentId) missingFields.push('razorpayPaymentId');

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      console.error('Received data:', {
        amount: amount || 'MISSING',
        subscriptionType: subscriptionType || 'MISSING',
        userId: userId || 'MISSING',
        razorpayOrderId: razorpayOrderId || 'MISSING',
        razorpayPaymentId: razorpayPaymentId || 'MISSING',
        razorpaySignature: razorpaySignature || 'MISSING',
      });
      return res.status(400).json({ 
        error: 'Missing required fields',
        missingFields: missingFields,
        received: {
          hasAmount: !!amount,
          hasSubscriptionType: !!subscriptionType,
          hasUserId: !!userId,
          hasRazorpayOrderId: !!razorpayOrderId,
          hasRazorpayPaymentId: !!razorpayPaymentId,
        }
      });
    }

    // Verify payment signature
    if (razorpaySignature) {
      const razorpaySecret = process.env.RAZORPAY_SECRET_ID || '';
      const text = `${razorpayOrderId}|${razorpayPaymentId}`;
      const generatedSignature = crypto
        .createHmac('sha256', razorpaySecret)
        .update(text)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        console.error('Signature verification failed', {
          generated: generatedSignature,
          received: razorpaySignature,
        });
        return res.status(400).json({ error: 'Invalid payment signature' });
      }
    }

    console.log('Processing payment:', {
      amount,
      subscriptionType,
      userId,
      razorpayOrderId,
      razorpayPaymentId,
    });

    // Validate amount is a number
    const paymentAmount = typeof amount === 'string' ? parseInt(amount) : amount;
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      console.error('Invalid amount:', amount);
      return res.status(400).json({ error: 'Invalid amount value' });
    }

    // Calculate subscription dates (1 month from now)
    const subscriptionStartDate = new Date();
    const subscriptionExpiryDate = new Date();
    subscriptionExpiryDate.setMonth(subscriptionExpiryDate.getMonth() + 1);

    console.log('Subscription dates:', {
      startDate: subscriptionStartDate,
      expiryDate: subscriptionExpiryDate,
    });

    // Detect payment method from Razorpay payment ID (if available)
    // For UPI payments, we can check the payment method in Razorpay dashboard
    // For now, we'll set it based on common patterns or leave it null
    const paymentMethod = 'UPI'; // Default to UPI, can be updated based on Razorpay payment details

    // Save subscription order
    const subscriptionObject = new SubscriptionTable({
      isPaid: true,
      amount: paymentAmount,
      subscriptionType,
      userId,
      subscriptionStartDate,
      subscriptionExpiryDate,
      paymentMethod,
      razorpay: {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature || '',
      },
    });

    const orders = await subscriptionObject.save();
    console.log('Subscription order saved:', {
      orderId: orders._id,
      subscriptionType,
      startDate: subscriptionStartDate,
      expiryDate: subscriptionExpiryDate,
    });

    // Update user's subscription in profile
    try {
      const profile = await ProfileTable.findOne({ phoneNumber: userId });
      if (profile) {
        console.log('Updating profile subscription:', {
          profileId: profile._id,
          oldSubscription: profile.subscription,
          oldExpiryDate: profile.subscriptionExpiryDate,
          newSubscription: subscriptionType,
          newExpiryDate: subscriptionExpiryDate,
        });
        
        profile.subscription = subscriptionType;
        profile.subscriptionStartDate = subscriptionStartDate;
        profile.subscriptionExpiryDate = subscriptionExpiryDate;
        
        await profile.save();
        console.log('Profile subscription updated successfully:', {
          subscription: profile.subscription,
          expiryDate: profile.subscriptionExpiryDate,
        });
      } else {
        console.warn('Profile not found for userId:', userId);
        return res.status(404).json({ error: 'Profile not found' });
      }
    } catch (profileError: any) {
      console.error('Error updating profile subscription:', profileError);
      // Don't fail the request if profile update fails, but log it
      return res.status(500).json({ 
        error: 'Payment successful but failed to update subscription',
        details: profileError.message 
      });
    }

    return res.status(200).json({
      ...orders.toObject(),
      subscriptionStartDate: subscriptionStartDate,
      subscriptionExpiryDate: subscriptionExpiryDate,
      message: `Subscription upgraded to ${subscriptionType} for 1 month`,
    });
  } catch (error: any) {
    console.error('Error processing payment:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    return res.status(500).json({ error: error.message || 'Failed to process payment' });
  }
};

export default connectDBMiddleware(handler);

