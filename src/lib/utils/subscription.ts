export type SubscriptionTier = 'Free' | 'Premium' | 'Enterprise';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number; // in rupees per month
  membersLimit: number;
  reportsLimit: number;
  hasAnalytics: boolean;
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: 'Free',
    name: 'Free',
    price: 0,
    membersLimit: 5,
    reportsLimit: 25,
    hasAnalytics: false,
    features: [
      'Up to 5 members',
      'Up to 25 reports',
      'Basic health tracking',
      'Report storage',
    ],
  },
  {
    tier: 'Premium',
    name: 'Premium',
    price: 50,
    membersLimit: 50,
    reportsLimit: 300,
    hasAnalytics: true,
    features: [
      'Up to 50 members',
      'Up to 300 reports',
      'Advanced analytics',
      'Priority support',
      'All Free features',
    ],
  },
  {
    tier: 'Enterprise',
    name: 'Enterprise',
    price: 100,
    membersLimit: 300,
    reportsLimit: 1000,
    hasAnalytics: true,
    features: [
      'Up to 300 members',
      'Up to 1000 reports',
      'Advanced analytics',
      'Priority support',
      'All Premium features',
    ],
  },
];

export function getSubscriptionPlan(tier: SubscriptionTier | string): SubscriptionPlan {
  return SUBSCRIPTION_PLANS.find(plan => plan.tier === tier) || SUBSCRIPTION_PLANS[0];
}

export function getMembersLimit(subscription: SubscriptionTier | string): number {
  return getSubscriptionPlan(subscription).membersLimit;
}

export function getReportsLimit(subscription: SubscriptionTier | string): number {
  return getSubscriptionPlan(subscription).reportsLimit;
}

export function hasAnalyticsAccess(subscription: SubscriptionTier | string): boolean {
  return getSubscriptionPlan(subscription).hasAnalytics;
}

export function canAddMember(
  currentMembersCount: number,
  subscription: SubscriptionTier | string
): boolean {
  const limit = getMembersLimit(subscription);
  return currentMembersCount < limit;
}

export function canAddReport(
  currentReportsCount: number,
  subscription: SubscriptionTier | string
): boolean {
  const limit = getReportsLimit(subscription);
  return currentReportsCount < limit;
}







