import { useQuery } from '@tanstack/react-query';

export type UserSettingItem = {
  _id: string;
  FAQs?: string;
  Privacy_Policy?: string;
  Terms_Of_Service?: string;
  Platform_Consent?: string;
  Disclaimer?: string;
  Customer_Support?: string;
};

const USER_SETTING_STALE_TIME = 30 * 60 * 1000; // 30 minutes
const USER_SETTING_GC_TIME = 60 * 60 * 1000; // 1 hour

function isRichContent(value: string | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.length > 200 || value.includes('<h2') || value.includes('<p>');
}

/** Pick the "primary" setting record (first with rich HTML content, else first) */
export function getPrimaryUserSetting(items: UserSettingItem[]): UserSettingItem | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const rich = items.find((s) => isRichContent(s.FAQs) || isRichContent(s.Privacy_Policy));
  return rich ?? items[0] ?? null;
}

async function fetchAllUserSettings(): Promise<UserSettingItem[]> {
  const res = await fetch('/api/userSetting/getAllUserSetting');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function useUserSettings() {
  const query = useQuery({
    queryKey: ['userSettings'],
    queryFn: fetchAllUserSettings,
    staleTime: USER_SETTING_STALE_TIME,
    gcTime: USER_SETTING_GC_TIME,
    refetchOnWindowFocus: false,
  });

  const primary = query.data ? getPrimaryUserSetting(query.data) : null;

  return {
    ...query,
    primary,
    faqsHtml: primary?.FAQs ?? '',
    privacyPolicyHtml: primary?.Privacy_Policy ?? '',
    termsOfServiceHtml: primary?.Terms_Of_Service ?? '',
    platformConsentHtml: primary?.Platform_Consent ?? '',
    disclaimerHtml: primary?.Disclaimer ?? '',
    customerSupportHtml: primary?.Customer_Support ?? '',
  };
}
