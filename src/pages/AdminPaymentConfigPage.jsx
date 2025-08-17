import React, { useEffect, useState } from "react";
import api from "../utils/axiosInstance";
import "./AdminPaymentConfigPage.css"; // optional, if you use the CSS I gave

const AdminPaymentConfigPage = () => {
  const [config, setConfig] = useState({
    fullPrepaid: { enabled: false, discountType: "percent", discountValue: 0 },
    partialPayment: { enabled: false, partialType: "percent", partialValue: 0 },
    cod: { enabled: false }
  });

  const [loading, setLoading] = useState(false);

  // Fetch current config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await api.get("/payment-config/get");
        setConfig(data);
      } catch (err) {
        console.error("Error fetching config:", err);
      }
    };
    fetchConfig();
  }, []);

  // Handle changes for nested fields
  const handleChange = (section, field, value) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Save config
  const saveConfig = async () => {
    try {
      setLoading(true);
      await api.post("/payment-config/set", config);
      alert("Payment configuration saved successfully!");
    } catch (err) {
      console.error("Error saving config:", err);
      alert("Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-payment-config">
      <h2>Payment Configuration</h2>

      {/* Full Prepaid */}
      <div className="config-section">
        <h3>Full Prepaid</h3>
        <label>
          <input
            type="checkbox"
            checked={config.fullPrepaid.enabled}
            onChange={(e) => handleChange("fullPrepaid", "enabled", e.target.checked)}
          />
          Enable
        </label>
        <div>
          <label>Discount Type:</label>
          <select
            value={config.fullPrepaid.discountType}
            onChange={(e) => handleChange("fullPrepaid", "discountType", e.target.value)}
          >
            <option value="percent">Percent</option>
            <option value="amount">Amount</option>
          </select>
        </div>
        <div>
          <label>Discount Value:</label>
          <input
            type="number"
            value={config.fullPrepaid.discountValue}
            onChange={(e) => handleChange("fullPrepaid", "discountValue", e.target.value)}
          />
        </div>
      </div>

      <hr />

      {/* Partial Payment */}
      <div className="config-section">
        <h3>Partial Payment</h3>
        <label>
          <input
            type="checkbox"
            checked={config.partialPayment.enabled}
            onChange={(e) => handleChange("partialPayment", "enabled", e.target.checked)}
          />
          Enable
        </label>
        <div>
          <label>Partial Type:</label>
          <select
            value={config.partialPayment.partialType}
            onChange={(e) => handleChange("partialPayment", "partialType", e.target.value)}
          >
            <option value="percent">Percent</option>
            <option value="amount">Amount</option>
          </select>
        </div>
        <div>
          <label>Partial Value:</label>
          <input
            type="number"
            value={config.partialPayment.partialValue}
            onChange={(e) => handleChange("partialPayment", "partialValue", e.target.value)}
          />
        </div>
      </div>

      <hr />

      {/* COD */}
      <div className="config-section">
        <h3>Cash on Delivery</h3>
        <label>
          <input
            type="checkbox"
            checked={config.cod.enabled}
            onChange={(e) => handleChange("cod", "enabled", e.target.checked)}
          />
          Enable COD
        </label>
      </div>

      <button onClick={saveConfig} disabled={loading}>
        {loading ? "Saving..." : "Save Configuration"}
      </button>
    </div>
  );
};

export default AdminPaymentConfigPage;
