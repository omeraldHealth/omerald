import React from 'react';
import DashboardUserInfoCard from '@/components/molecules/dashboards/DashboardUserInfoCard';
import { DashboardCharts } from '@/components/molecules/dashboards/dashboardCharts';
import { DashboardReports } from '@/components/molecules/dashboards/dashboardReports';
import { DashboardArticles } from '@/components/molecules/dashboards/dashboardArticles';
import { DashboardCards } from '@/components/molecules/dashboards/dashboardCards';
import { DashboardConditionArticles } from '@/components/molecules/dashboards/dashboardConditionArticles';

const Home = () => {
  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="w-full mb-4 sm:mb-5 lg:mb-6">
        <DashboardCards />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 items-start">
        {/* Left Column - User Info */}
        <div className="w-full lg:col-span-1 h-full">
          <DashboardUserInfoCard />
        </div>

        {/* Right Column - Main Content */}
        <div className="w-full lg:col-span-3 space-y-6">
          {/* Graphs Section */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <DashboardCharts />
          </div>

          {/* Pending Report Acceptance */}
          <DashboardReports />

          {/* Featured Blog Topics - Hidden for now */}
          {/* <DashboardConditionArticles /> */}
        </div>
      </div>
    </div>
  );
};

export default Home;
