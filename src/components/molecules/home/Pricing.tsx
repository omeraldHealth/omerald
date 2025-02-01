'use client';

import React, { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import {
  HeaderText,
  ParagraphText,
  SmallHeaderText,
} from '@/components/atoms/typograph';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useRecoilValue } from 'recoil';
import { profileState } from '@/components/common/recoil/profile';

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const profileData = useRecoilValue(profileState);
  
  const handlePayment = (subscriptionAmt: number, subscriptionType: string) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onerror = () => {
      alert('Razorpay SDK failed to load. Are you online?');
    };
    script.onload = async () => {
      try {
        setLoading(true);
  
        const result = await axios.post(
          '/api/razorpay/createSubscriptionOrder',
          {
            amount: (subscriptionAmt * 100),
          }
        );
        const { amount, id: order_id, currency } = result.data;
        const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

        const options = {
          key: razorpayKey,
          amount: amount.toString(),
          currency: currency,
          name: 'Omerald',
          description: subscriptionType,
          order_id: order_id,
          handler: async function (response: any) {
            const result = await axios.post(
              '/api/razorpay/paySubscriptionOrder',
              {
                amount: amount,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
                subscriptionType: subscriptionType,
                userId: profileData?.phoneNumber,
              }
            );
            if (result.status === 201) {
              toast.success('Your payment is successful');
            }
          },
          prefill: {
            name: `${profileData?.firstName || ''} ${profileData?.lastName || ''}`,
            email: profileData?.email,
            contact: profileData?.phoneNumber,
          },
        };
        setLoading(false);
        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();
      } catch (err: any) {
        toast.error(err?.message || 'Payment failed');
        setLoading(false);
      }
    };
    document.body.appendChild(script);
  };

  return (
    <section className="bg-blue-100 bg-opacity-20 py-6">
      <HeaderText style="text-center">
        Free for Now!
      </HeaderText>
    </section>
  );
}

