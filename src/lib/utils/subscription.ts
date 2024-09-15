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

/** Use for entitlements (limits, badge, analytics). Prefers effectiveSubscription when user is a member of an Enterprise/Premium primary. */
export function getEffectiveSubscription(profile: { subscription?: string; effectiveSubscription?: string } | null | undefined): SubscriptionTier | string {
  return (profile as any)?.effectiveSubscription ?? profile?.subscription ?? 'Free';
}

/** Source of effective subscription when inherited from a primary (Enterprise/Premium owner). */
export interface EffectiveSubscriptionSource {
  primaryProfileId: string;
  primaryFirstName: string;
  primaryLastName: string;
  primaryPhoneNumber: string;
  primaryName: string;
}

export function getEffectiveSubscriptionSource(profile: { effectiveSubscriptionSource?: EffectiveSubscriptionSource } | null | undefined): EffectiveSubscriptionSource | null {
  return (profile as any)?.effectiveSubscriptionSource ?? null;
}

/** Members limit for the user: uses effectiveMembersLimit when set (sublimit for inherited plan), else full limit for their effective tier. */
export function getEffectiveMembersLimit(profile: { effectiveMembersLimit?: number; subscription?: string; effectiveSubscription?: string } | null | undefined): number {
  const p = profile as any;
  if (p?.effectiveMembersLimit != null && typeof p.effectiveMembersLimit === 'number') {
    return p.effectiveMembersLimit;
  }
  return getMembersLimit(getEffectiveSubscription(profile));
}

/** Reports limit for the user: uses effectiveReportsLimit when set (sublimit for inherited plan), else full limit for their effective tier. */
export function getEffectiveReportsLimit(profile: { effectiveReportsLimit?: number; subscription?: string; effectiveSubscription?: string } | null | undefined): number {
  const p = profile as any;
  if (p?.effectiveReportsLimit != null && typeof p.effectiveReportsLimit === 'number') {
    return p.effectiveReportsLimit;
  }
  return getReportsLimit(getEffectiveSubscription(profile));
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
  subscriptionOrLimit: SubscriptionTier | string | number
): boolean {
  const limit = typeof subscriptionOrLimit === 'number' ? subscriptionOrLimit : getMembersLimit(subscriptionOrLimit);
  return currentMembersCount < limit;
}

export function canAddReport(
  currentReportsCount: number,
  subscriptionOrLimit: SubscriptionTier | string | number
): boolean {
  const limit = typeof subscriptionOrLimit === 'number' ? subscriptionOrLimit : getReportsLimit(subscriptionOrLimit);
  return currentReportsCount < limit;
}







