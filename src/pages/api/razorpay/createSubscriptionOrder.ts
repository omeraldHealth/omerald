import { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_SECRET_ID;

    if (!keyId || !keySecret) {
      console.error('Razorpay credentials missing:', { hasKeyId: !!keyId, hasKeySecret: !!keySecret });
      return res.status(500).json({ 
        error: 'Razorpay configuration error. Please check your environment variables.' 
      });
    }

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Validate amount
    const amount = parseInt(req.body.amount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      console.error('Invalid amount:', req.body.amount);
      return res.status(400).json({ 
        error: 'Invalid amount. Amount must be a positive number in paise.' 
      });
    }

    // Minimum amount check (Razorpay requires minimum 1 INR = 100 paise)
    if (amount < 100) {
      console.error('Amount too low:', amount);
      return res.status(400).json({ 
        error: 'Amount must be at least ₹1 (100 paise)' 
      });
    }

    const options = {
      amount: amount,
      currency: 'INR',
      receipt: `sub_${Date.now()}`, // Optional: Add receipt ID for tracking
    };

    console.log('Creating Razorpay order with options:', { 
      amount: options.amount, 
      currency: options.currency,
      receipt: options.receipt,
    });

    const order = await instance.orders.create(options);
    
    if (!order || !order.id) {
      console.error('Failed to create Razorpay order - invalid response:', order);
      return res.status(500).json({ error: 'Error occurred creating order' });
    }

    console.log('Razorpay order created successfully:', {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    });
    
    return res.status(201).json(order);
  } catch (error: any) {
    console.error('Error creating Razorpay order:', {
      message: error.message,
      description: error.description,
      field: error.field,
      source: error.source,
      step: error.step,
      reason: error.reason,
      metadata: error.metadata,
    });
    
    return res.status(500).json({ 
      error: error.message || 'Failed to create payment order',
      details: error.description || error.reason,
    });
  }
};

