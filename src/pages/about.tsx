'use client';

import React from 'react';
import Image from 'next/image';
import { UserLayout } from '@/components/templates/layouts/UserLayout';
import CardDesign from '@/components/molecules/home/CardDesign';
import KeepUpWithOmerald from '@/components/molecules/home/KeepUpWithOmerald';
import {
  CheckCircleIcon,
  LightBulbIcon,
  ChartBarIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

const About = () => {
  return (
    <UserLayout
      tabName="Omerald | About"
      tabDescription="Omerald is a health management platform to connect people and doctors with ease."
    >
      <div>
        <div className="w-full px-8 sm:px-8 lg:px-20">
          <div className="w-[95%] lg:w-[80%] m-auto justify-center sm:flex flex-wrap items-center md:mb-2 py-2 h-auto md:h-[60vh]">
            <div className="w-full md:w-1/2 lg:px-3">
              <div className="pb-12">
                <div className="max-w-full sm:max-w-lg lg:max-w-md mx-auto lg:mx-0 mb-8 text-center md:text-left">
                  <h2 className="text-3xl lg:text-5xl mb-4 font-bold">
                    <span className="text-orange-400">Omerald</span>
                  </h2>
                  <p className="text-lg text-gray-700 mb-4">
                    Mission to create a better health ecosystem!!
                  </p>
                  <p className="text-gray-600">
                    OMERALD (Organising Medical Record with Analytical
                    Diagnostics) analyses your past health records and share
                    certain analytics with you. These analyses can be used in
                    studies by your doctor for future references.
                  </p>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 md:px-3 mb-12 lg:mb-0 pb-10">
              <div className="flex items-center justify-center">
                <Image
                  className="lg:max-w-lg"
                  src="/pictures/bannerMedicine.svg"
                  alt="Medical Banner"
                  width={600}
                  height={400}
                />
              </div>
            </div>
          </div>
        </div>

        <section className="pb-2">
          <div className="w-full mr-auto ml-auto pl-4 pr-4 max-w-7xl">
            <div className="flex flex-wrap justify-between pt-8 px-8 pb-16">
              <div className="flex w-1/2 lg:w-auto py-4">
                <div className="flex justify-center items-center bg-orange-50 text-orange-400 rounded-xl h-12 w-12 sm:h-24 sm:w-24">
                  <UsersIcon className="h-8 w-8" />
                </div>
                <div className="sm:py-2 ml-2 sm:ml-6">
                  <span className="sm:text-2xl font-bold">+ </span>
                  <span className="sm:text-2xl font-bold">
                    <span>150</span>
                  </span>
                  <p className="text-xs sm:text-base text-gray-600">
                    Verified Doctors
                  </p>
                </div>
              </div>
              <div className="flex w-1/2 lg:w-auto py-4">
                <div className="flex justify-center items-center bg-orange-50 text-orange-400 rounded-xl h-12 w-12 sm:h-24 sm:w-24">
                  <ChartBarIcon className="h-8 w-8" />
                </div>
                <div className="sm:py-2 ml-2 sm:ml-6">
                  <span className="sm:text-2xl font-bold">+ </span>
                  <span className="sm:text-2xl font-bold">
                    <span>15</span>
                  </span>
                  <span className="sm:text-2xl font-bold"> k </span>
                  <p className="text-xs sm:text-base text-gray-600">
                    Health Articles
                  </p>
                </div>
              </div>
              <div className="flex w-1/2 lg:w-auto py-4">
                <div className="flex justify-center items-center bg-orange-50 text-orange-400 rounded-xl h-12 w-12 sm:h-24 sm:w-24">
                  <CheckCircleIcon className="h-8 w-8" />
                </div>
                <div className="sm:py-2 ml-2 sm:ml-6">
                  <span className="sm:text-2xl font-bold">+ </span>
                  <span className="sm:text-2xl font-bold">
                    <span>300</span>
                  </span>
                  <p className="text-xs sm:text-base text-gray-600">
                    Happy Customers
                  </p>
                </div>
              </div>
              <div className="flex w-1/2 lg:w-auto py-4">
                <div className="flex justify-center items-center bg-orange-50 text-orange-400 rounded-xl h-12 w-12 sm:h-24 sm:w-24">
                  <LightBulbIcon className="h-8 w-8" />
                </div>
                <div className="sm:py-2 ml-2 sm:ml-6">
                  <span className="sm:text-2xl font-bold">+ </span>
                  <span className="sm:text-2xl font-bold">
                    <span>50</span>
                  </span>
                  <p className="text-xs sm:text-base text-gray-600">
                    Associated Labs
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="w-full mr-auto ml-auto pl-4 pr-4 max-w-7xl">
            <div className="w-full px-[10vw] mb-4 lg:mb-0">
              <h2 className="text-2xl text-center md:text-4xl font-bold">
                <span>We help you </span>
                <span className="text-orange-400">Manage</span>
                <span> your health better</span>
              </h2>
            </div>
            <div className="w-full lg:w-[70vw] p-[2vw] m-auto">
              <p className="text-gray-500 font-light text-center">
                We are strict with privacy and we will never share it with
                anyone for monetisation purposes. Who can see your data is
                completely dependent on you. You can revoke access if you feel
                that user no longer requires your report / profile access
              </p>
            </div>

            <div className="grid grid-cols-1 px-[4vw] sm:px-0 sm:grid-cols-3 -mx-3 -mb-6 text-center">
              <div className="w-full px-3 mb-6">
                <CardDesign
                  cardNo={1}
                  imageSrc="/pictures/upload.svg"
                  title="Upload Reports"
                  desc="Upload your health reports to be shared with anyone."
                />
              </div>
              <div className="w-full px-3 mb-6">
                <CardDesign
                  cardNo={2}
                  imageSrc="/pictures/analysis.svg"
                  title="Get Insights"
                  desc="Get valuable insights from your reports to understand changes in your health condition."
                />
              </div>

              <div className="w-full px-3 mb-6">
                <CardDesign
                  cardNo={3}
                  imageSrc="/pictures/doctor.svg"
                  title="Consult With Experts"
                  desc="Use the insights to get feedback from doctors and get necessary precautions."
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <KeepUpWithOmerald />
        </section>
      </div>
    </UserLayout>
  );
};

export default About;
