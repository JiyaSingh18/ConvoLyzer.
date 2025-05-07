import React from 'react';
import { BarChart, LineChart, PieChart, Activity, TrendingUp, Clock } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl text-white mb-8 text-center">Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={<Activity className="text-pink-500" />}
          title="Total Interviews"
          value="24"
          trend="+5 this week"
        />
        <StatCard
          icon={<Clock className="text-blue-500" />}
          title="Hours Practiced"
          value="12.5"
          trend="+2.5 this week"
        />
        <StatCard
          icon={<TrendingUp className="text-yellow-400" />}
          title="Improvement"
          value="15%"
          trend="Last 30 days"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard
          icon={<BarChart />}
          title="Most Common Topics"
          chart={
            <div className="h-64 flex items-end justify-around">
              {[80, 65, 45, 30, 20].map((height, i) => (
                <div key={i} className="w-12 bg-blue-500 rounded-t-lg" style={{ height: `${height}%` }}>
                  <div className="text-xs text-center mt-2">{height}%</div>
                </div>
              ))}
            </div>
          }
        />
        <ChartCard
          icon={<LineChart />}
          title="Sentiment Trends"
          chart={
            <div className="h-64 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-1 bg-pink-500"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-around">
                {[0, 1, 2, 3, 4].map((_, i) => (
                  <div key={i} className="w-4 h-4 bg-white border-4 border-pink-500 rounded-full"></div>
                ))}
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
};

const StatCard = ({ 
  icon, 
  title, 
  value, 
  trend 
}: { 
  icon: React.ReactNode; 
  title: string; 
  value: string; 
  trend: string;
}) => (
  <div className="retro-card">
    <div className="flex items-center justify-between mb-4">
      {icon}
      <h3 className="text-lg font-bold">{title}</h3>
    </div>
    <div className="text-3xl font-bold mb-2">{value}</div>
    <div className="text-sm text-gray-600">{trend}</div>
  </div>
);

const ChartCard = ({ 
  icon, 
  title, 
  chart 
}: { 
  icon: React.ReactNode; 
  title: string; 
  chart: React.ReactNode;
}) => (
  <div className="retro-card">
    <div className="flex items-center mb-6">
      {icon}
      <h3 className="ml-2 text-xl font-bold">{title}</h3>
    </div>
    {chart}
  </div>
);

export default Dashboard;