import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaWater, FaExclamationTriangle, FaImages, FaMapMarkedAlt, FaUpload } from 'react-icons/fa';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../services/api';
import StatCard from '../components/StatCard';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/analytics/dashboard');
        setData(res.data.data);
      } catch (e) {
        console.error(e);
        setError('Dashboard data could not be loaded. Check the backend connection and try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <h1 className="text-xl font-semibold">Dashboard unavailable</h1>
        <p className="text-sm text-white/50 mt-2">{error}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-5 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium">
          Retry
        </button>
      </div>
    );
  }

  const stats = data?.stats || {};
  const charts = data?.charts || { trend: [], objectDistribution: [], riskDistribution: [] };

  const COLORS = ['#22d3ee', '#0ea5e9', '#f97316', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Research Dashboard</h1>
          <p className="text-sm text-white/50 mono mt-1">Marine debris monitoring • Real-time intelligence</p>
        </div>
        <Link to="/upload" className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-medium flex items-center gap-2 hover:bg-white/90">
          <FaUpload /> New Analysis
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Missions" value={stats.totalMissions || 0} subtitle="Recorded missions" icon={FaMapMarkedAlt} color="cyan" />
        <StatCard title="Images Analyzed" value={(stats.totalImages || 0).toLocaleString()} subtitle="Side-scan frames" icon={FaImages} color="violet" />
        <StatCard title="Hazards Detected" value={stats.totalDetections || 0} subtitle="Artificial anomalies" icon={FaWater} color="emerald" trend={`${stats.criticalCount || 0} critical`} />
        <StatCard title="Critical Hazards" value={stats.criticalCount || 0} subtitle="Immediate attention" icon={FaExclamationTriangle} color="red" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <h3 className="font-semibold mb-6">Detection Trend • Last 6 Months</h3>
          <div className="h-[280px]">
            {charts.trend.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-white/30">No detection data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.trend}>
                  <XAxis dataKey="month" stroke="#475569" fontSize={12} tick={{ fill: '#94a3b8' }} />
                  <YAxis stroke="#475569" fontSize={12} tick={{ fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                    itemStyle={{ color: '#22d3ee' }}
                  />
                  <Line type="monotone" dataKey="hazards" stroke="#22d3ee" strokeWidth={2.5} dot={{ fill: '#22d3ee', r: 4 }} activeDot={{ r: 6, fill: '#06b6d4' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-6">Object Distribution</h3>
          <div className="h-[280px]">
            {charts.objectDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-white/30">No detections recorded yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts.objectDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {charts.objectDistribution.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-6">Risk Distribution</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.riskDistribution}>
                <XAxis dataKey="level" stroke="#475569" fontSize={11} tick={{ fill: '#94a3b8' }} />
                <YAxis stroke="#475569" fontSize={11} tick={{ fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="count" radius={[8,8,0,0]}>
                  {charts.riskDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={
                      entry.level === 'CRITICAL' ? '#ef4444' :
                      entry.level === 'HIGH' ? '#f97316' :
                      entry.level === 'MEDIUM' ? '#eab308' : '#10b981'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold">Recent Analyses</h3>
            <Link to="/missions" className="text-xs mono text-cyan-400 hover:text-cyan-300">View All →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] mono uppercase tracking-widest text-white/30 border-b border-white/5">
                  <th className="text-left py-3 font-normal">Mission</th>
                  <th className="text-left py-3 font-normal">Images</th>
                  <th className="text-left py-3 font-normal">Detections</th>
                  <th className="text-left py-3 font-normal">Critical</th>
                  <th className="text-left py-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentMissions?.length ? data.recentMissions.map((m) => (
                  <tr key={m._id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="py-3">
                      <p className="font-medium truncate max-w-[260px]">{m.name}</p>
                      <p className="text-xs text-white/40">{m.locationName}</p>
                    </td>
                    <td className="py-3 mono text-white/70">{m.totalImages}</td>
                    <td className="py-3 mono text-white/70">{m.totalDetections}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs mono border border-red-500/20">
                        {m.criticalCount}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] mono uppercase border border-emerald-500/20">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-sm text-white/40">No missions recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
