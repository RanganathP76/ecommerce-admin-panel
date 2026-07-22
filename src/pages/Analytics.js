import React, { useEffect, useState } from "react";
import api from "../utils/axiosInstance";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./Analytics.css";
const COLORS = [
  "#10B981", // Delivered
  "#F59E0B", // Pending
  "#3B82F6", // Ongoing
  "#EF4444", // Cancelled
];
export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data } = await api.get("admin/analytics");
        setStats(data);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <p>Loading analytics...</p>;
  if (!stats) return <p>No analytics data available.</p>;

  return (
    <div className="analytics-container">
      <h1>Analytics new1 Dashboard</h1>

      <div className="summary-cards">

  <div className="card revenue">
    <h3>💰 Revenue</h3>
    <p>₹{stats.totalRevenue.toLocaleString()}</p>
  </div>

  <div className="card">
    <h3>📦 Orders</h3>
    <p>{stats.totalOrders}</p>
  </div>

  <div className="card">
    <h3>👥 Users</h3>
    <p>{stats.totalUsers}</p>
  </div>

  <div className="card">
    <h3>🛍 Products</h3>
    <p>{stats.totalProducts}</p>
  </div>

  <div className="card delivered">
    <h3>✅ Delivered</h3>
    <p>{stats.deliveredOrders}</p>
  </div>

  <div className="card pending">
    <h3>⏳ Pending</h3>
    <p>{stats.pendingOrders}</p>
  </div>

  <div className="card ongoing">
    <h3>🚚 Ongoing</h3>
    <p>{stats.ongoingOrders}</p>
  </div>

  <div className="card cancelled">
    <h3>❌ Cancelled</h3>
    <p>{stats.cancelledOrders}</p>
  </div>

</div>

      {/* Monthly Revenue Chart */}
      <div className="chart-section">
        <h2>Monthly Revenue</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.charts.monthlyRevenue}>
            <Line type="monotone" dataKey="value" stroke="#007bff" />
            <CartesianGrid stroke="#ccc" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      </div>

<div className="chart-section">
  <h2>Monthly Orders</h2>

  <ResponsiveContainer width="100%" height={320}>
    <BarChart data={stats.charts.monthlyOrders}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="label" />
      <YAxis />
      <Tooltip />
      <Bar
        dataKey="value"
        fill="#6366F1"
        radius={[8,8,0,0]}
      />
    </BarChart>
  </ResponsiveContainer>

</div>

<div className="chart-section">

<h2>Daily Revenue</h2>

<ResponsiveContainer width="100%" height={320}>

<AreaChart data={stats.charts.dailyRevenue}>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis dataKey="label"/>

<YAxis/>

<Tooltip/>

<Area
type="monotone"
dataKey="value"
stroke="#22C55E"
fill="#86EFAC"
/>

</AreaChart>

</ResponsiveContainer>

</div>

<div className="chart-section">

<h2>Order Status</h2>

<ResponsiveContainer width="100%" height={350}>

<PieChart>

<Pie
data={stats.charts.orderStatus}
dataKey="value"
nameKey="name"
outerRadius={120}
label
>

{stats.charts.orderStatus.map((entry,index)=>(

<Cell
key={index}
fill={COLORS[index%COLORS.length]}
/>

))}

</Pie>

<Tooltip/>

<Legend/>

</PieChart>

</ResponsiveContainer>

</div>

      {/* Top Selling Products */}
      <div className="chart-section">
        <h2>Top Selling Products</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.charts.topSellingProducts}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#28a745" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
