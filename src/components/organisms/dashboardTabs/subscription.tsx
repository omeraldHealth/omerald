'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRecoilValue } from 'recoil';
import { profileState } from '@/components/common/recoil/profile';
import { useAuthContext } from '@/components/common/utils/context/auth.context';
import { SUBSCRIPTION_PLANS, SubscriptionTier, getSubscriptionPlan } from '@/lib/utils/subscription';
import { useGetProfileByPhone } from '@/hooks/reactQuery/profile';

export default function Subscription() {
  const [loading, setLoading] = useState<string | null>(null);
  const razorpayScriptLoaded = useRef(false);
  const profileData = useRecoilValue(profileState);
  const { refreshProfile, phoneNumber: authPhoneNumber } = useAuthContext();
  
  // Try to get phone number from multiple sources for the query
  const phoneNumberForQuery = profileData?.phoneNumber || authPhoneNumber;
  const profileQuery = useGetProfileByPhone(phoneNumberForQuery);
  const currentProfile = profileQuery.data || profileData;
  const currentSubscription = (currentProfile?.subscription || 'Free') as SubscriptionTier;
  const currentPlan = getSubscriptionPlan(currentSubscription);

  // Get user phone number from multiple sources (fallback chain)
  const getUserPhoneNumber = (): string | null => {
    const phone = currentProfile?.phoneNumber || 
                   profileData?.phoneNumber || 
                   authPhoneNumber || 
                   null;
    
    if (!phone) {
      console.warn('Phone number not found in any source:', {
        currentProfilePhone: currentProfile?.phoneNumber,
        profileDataPhone: profileData?.phoneNumber,
        authPhoneNumber: authPhoneNumber,
        hasCurrentProfile: !!currentProfile,
        hasProfileData: !!profileData,
      });
    }
    
    return phone;
  };

  useEffect(() => {
    // Load Razorpay script on component mount
    if (!razorpayScriptLoaded.current && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        razorpayScriptLoaded.current = true;
      };
      document.body.appendChild(script);
    }
  }, []);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (razorpayScriptLoaded.current || (window as any).Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        razorpayScriptLoaded.current = true;
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (subscriptionTier: SubscriptionTier, subscriptionAmt: number) => {
    if (subscriptionTier === 'Free') {
      toast.error('You are already on the Free plan');
      return;
    }

    if (currentSubscription === subscriptionTier) {
      toast.error(`You are already subscribed to ${subscriptionTier} plan`);
      return;
    }

    // Prevent downgrades unless subscription expired or payment failed
    if (isDowngrade(subscriptionTier) && !canDowngrade()) {
      toast.error('Downgrade not allowed. You can only downgrade if your current plan has expired or if there was a payment failure.');
      return;
    }

    // Get user phone number with fallbacks
    const userPhoneNumber = getUserPhoneNumber();
    
    if (!userPhoneNumber) {
      console.error('Phone number not found in any source:', {
        currentProfile: currentProfile?.phoneNumber,
        profileData: profileData?.phoneNumber,
        authPhoneNumber: authPhoneNumber,
        currentProfileExists: !!currentProfile,
        profileDataExists: !!profileData,
      });
      toast.error('User phone number not found. Please ensure you are logged in and your profile is complete.');
      return;
    }

    // Validate profile exists
    if (!currentProfile && !profileData) {
      toast.error('User profile not loaded. Please refresh the page and try again.');
      return;
    }

    console.log('Starting payment process:', {
      subscriptionTier,
      subscriptionAmt,
      userId: userPhoneNumber,
      profileId: currentProfile._id,
    });

    setLoading(subscriptionTier);

    try {
      // Load Razorpay script if not already loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Razorpay SDK failed to load. Please check your internet connection.');
        setLoading(null);
        return;
      }

      // Create order
      const orderAmount = subscriptionAmt * 100; // Convert to paise
      console.log('Creating order with amount:', orderAmount, 'paise (₹' + subscriptionAmt + ')');
      
      const result = await axios.post('/api/razorpay/createSubscriptionOrder', {
        amount: orderAmount,
      });

      console.log('Order creation response:', result.data);

      if (!result.data || !result.data.id) {
        console.error('Invalid order response:', result.data);
        toast.error('Failed to create payment order. Please try again.');
        setLoading(null);
        return;
      }

      const { amount, id: order_id, currency } = result.data;
      
      // Validate order data
      if (!order_id || !amount || !currency) {
        console.error('Missing order data:', { order_id, amount, currency });
        toast.error('Invalid order data. Please try again.');
        setLoading(null);
        return;
      }

      // Verify amount matches
      if (parseInt(amount.toString()) !== orderAmount) {
        console.error('Amount mismatch:', { expected: orderAmount, received: amount });
        toast.error('Order amount mismatch. Please try again.');
        setLoading(null);
        return;
      }

      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        toast.error('Razorpay key not configured. Please contact support.');
        setLoading(null);
        return;
      }

      // Verify test mode key format
      if (!razorpayKey.startsWith('rzp_test_') && !razorpayKey.startsWith('rzp_live_')) {
        console.warn('Razorpay key format may be incorrect. Expected format: rzp_test_... or rzp_live_...');
      }

      console.log('Opening Razorpay checkout:', {
        orderId: order_id,
        amount: amount,
        amountString: amount.toString(),
        currency: currency,
        keyPrefix: razorpayKey.substring(0, 8),
        subscriptionTier: subscriptionTier,
        subscriptionAmount: subscriptionAmt,
      });

      // Configure Razorpay checkout options
      const options: any = {
        key: razorpayKey,
        amount: amount.toString(), // Amount in paise as string
        currency: currency,
        name: 'Omerald',
        description: `${subscriptionTier} Subscription`,
        order_id: order_id, // Order ID from Razorpay
        handler: async function (response: any) {
          try {
            console.log('Payment success response (UPI/Card/Other):', response);
            console.log('Payment method:', response.method || 'Unknown');
            console.log('Payment ID:', response.razorpay_payment_id);
            
            // Use the userId captured at payment initiation (closure variable)
            // This ensures we have the userId even if currentProfile changes
            const userId = userPhoneNumber;
            
            console.log('Using userId from closure:', userId);
            
            // Validate required data before sending
            if (!response.razorpay_payment_id) {
              console.error('Missing razorpay_payment_id in response:', response);
              toast.error('Payment response missing payment ID. Please contact support.');
              setLoading(null);
              return;
            }

            if (!response.razorpay_order_id) {
              console.error('Missing razorpay_order_id in response:', response);
              toast.error('Payment response missing order ID. Please contact support.');
              setLoading(null);
              return;
            }

            if (!userId) {
              console.error('Missing user phone number. userId:', userId);
              toast.error('User profile not found. Please refresh and try again.');
              setLoading(null);
              return;
            }

            // Prepare payment data
            // Amount should be in paise (as returned from order creation)
            const paymentAmount = typeof amount === 'string' ? parseInt(amount) : amount;
            
            const paymentData = {
              amount: paymentAmount, // Amount in paise
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature || '',
              subscriptionType: subscriptionTier,
              userId: userId, // Use the captured userId from closure
            };

            console.log('Sending payment data to API:', {
              ...paymentData,
              razorpaySignature: paymentData.razorpaySignature ? 'PRESENT' : 'MISSING',
            });
            
            // Verify payment signature and process subscription upgrade
            const result = await axios.post('/api/razorpay/paySubscriptionOrder', paymentData);

            if (result.status === 200) {
              const expiryDate = result.data?.subscriptionExpiryDate 
                ? new Date(result.data.subscriptionExpiryDate).toLocaleDateString()
                : '1 month from now';
              
              toast.success(
                `Payment successful! Your ${subscriptionTier} subscription is active until ${expiryDate}.`,
                { duration: 5000 }
              );
              
              // Refresh profile to get updated subscription
              await refreshProfile();
              
              // Invalidate all profile-related queries to ensure UI updates immediately
              const { useQueryClient } = require('@tanstack/react-query');
              const queryClient = useQueryClient();
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['getProfileByPhone'] }),
                queryClient.invalidateQueries({ queryKey: ['getProfileByPhoneNumber'] }),
                queryClient.refetchQueries({ queryKey: ['getProfileByPhone', phoneNumberForQuery] }),
              ]);
              
              // Small delay to ensure profile is refreshed
              setTimeout(() => {
                setLoading(null);
              }, 1000);
            } else {
              toast.error('Payment successful but subscription update failed. Please contact support.');
              setLoading(null);
            }
          } catch (error: any) {
            console.error('Error processing payment response:', error);
            const errorMessage = error?.response?.data?.error || 
                                error?.response?.data?.details || 
                                'Failed to update subscription. Please contact support.';
            toast.error(errorMessage, { duration: 5000 });
            setLoading(null);
          }
        },
        prefill: {
          name: `${currentProfile?.firstName || profileData?.firstName || ''} ${currentProfile?.lastName || profileData?.lastName || ''}`.trim() || 'User',
          email: currentProfile?.email || profileData?.email || '',
          contact: userPhoneNumber || '',
        },
        theme: {
          color: '#40189D', // Purple theme to match Omerald branding
        },
        modal: {
          ondismiss: function () {
            console.log('Payment modal dismissed');
            setLoading(null);
          },
        },
        // Enable all payment methods
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
          paylater: true,
        },
      };

      // Open Razorpay's native checkout modal
      const paymentObject = new (window as any).Razorpay(options);
      
      // Add error handlers
      paymentObject.on('payment.failed', function (response: any) {
        console.error('Payment failed - Full response:', response);
        console.error('Payment failed - JSON:', JSON.stringify(response, null, 2));
        
        // Extract detailed error information
        const errorDetails = response.error || {};
        const errorCode = errorDetails.code || response.error?.code;
        const errorDescription = errorDetails.description || response.error?.description;
        const errorReason = errorDetails.reason || response.error?.reason;
        const errorSource = errorDetails.source || response.error?.source;
        const errorStep = errorDetails.step || response.error?.step;
        const errorMetadata = errorDetails.metadata || response.error?.metadata;
        const errorField = errorDetails.field || response.error?.field;
        
        console.error('Payment failure details:', {
          code: errorCode,
          description: errorDescription,
          reason: errorReason,
          source: errorSource,
          step: errorStep,
          field: errorField,
          metadata: errorMetadata,
          fullError: errorDetails,
          fullResponse: response,
        });
        
        // Construct user-friendly error message
        let errorMessage = 'Payment processing failed';
        if (errorDescription) {
          errorMessage = errorDescription;
        } else if (errorReason) {
          errorMessage = errorReason;
        } else if (errorCode) {
          errorMessage = `Payment failed (Error Code: ${errorCode})`;
        }
        
        // Add helpful hints for common test mode issues
        if (errorCode === 'BAD_REQUEST_ERROR' || errorSource === 'gateway' || errorField) {
          errorMessage += '. Please ensure you are using test mode cards: Visa (4111 1111 1111 1111) or Mastercard (5267 3181 8797 5449)';
        }
        
        toast.error(errorMessage, { duration: 5000 });
        setLoading(null);
      });

      paymentObject.on('payment.authorized', function (response: any) {
        console.log('Payment authorized:', response);
      });

      paymentObject.on('payment.captured', function (response: any) {
        console.log('Payment captured:', response);
      });

      // Handle other errors
      paymentObject.on('error', function (error: any) {
        console.error('Razorpay error - Full error object:', error);
        console.error('Razorpay error - JSON:', JSON.stringify(error, null, 2));
        
        const errorMessage = error?.error?.description || 
                            error?.error?.reason || 
                            error?.description || 
                            error?.message || 
                            'An error occurred during payment';
        
        console.error('Razorpay error details:', {
          error: error?.error,
          message: error?.message,
          description: error?.description,
          code: error?.code,
          fullError: error,
        });
        
        toast.error(errorMessage, { duration: 5000 });
        setLoading(null);
      });

      paymentObject.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error?.response?.data?.error || error?.message || 'Payment failed. Please try again.');
      setLoading(null);
    }
  };

  const isCurrentPlan = (tier: SubscriptionTier) => {
    return currentSubscription === tier;
  };

  const isUpgrade = (tier: SubscriptionTier) => {
    const tierOrder = { Free: 0, Premium: 1, Enterprise: 2 };
    return tierOrder[tier] > tierOrder[currentSubscription];
  };

  const isDowngrade = (tier: SubscriptionTier) => {
    const tierOrder = { Free: 0, Premium: 1, Enterprise: 2 };
    return tierOrder[tier] < tierOrder[currentSubscription];
  };

  // Check if subscription has expired
  const isSubscriptionExpired = () => {
    if (!currentProfile?.subscriptionExpiryDate) {
      return false; // No expiry date means it's not a paid plan or it's free
    }
    const expiryDate = new Date(currentProfile.subscriptionExpiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only
    expiryDate.setHours(0, 0, 0, 0);
    return expiryDate < today;
  };

  // Check if downgrade is allowed (only if expired or payment failure)
  const canDowngrade = () => {
    // Allow downgrade if subscription has expired
    if (isSubscriptionExpired()) {
      return true;
    }
    // For now, we'll allow downgrade if user explicitly wants to go to Free plan
    // Payment failures would need to be tracked separately
    // You can add payment failure check here if you have that data
    return false;
  };

  // Check if a plan selection should be disabled
  const isPlanDisabled = (tier: SubscriptionTier) => {
    // Don't disable current plan
    if (isCurrentPlan(tier)) {
      return false;
    }
    // Disable downgrades unless subscription expired or payment failed
    if (isDowngrade(tier)) {
      return !canDowngrade();
    }
    return false;
  };

  // Get disabled reason message
  const getDisabledReason = (tier: SubscriptionTier) => {
    if (isDowngrade(tier) && !canDowngrade()) {
      return 'Downgrade not allowed. You can only downgrade if your current plan has expired or if there was a payment failure.';
    }
    return '';
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 relative overflow-hidden">
      {/* Razorpay Background Branding - Large Background */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 opacity-40 -z-0"></div>
      <div className="absolute top-10 right-10 w-64 h-64 bg-[#3395FF] opacity-5 rounded-full blur-3xl -z-0"></div>
      <div className="absolute top-20 left-10 w-48 h-48 bg-purple-400 opacity-5 rounded-full blur-3xl -z-0"></div>
      
      {/* Razorpay Header Branding */}
      <div className="relative z-10 mb-8">
        <div className="flex items-center justify-center mb-6 pt-4 hidden">
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-8 py-4 rounded-2xl shadow-lg border-2 border-[#3395FF]/20">
            <div className="flex items-center gap-3">
              {/* Razorpay Logo SVG */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <rect width="24" height="24" rx="4" fill="#3395FF"/>
                <path d="M12 6L6 9L12 12L18 9L12 6Z" fill="white"/>
                <path d="M6 15L12 18L18 15V12L12 15L6 12V15Z" fill="white"/>
              </svg>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 leading-tight">Secured Payments by</span>
                <span className="text-xl font-bold text-[#3395FF] leading-tight">Razorpay</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Plans</h1>
          <p className="text-gray-600">Choose the plan that best fits your needs</p>
        </div>
        
        {currentPlan && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
            <p className="text-sm text-gray-700 text-center">
              <span className="font-semibold">Current Plan:</span> {currentPlan.name}
              {currentPlan.price > 0 && <span className="ml-2">(₹{currentPlan.price}/month)</span>}
            </p>
          </div>
        )}
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = isCurrentPlan(plan.tier);
          const isUpgradeOption = isUpgrade(plan.tier);
          const isLoading = loading === plan.tier;
          const isDisabled = isPlanDisabled(plan.tier);
          const disabledReason = getDisabledReason(plan.tier);

          return (
            <div
              key={plan.tier}
              className={`relative rounded-2xl shadow-lg border-2 transition-all duration-300 ${
                isCurrent
                  ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50 scale-105'
                  : isDisabled
                  ? 'border-gray-300 bg-gray-50 opacity-75'
                  : 'border-gray-200 bg-white hover:shadow-xl hover:border-purple-300'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="p-6 lg:p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">₹{plan.price}</span>
                    <span className="text-gray-600 ml-2">/month</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePayment(plan.tier, plan.price)}
                  disabled={isCurrent || isLoading || isDisabled}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    isCurrent
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : isDisabled
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isLoading
                      ? 'bg-purple-400 text-white cursor-wait'
                      : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg transform hover:scale-105'
                  }`}
                  title={isDisabled ? disabledReason : ''}
                >
                  {isLoading
                    ? 'Processing...'
                    : isCurrent
                    ? 'Current Plan'
                    : isDisabled
                    ? 'Downgrade Not Allowed'
                    : isUpgradeOption
                    ? `Upgrade to ${plan.name}`
                    : plan.price === 0
                    ? 'Select Free'
                    : `Subscribe to ${plan.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 mt-12 p-6 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Plan Comparison</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Secured by</span>
            <span className="font-semibold text-[#3395FF]">Razorpay</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Feature</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Free</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Premium</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-4 text-gray-700">Members Limit</td>
                <td className="text-center py-3 px-4">5</td>
                <td className="text-center py-3 px-4">50</td>
                <td className="text-center py-3 px-4">300</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-4 text-gray-700">Reports Limit</td>
                <td className="text-center py-3 px-4">25</td>
                <td className="text-center py-3 px-4">300</td>
                <td className="text-center py-3 px-4">1000</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-4 text-gray-700">Analytics</td>
                <td className="text-center py-3 px-4">❌</td>
                <td className="text-center py-3 px-4">✅</td>
                <td className="text-center py-3 px-4">✅</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-700">Price</td>
                <td className="text-center py-3 px-4 font-semibold">₹0/month</td>
                <td className="text-center py-3 px-4 font-semibold">₹50/month</td>
                <td className="text-center py-3 px-4 font-semibold">₹100/month</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
