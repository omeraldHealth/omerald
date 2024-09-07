'use client';

import React from 'react';
import { UserLayout } from '@/components/templates/layouts/UserLayout';
import { useUserSettings } from '@/hooks/reactQuery';

const Disclaimer = () => {
  const { disclaimerHtml, isLoading, isError } = useUserSettings();

  return (
    <UserLayout
      tabName="Omerald | Disclaimer"
      tabDescription="Omerald is a health management platform to connect people and doctors with ease."
    >
      <div className="w-full">
        <div className="w-full">
          <div className="py-4 text-center">
            <div className="max-w-full lg:max-w-full mx-auto lg:mx-0 mb-2 text-center">
              <h2 className="text-3xl lg:text-5xl mb-4 font-bold">
                <span className="text-orange-400">Disclaimer</span>
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
                {isLoading && (
                  <p className="text-gray-600">Loading disclaimer…</p>
                )}
                {isError && (
                  <p className="text-amber-700">Could not load content. Please try again later.</p>
                )}
                {!isLoading && !isError && disclaimerHtml && (
                  <div
                    className="prose prose-orange max-w-none text-gray-700 prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                    dangerouslySetInnerHTML={{ __html: disclaimerHtml }}
                  />
                )}
                {!isLoading && !isError && !disclaimerHtml && (
                  <p className="text-gray-600">Disclaimer content coming soon.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default Disclaimer;

