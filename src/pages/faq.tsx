'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { UserLayout } from '@/components/templates/layouts/UserLayout';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const FAQs = [
  {
    ques: 'What is Omerald?',
    ans: 'Omerald is a comprehensive health management platform that allows you to store, manage, and share your health records with ease. It helps you keep track of your family members\' health and provides valuable health insights.',
  },
  {
    ques: 'How do I upload my health reports?',
    ans: 'You can upload health reports by going to the Reports section in your dashboard. Click on "Upload Report" and select the report file from your device. The report will be securely stored and can be shared with healthcare providers.',
  },
  {
    ques: 'Can I add family members?',
    ans: 'Yes! You can add family members to your account in the Members section. This allows you to manage health records for your entire family from one place.',
  },
  {
    ques: 'Is my data secure?',
    ans: 'Absolutely. We use industry-standard encryption and security measures to protect your health data. Your information is stored securely and only accessible to you and those you choose to share with.',
  },
  {
    ques: 'How do I share reports with my doctor?',
    ans: 'You can share reports by going to the Reports section, selecting the report you want to share, and using the share feature. You can share via email or generate a secure link.',
  },
  {
    ques: 'What subscription plans are available?',
    ans: 'We offer both Free and Paid subscription plans. The Free plan includes basic features, while Paid plans (Go Single and Go Family) offer additional features and benefits. Check the Subscription section for details.',
  },
  {
    ques: 'Is site development done?',
    ans: 'The Site is currently under development we are planning to add features soon.',
  },
  {
    ques: 'How to write articles?',
    ans: 'Please register as writer and select health topic and write articles. Once admin approves article is visible on front end',
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <UserLayout 
      tabName="Omerald | FAQ" 
      tabDescription="Omerald is a health management platform to connect people and doctors with ease."
    >
      <div className="bg-orange-50 min-h-screen">
        <div className="w-full bg-white">
          <div className="w-full">
            <div className="py-12 text-center">
              <div className="w-full lg:w-full px-3 mb-12 lg:mb-0 pb-10">
                <div className="flex items-center justify-center">
                  <Image
                    className="w-[70vw] md:w-[40vw] lg:w-[20vw]"
                    src="/pictures/faq.svg"
                    alt="FAQ Illustration"
                    width={300}
                    height={300}
                  />
                </div>
              </div>
              <div className="max-w-full lg:max-w-full mx-auto lg:mx-0 mb-8 text-center">
                <h2 className="text-3xl lg:text-5xl mb-4 font-bold">
                  <span className="text-orange-400">FAQ</span>
                </h2>
                <p className="text-lg italic text-gray-600">Frequently asked questions</p>
              </div>
            </div>
          </div>
        </div>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="space-y-4">
            {FAQs.map((faq, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors rounded-lg"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.ques}</span>
                  <ChevronDownIcon
                    className={`w-5 h-5 text-gray-500 flex-shrink-0 transform transition-transform ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openIndex === index && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <p className="text-gray-700 leading-relaxed">{faq.ans}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </UserLayout>
  );
};

export default FAQ;
