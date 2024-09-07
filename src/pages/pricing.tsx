import { UserLayout } from '@/components/templates/layouts/UserLayout';
import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '₹0',
    period: 'Forever',
    features: [
      'Basic health record storage',
      'Up to 3 family members',
      'Basic analytics',
      'Limited report storage',
      'Community support',
    ],
    cta: 'Current Plan',
    popular: false,
  },
  {
    name: 'Go Single',
    price: '₹499',
    period: 'per month',
    features: [
      'Unlimited health records',
      'Single user account',
      'Advanced analytics',
      'Priority support',
      'Report sharing',
      'Health insights',
    ],
    cta: 'Upgrade Now',
    popular: true,
  },
  {
    name: 'Go Family',
    price: '₹999',
    period: 'per month',
    features: [
      'Everything in Go Single',
      'Unlimited family members',
      'Family health dashboard',
      'Multi-member analytics',
      'Priority support',
      'Advanced sharing options',
    ],
    cta: 'Upgrade Now',
    popular: false,
  },
];

export default function Pricing() {
  return (
    <UserLayout
      tabName="Omerald | Pricing"
      tabDescription="Choose the perfect plan for your health management needs"
    >
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4 text-center">Pricing Plans</h1>
        <p className="text-center text-gray-600 mb-12">
          Choose the plan that best fits your health management needs
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg shadow-lg p-8 ${
                plan.popular ? 'border-2 border-indigo-600 transform scale-105' : 'border border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="bg-indigo-600 text-white text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-gray-600 ml-2">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard">
                <button
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </UserLayout>
  );
}

