'use client';

import React from 'react';
import Image from 'next/image';
import { UserLayout } from '@/components/templates/layouts/UserLayout';
import { useUserSettings } from '@/hooks/reactQuery';

const Terms = () => {
  const { termsOfServiceHtml, isLoading, isError } = useUserSettings();

  return (
    <UserLayout
      tabName="Omerald | Terms"
      tabDescription="Omerald is a health management platform to connect people and doctors with ease."
    >
      <div className="w-full">
        <div className="w-full">
          <div className="py-12 text-center">
            <div className="w-full lg:w-full px-3 mb-12 lg:mb-0 pb-10">
              <div className="flex items-center justify-center">
                <Image
                  className="w-[70vw] md:w-[40vw] lg:w-[20vw]"
                  src="/pictures/terms.svg"
                  alt="Terms Illustration"
                  width={300}
                  height={300}
                />
              </div>
            </div>
            <div className="max-w-full lg:max-w-full mx-auto lg:mx-0 mb-8 text-center">
              <h2 className="text-3xl lg:text-5xl mb-4 font-bold">
                <span className="text-orange-400">Terms of Service</span>
              </h2>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-orange-50 py-20">
        <div className="w-full mr-auto ml-auto pl-4 pr-4 max-w-7xl">
          <div className="flex flex-wrap items-center -mx-3">
            <div className="w-full px-3">
              <div className="pb-12">
                <div className="max-w-7xl mx-auto lg:mx-0 mb-8 text-center lg:text-left">
                  {isLoading && (
                    <p className="text-gray-600">Loading terms of service…</p>
                  )}
                  {isError && (
                    <p className="text-amber-700">Could not load content. Please try again later.</p>
                  )}
                  {!isLoading && !isError && termsOfServiceHtml && (
                    <div
                      className="prose prose-orange max-w-none text-gray-700 prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                      dangerouslySetInnerHTML={{ __html: termsOfServiceHtml }}
                    />
                  )}
                  {!isLoading && !isError && !termsOfServiceHtml && (
                    <p className="text-gray-600">No terms of service content available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default Terms;

