import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface EmotionData {
  name: string;
  value: number;
}

interface Speaker {
  id: string;
  sentiment: number;
  emotions: {
    joy: number;
    anger: number;
    sadness: number;
    fear: number;
  };
}

interface VisualizationsProps {
  speakers: Speaker[];
  timeline: {
    timestamp: number;
    speaker: string;
    sentiment: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const EMOTIONS = ['Joy', 'Anger', 'Sadness', 'Fear'];

const AnalysisVisualizations: React.FC<VisualizationsProps> = ({ speakers, timeline }) => {
  // Prepare emotion data for pie chart
  const getEmotionData = (speaker: Speaker): EmotionData[] => {
    return Object.entries(speaker.emotions).map(([emotion, value]) => ({
      name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      value: value * 100,
    }));
  };

  // Prepare sentiment timeline data
  const timelineData = timeline.map((entry) => ({
    time: new Date(entry.timestamp).toLocaleTimeString(),
    sentiment: entry.sentiment * 100,
    speaker: entry.speaker,
  }));

  return (
    <div className="space-y-8">
      {/* Emotion Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {speakers.map((speaker) => (
          <div key={speaker.id} className="retro-card">
            <h3 className="text-xl font-bold mb-4 dark:text-gray-100">
              Speaker {speaker.id} - Emotional Analysis
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getEmotionData(speaker)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                      name,
                    }) => {
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                      const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

                      return (
                        <text
                          x={x}
                          y={y}
                          fill="white"
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                        >
                          {`${name} ${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {getEmotionData(speaker).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Sentiment Timeline */}
      <div className="retro-card">
        <h3 className="text-xl font-bold mb-4 dark:text-gray-100">Sentiment Timeline</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis
                label={{ value: 'Sentiment Score (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              {speakers.map((speaker, index) => (
                <Bar
                  key={speaker.id}
                  dataKey="sentiment"
                  name={`Speaker ${speaker.id}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalysisVisualizations; 