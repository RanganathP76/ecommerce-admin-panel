import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import {
  FaChartPie,
  FaBox,
  FaClipboardList,
  FaShippingFast,
  FaCog,
  FaTags,
  FaImages,
  FaSignOutAlt
} from "react-icons/fa";
import "./AdminLayout.css";

export default function AdminLayout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("adminToken");
    navigate("/login");
  };

  return (
    <div className="admin-container">
      <aside className="sidebar">
        <h2 className="logo">Admin Panel</h2>
        <nav>
          <Link to="/dashboard"><FaChartPie /> Analytics</Link>
          <Link to="/collections"><FaTags /> Collections</Link>
          <Link to="/banners"><FaImages /> Banners</Link> {/* Added Banners */}
          <Link to="/products"><FaBox /> Products</Link>
          <Link to="/orders"><FaClipboardList /> Orders</Link>
          <Link to="/payment-config"><FaCog /> Payment Config</Link>
          <Link to="/shipping-rates"><FaShippingFast /> Shipping Rates</Link>
        </nav>
        <button className="logout-btn" onClick={logout}>
          <FaSignOutAlt /> Logout
        </button>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

