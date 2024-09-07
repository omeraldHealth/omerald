'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { topicList } from '@/components/common/lib/constants/constants';

export default function HealthTopics() {
  return (
    <section className="bg-blue-100 bg-opacity-20 min-h-auto py-8 sm:py-12 md:py-16 lg:py-[5vh] pb-8 sm:pb-12 md:pb-16 lg:pb-[15vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="mt-3 text-lg sm:text-xl lg:text-2xl font-extrabold text-center px-4">
          You Upload, We Analyze.
        </h1>
        <h1 className="text-sm sm:text-base lg:text-lg text-center font-light px-4 sm:px-8 mt-2 sm:mt-4">
          Your history influences your health, so what does that mean for you? Find out with personalized reports covering topics like
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 w-full lg:w-[90%] m-auto mt-6 sm:mt-8 lg:mt-14 items-center">
          <div className="flex justify-center order-2 lg:order-1">
            <Image
              src="/vectors/healthTopics.svg"
              alt="health topics"
              width={655}
              height={552.5}
              className="w-full h-auto max-w-[400px] sm:max-w-[500px] lg:max-w-[655px]"
            />
          </div>
          <div className="w-full lg:w-auto lg:max-w-md m-auto my-4 sm:my-6 lg:my-10 order-1 lg:order-2">
            <TopicsList />
            <Link href="/articles" className="block mt-4 sm:mt-6">
              <button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-xs sm:text-sm font-medium rounded shadow-sm text-white bg-orange-400 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 transition-colors"
              >
                SHOW ALL HEALTH TOPICS
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const TopicsList = () => (
  <>
    {topicList.map((topic, index) => {
      return (
        <div className={topic.style} key={index}>
          <Image src={topic.icon} alt={topic.title} width={47} height={47} />
          <h1 className="text-md ml-2">{topic.title}</h1>
        </div>
      );
    })}
  </>
);

