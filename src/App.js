import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminLayout from "./components/AdminLayout";

import Analytics from "./pages/Analytics";
import AdminCollections from "./pages/AdminCollections";
import AdminProductPage from "./pages/AdminProductPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminPaymentConfigPage from "./pages/AdminPaymentConfigPage";
import AdminShippingRatePage from "./pages/AdminShippingRatePage";
import BannerAdmin from "./pages/BannerAdmin";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("adminToken");
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route path="dashboard" element={<Analytics />} />
          <Route path="collections" element={<AdminCollections />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="products" element={<AdminProductPage />} />
          <Route path="payment-config" element={<AdminPaymentConfigPage />} />
          <Route path="shipping-rates" element={<AdminShippingRatePage />} />
          <Route path="banners" element={<BannerAdmin />} />
        </Route>
      </Routes>
    </Router>
  );
}
