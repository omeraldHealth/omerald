import { UserLayout } from '@/components/templates/layouts/UserLayout';

export default function Terms() {
  return (
    <UserLayout
      tabName="Omerald | Terms of Service"
      tabDescription="Omerald Terms of Service and user agreement"
    >
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
            <p className="text-gray-700">
              By accessing and using Omerald, you accept and agree to be bound by these Terms of Service. If you
              do not agree, please do not use our services.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">Use of Service</h2>
            <p className="text-gray-700 mb-2">You agree to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Use the service only for lawful purposes</li>
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account</li>
              <li>Not share your account credentials</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">Health Information</h2>
            <p className="text-gray-700">
              You are responsible for the accuracy of health information you upload. Omerald is not a medical
              service provider and does not provide medical advice.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
            <p className="text-gray-700">
              Omerald is provided "as is" without warranties. We are not liable for any damages arising from the
              use of our service.
            </p>
          </section>
        </div>
      </div>
    </UserLayout>
  );
}

