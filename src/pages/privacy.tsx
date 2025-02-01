import { UserLayout } from '@/components/templates/layouts/UserLayout';

export default function Privacy() {
  return (
    <UserLayout
      tabName="Omerald | Privacy Policy"
      tabDescription="Omerald Privacy Policy and data protection information"
    >
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
            <p className="text-gray-700">
              At Omerald, we are committed to protecting your privacy and ensuring the security of your health
              information. This Privacy Policy explains how we collect, use, and protect your personal and health
              data.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            <p className="text-gray-700 mb-2">We collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Personal information (name, email, phone number)</li>
              <li>Health records and medical reports</li>
              <li>Family member information</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <p className="text-gray-700">
              We use your information to provide health management services, generate insights, and improve our
              platform. We never sell your data to third parties.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
            <p className="text-gray-700">
              We employ industry-standard security measures including encryption, secure servers, and access
              controls to protect your health information.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-gray-700">
              If you have questions about this Privacy Policy, please contact us at support@omerald.com
            </p>
          </section>
        </div>
      </div>
    </UserLayout>
  );
}

