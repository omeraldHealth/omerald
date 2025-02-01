import { OnboardForm } from '@/components/organisms/onboardForm';
import { UserLayout } from '@/components/templates/layouts/UserLayout';
import { Spinner } from '@/components/atoms/loader';
import { useAuthContext } from '@/components/common/utils/context/auth.context';

export default function Onboard() {
  const { user, isProfileLoading, phoneNumber } = useAuthContext();

  if (isProfileLoading || !user || !phoneNumber) {
    return (
      <UserLayout
        tabName="Omerald | Onboarding"
        tabDescription="Complete your profile to get started"
      >
        <Spinner message="Loading your profile..." />
      </UserLayout>
    );
  }

  return (
    <UserLayout
      tabName="Omerald | Onboarding"
      tabDescription="Complete your profile to get started"
    >
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-orange-50 py-12 px-4">
        <div className="m-auto w-[90%] lg:w-[80%] max-w-5xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Welcome to Omerald Health
            </h1>
            <p className="text-lg text-gray-600">
              Complete your profile to get started with personalized health
              management
            </p>
          </div>
          <OnboardForm />
        </div>
      </div>
    </UserLayout>
  );
}

