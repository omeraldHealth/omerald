'use client';

import React from 'react';
import Link from 'next/link';

const WhatIsOmerald = () => {
  return (
    <div className="relative mt-12 sm:mt-16 md:mt-20 text-center">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-24 items-start">
        <div className="relative order-2 lg:order-1">
          <div aria-hidden="true" className="hidden lg:block absolute inset-y-0 right-0 w-screen">
            <div className="absolute hidden xl:block inset-y-0 right-1/2 w-full bg-gray-50 rounded-r-3xl xl:right-72" />
            <svg
              className="absolute hidden lg:block top-8 left-1/2 -ml-3 xl:-right-8 xl:left-auto xl:top-12"
              width={404}
              height={392}
              fill="none"
              viewBox="0 0 404 392"
            >
              <defs>
                <pattern
                  id="02f20b47-fd69-4224-a62a-4c9de5c763f7"
                  x={0}
                  y={0}
                  width={20}
                  height={20}
                  patternUnits="userSpaceOnUse"
                >
                  <rect x={0} y={0} width={4} height={4} className="text-gray-200" fill="currentColor" />
                </pattern>
              </defs>
              <rect width={404} height={392} fill="url(#02f20b47-fd69-4224-a62a-4c9de5c763f7)" />
            </svg>
          </div>
          <div className="relative mx-auto max-w-md sm:max-w-2xl lg:max-w-none px-4 sm:px-6 lg:px-0 lg:py-8 xl:py-20">
            <iframe
              src="https://www.youtube.com/embed/WMt0dSA_Qhk?start=1"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px] xl:h-[450px] rounded-lg"
            />
          </div>
        </div>
        <div className="relative order-1 lg:order-2 mt-0 lg:mt-0 mx-auto max-w-md sm:max-w-2xl lg:max-w-none px-4 sm:px-6 lg:px-0">
          <div className="lg:pt-8 xl:pt-20">
            <h1 className="mt-0 sm:mt-3 text-xl sm:text-2xl lg:text-2xl font-extrabold">What is Omerald?</h1>
            <h1 className="text-base sm:text-lg lg:text-lg text-green-800 mt-2">
              On a mission to create a better health ecosystem!!
            </h1>
            <div className="mt-4 sm:mt-6 text-gray-500 space-y-4 sm:space-y-6">
              <p className="text-sm sm:text-base text-gray-400">
                OMERALD (Organising Medical Record with Analytical Diagnostics) analyses your past health records and share certain analytics with you. These analyses can be used in studies by your doctor for future references.
              </p>
              <p className="text-sm sm:text-base text-gray-400">
                We are strict with privacy and we will never share it with anyone for monetisation purposes. Who can see your data is completely dependent on you. You can revoke access if you feel that user no longer requires your report / profile access
              </p>
            </div>
          </div>

          <div className="mt-6 sm:mt-10">
            <div className="my-6 sm:my-10">
              <Link href="/about">
                <button
                  type="button"
                  className="w-full sm:w-auto px-6 sm:px-4 py-3 sm:py-4 bg-orange-400 hover:bg-orange-500 text-white font-medium rounded transition-colors"
                >
                  Know More
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatIsOmerald;

