'use client';

import React from 'react';
import Image from 'next/image';
import Pricing from '@/components/molecules/home/Pricing';
import { UserLayout } from '@/components/templates/layouts/UserLayout';

const PricingTab = () => {
  return (
    <UserLayout 
      tabName="Omerald | Subscription" 
      tabDescription="Omerald is a health management platform to connect people and doctors with ease."
    >
      <div className="w-full bg-white">
        <div className="w-full">
          <div className="py-12 text-center">
            <div className="w-full lg:w-full px-3 mb-12 lg:mb-0 pb-10">
              <div className="flex items-center justify-center">
                <Image
                  className="w-[70vw] md:w-[40vw] lg:w-[20vw]"
                  src="/pictures/pricing.svg"
                  alt="Pricing Illustration"
                  width={300}
                  height={300}
                />
              </div>
            </div>
            <div className="max-w-full lg:max-w-full mx-auto lg:mx-0 mb-8 text-center">
              <h2 className="text-3xl lg:text-5xl mb-4 font-bold">
                <span className="text-orange-400">Pricing & Subscription</span>
              </h2>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white pb-20">
        <Pricing />
      </div>
    </UserLayout>
  );
};

export default PricingTab;

