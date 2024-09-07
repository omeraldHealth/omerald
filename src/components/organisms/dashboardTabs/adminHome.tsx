import React from 'react';
import { useSetRecoilState } from 'recoil';
import { dashTabs } from '@/components/common/recoil/dashboard';
import { useGetAdminStats } from '@/hooks/reactQuery';

// Admin-specific icons
const UsersIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
  </svg>
);

const ReportsIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm4 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
);

const PendingIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
  </svg>
);

const VaccineIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const ADMIN_STATS_CARDS = [
  {
    bgColor: "#4E36E2",
    Icon: UsersIcon,
    text: "Total Users",
    route: "/members",
    key: "totalUsers",
  },
  {
    bgColor: "#48A9F8",
    Icon: ReportsIcon,
    text: "Total Reports",
    route: "/reports",
    key: "totalReports",
  },
  {
    bgColor: "#F59E0B",
    Icon: PendingIcon,
    text: "Pending Reports",
    route: "/reports",
    key: "pendingReports",
  },
  {
    bgColor: "#10B981",
    Icon: VaccineIcon,
    text: "Total Vaccines",
    route: "/vaccines",
    key: "totalVaccines",
  },
];

const AdminStatsCard = ({ card, value }: { card: typeof ADMIN_STATS_CARDS[0]; value: number | string }) => {
  const setDashboard = useSetRecoilState(dashTabs);
  const { bgColor, Icon, text } = card;

  return (
    <div
      onClick={() => {
        if (card.route === '/vaccines') {
          setDashboard('Vaccines');
        } else if (card.route === '/reports') {
          setDashboard('Reports');
        } else if (card.route === '/members') {
          setDashboard('Members');
        }
      }}
      className="group cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1.5"
    >
      <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl sm:rounded-2xl py-5 sm:py-6 px-4 sm:px-5 lg:px-6 bg-white border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300 h-full before:absolute before:inset-0 before:bg-gradient-to-br before:from-white before:to-gray-50 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300">
        {/* Decorative gradient overlay on hover */}
        <div
          className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300"
          style={{ background: `linear-gradient(135deg, ${bgColor}20 0%, transparent 70%)` }}
        ></div>

        <div className="relative z-10 flex items-center sm:items-start gap-4 w-full sm:w-auto">
          <div
            className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm group-hover:shadow-md"
            style={{
              backgroundColor: `${bgColor}15`,
              boxShadow: `0 4px 14px 0 ${bgColor}20`,
            }}
          >
            <div style={{ color: bgColor }}>
              <Icon />
            </div>
          </div>
          <div className="flex-1 sm:text-left">
            <div className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2 uppercase tracking-wide">
              {text}
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold transition-colors duration-300 text-gray-900">
              {value}
            </div>
          </div>
        </div>

        {/* Arrow indicator */}
        <div className="absolute bottom-4 right-4 sm:relative sm:bottom-0 sm:right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transform group-hover:translate-x-1 transition-all duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default function AdminHome() {
  const setDashboard = useSetRecoilState(dashTabs);
  // Use React Query hook for admin stats with automatic caching
  const { data: stats = { totalUsers: 0, totalReports: 0, pendingReports: 0, totalVaccines: 0 }, isLoading: loading } = useGetAdminStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-indigo-100 text-sm sm:text-base">
          Manage users, reports, vaccines, and system settings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
        {ADMIN_STATS_CARDS.map((card) => (
          <AdminStatsCard key={card.key} card={card} value={stats[card.key as keyof typeof stats]} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickActionButton
            title="Manage Users"
            description="View and manage all users"
            icon={<UsersIcon />}
            onClick={() => setDashboard('Members')}
            color="indigo"
          />
          <QuickActionButton
            title="Review Reports"
            description="Review pending reports"
            icon={<ReportsIcon />}
            onClick={() => setDashboard('Reports')}
            color="blue"
          />
          <QuickActionButton
            title="Manage Vaccines"
            description="Add or edit vaccines"
            icon={<VaccineIcon />}
            onClick={() => setDashboard('Vaccines')}
            color="green"
          />
        </div>
      </div>
    </div>
  );
}

const QuickActionButton = ({
  title,
  description,
  icon,
  onClick,
  color,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: 'indigo' | 'blue' | 'green';
}) => {
  const colorClasses = {
    indigo: 'from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600',
    blue: 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600',
    green: 'from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600',
  };

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden bg-gradient-to-r ${colorClasses[color]} text-white p-4 sm:p-5 rounded-xl hover:shadow-lg transition-all duration-300 transform hover:scale-105 text-left`}
    >
      <div className="relative z-10">
        <div className="mb-3">{icon}</div>
        <h3 className="font-semibold text-sm sm:text-base mb-1">{title}</h3>
        <p className="text-xs sm:text-sm text-white/90">{description}</p>
      </div>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
    </button>
  );
};

