'use client';

import React from 'react';
import Image from 'next/image';
import { UserLayout } from '@/components/templates/layouts/UserLayout';
import { useUserSettings } from '@/hooks/reactQuery';

const FAQ = () => {
  const { faqsHtml, isLoading, isError } = useUserSettings();

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
          {isLoading && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center text-gray-500">
              Loading FAQs…
            </div>
          )}
          {isError && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center text-amber-700">
              Could not load FAQs. Please try again later.
            </div>
          )}
          {!isLoading && !isError && faqsHtml && (
            <div
              className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 lg:p-8 prose prose-orange max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
              dangerouslySetInnerHTML={{ __html: faqsHtml }}
            />
          )}
          {!isLoading && !isError && !faqsHtml && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center text-gray-500">
              No FAQs available at the moment.
            </div>
          )}
        </section>
      </div>
    </UserLayout>
  );
};

export default FAQ;
