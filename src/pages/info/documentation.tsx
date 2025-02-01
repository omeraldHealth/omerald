import React from 'react';
import { HeaderText } from '@/components/atoms/typograph';
import { UserLayout } from '@/components/templates/layouts/UserLayout';

const Documentation = () => {
  return (
    <UserLayout 
      tabName="Omerald | Documentation" 
      tabDescription="Omerald is a health management platform to connect people and doctors with ease."
    >
      <div className="w-full">
        <div className="w-full">
          <div className="py-4 text-center">
            <div className="max-w-full lg:max-w-full mx-auto lg:mx-0 mb-2 text-center">
              <h2 className="text-3xl lg:text-5xl mb-4 font-bold">
                <span className="text-orange-400">Documentation</span>
              </h2>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-orange-50 py-20">
        <div className="w-full mr-auto ml-auto pl-4 pr-4 max-w-7xl">
          <div className="flex flex-wrap items-center -mx-3">
            <div className="w-full px-3">
              <div className="pb-12 ml-10">
                <HeaderText>Coming Soon...</HeaderText>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export async function getStaticProps() {
  return {
    props: {},
  };
}

export default Documentation;

