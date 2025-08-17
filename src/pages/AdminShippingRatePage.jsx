import React, { useEffect, useState } from "react";
import api from "../utils/axiosInstance";
import "./AdminShippingRatePage.css";

const AdminShippingRatePage = () => {
  const [shippingRates, setShippingRates] = useState([]);
  const [newRate, setNewRate] = useState({ name: "", rate: "", enabled: true });
  const [loading, setLoading] = useState(false);

  // Fetch all shipping rates
  const fetchRates = async () => {
    try {
      const { data } = await api.get("/shipping-rates");
      setShippingRates(data);
    } catch (err) {
      console.error("Error fetching shipping rates:", err);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // Add shipping rate
  const addRate = async () => {
    if (!newRate.name || !newRate.rate) {
      alert("Please fill all fields");
      return;
    }
    try {
      setLoading(true);
      await api.post("/shipping-rates/add", {
        name: newRate.name,
        rate: Number(newRate.rate),
        enabled: newRate.enabled,
      });
      setNewRate({ name: "", rate: "", enabled: true });
      fetchRates();
    } catch (err) {
      console.error("Error adding rate:", err);
      alert("Failed to add rate");
    } finally {
      setLoading(false);
    }
  };

  // Delete shipping rate
  const deleteRate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this shipping rate?")) return;
    try {
      await api.delete(`/shipping-rates/${id}`);
      fetchRates();
    } catch (err) {
      console.error("Error deleting rate:", err);
    }
  };

  return (
    <div className="admin-shipping-rates">
      <h2>Shipping Rates</h2>

      {/* Add Form */}
      <div className="add-rate-form">
        <input
          type="text"
          placeholder="Shipping Name"
          value={newRate.name}
          onChange={(e) => setNewRate({ ...newRate, name: e.target.value })}
        />
        <input
          type="number"
          placeholder="Rate (₹)"
          value={newRate.rate}
          onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
        />

        {/* Toggle Enabled */}
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={newRate.enabled}
            onChange={(e) =>
              setNewRate({ ...newRate, enabled: e.target.checked })
            }
          />
          <span className="toggle-slider"></span>
        </label>

        <button onClick={addRate} disabled={loading}>
          {loading ? "Adding..." : "Add Shipping Rate"}
        </button>
      </div>

      {/* List of Rates */}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Rate (₹)</th>
            <th>Enabled</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {shippingRates.map((rate) => (
            <tr key={rate._id}>
              <td>{rate.name}</td>
              <td>₹{rate.rate}</td>
              <td>
                <span
                  className={`status-badge ${
                    rate.enabled ? "enabled" : "disabled"
                  }`}
                >
                  {rate.enabled ? "Enabled" : "Disabled"}
                </span>
              </td>
              <td>
                <button
                  className="delete-btn"
                  onClick={() => deleteRate(rate._id)}
                >
                  🗑 Delete
                </button>
              </td>
            </tr>
          ))}
          {shippingRates.length === 0 && (
            <tr>
              <td colSpan="4" style={{ textAlign: "center" }}>
                No shipping rates found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminShippingRatePage;
