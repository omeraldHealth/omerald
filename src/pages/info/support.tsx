'use client';

import React from 'react';
import { UserLayout } from '@/components/templates/layouts/UserLayout';
import Image from 'next/image';
import { useUserSettings } from '@/hooks/reactQuery';

export default function Support() {
  const { customerSupportHtml, isLoading, isError } = useUserSettings();

  return (
    <UserLayout
      tabName="Omerald | Support"
      tabDescription="Omerald is a health management platform to connect people and doctors with ease."
    >
      <div className="bg-white">
        <div className="relative pb-24 bg-gray-900">
          <div className="absolute inset-0">
            <Image
              className="w-full h-full object-cover"
              src="https://images.unsplash.com/photo-1525130413817-d45c1d127c42?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1920&q=60&&sat=-100"
              alt="Support background"
              fill
            />
            <div className="absolute inset-0 bg-gray-800 mix-blend-multiply" aria-hidden="true" />
          </div>
          <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl">
              Support
            </h1>
            <p className="mt-6 max-w-3xl text-xl text-gray-300">
              We are available 24/7 on our support email, you can mail us your query and our associate
              will reach out to you in no time.
            </p>
          </div>
        </div>

        <section className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          {isLoading && (
            <p className="text-gray-600 text-center">Loading support information…</p>
          )}
          {isError && (
            <p className="text-amber-700 text-center">
              Could not load support content. Please try again later.
            </p>
          )}
          {!isLoading && !isError && customerSupportHtml && (
            <div
              className="prose prose-orange max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
              dangerouslySetInnerHTML={{ __html: customerSupportHtml }}
            />
          )}
        </section>
      </div>
    </UserLayout>
  );
}