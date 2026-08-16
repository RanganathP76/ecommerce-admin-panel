import React, { useEffect, useState } from "react";
import api from "../utils/axiosInstance";
import "./AdminOrdersPage.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function cleanText(raw) {
  if (raw === null || raw === undefined) return "";
  if (typeof raw !== "string") raw = String(raw);
  try {
    const t = document.createElement("textarea");
    t.innerHTML = raw;
    raw = t.value;
  } catch (e) {
    raw = raw.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
  }
  return raw.replace(/\s+/g, " ").trim();
}

function formatPhoneForWhatsApp(phone = "") {
  if (!phone) return "";
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (/^\d{10}$/.test(p)) p = "91" + p;
  return p;
}

// Generates a consistent background color based on the text
function getAvatarColor(str = "") {
  const colors = [
    "#E53935", "#D81B60", "#8E24AA", "#5E35B1",
    "#3949AB", "#1E88E5", "#039BE5", "#00ACC1",
    "#00897B", "#43A047", "#7CB342", "#FB8C00",
    "#F4511E", "#6D4C41", "#546E7A"
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [, setSelectedOrder] = useState(null);
  const [detailedOrder, setDetailedOrder] = useState(null);

  // Pagination & Search States
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Edit & Selection States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const ALL_STATUSES = [
    "Processing",
    "Confirmed",
    "Packed",
    "In Transit",
    "Arriving Tomorrow",
    "Out for Delivery",
    "Delivered",
    "Failed Delivery",
    "Cancelled",
    "Returned",
  ];

  const fetchOrders = async (
    targetPage = page,
    query = activeSearch,
    start = startDate,
    end = endDate,
    status = statusFilter
  ) => {
    try {
      setLoading(true);
      const params = {
        page: targetPage,
        limit,
        search: query,
        startDate: start,
        endDate: end,
        status: status,
      };

      const res = await api.get("/orders/admin/all", { params });
      
      setOrders(res.data.orders || []);
      setTotalOrders(res.data.totalOrders || 0);
      setTotalPages(res.data.totalPages || 1);
      setPage(res.data.currentPage || 1);
    } catch (err) {
      console.error("Error fetching orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setActiveSearch(searchInput);
    fetchOrders(1, searchInput, startDate, endDate, statusFilter);
  };

  const handleDateChange = (type, val) => {
    if (type === "start") {
      setStartDate(val);
      fetchOrders(1, activeSearch, val, endDate, statusFilter);
    } else {
      setEndDate(val);
      fetchOrders(1, activeSearch, startDate, val, statusFilter);
    }
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    fetchOrders(1, activeSearch, startDate, endDate, val);
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      fetchOrders(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      fetchOrders(page - 1);
    }
  };

  const loadDetailedOrder = async (id) => {
    try {
      const res = await api.get(`/orders/admin/order/${id}`);
      setDetailedOrder(res.data);
    } catch (err) {
      console.error("Failed loading detailed order", err);
      setDetailedOrder(null);
    }
  };

  const openDetails = (order) => {
    setSelectedOrder(order);
    loadDetailedOrder(order._id);
  };

  const closeDetails = () => {
    setSelectedOrder(null);
    setDetailedOrder(null);
    setShowEditModal(false);
  };

  const openEditModal = (order) => {
    setEditFormData({
      shippingInfo: { ...order.shippingInfo },
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("shippingInfo.")) {
      const key = name.split(".")[1];
      setEditFormData((prev) => ({
        ...prev,
        shippingInfo: { ...prev.shippingInfo, [key]: value },
      }));
    }
  };

  const editOrderAdmin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.put(`/orders/admin/edit/${detailedOrder._id}`, editFormData);
      alert("Order updated successfully!");
      setShowEditModal(false);
      loadDetailedOrder(detailedOrder._id);
      fetchOrders(page);
    } catch (err) {
      console.error("Error editing order", err);
      alert("Failed to update order: " + (err.response?.data?.details || err.message));
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    const orderToUpdate = orders.find((o) => o._id === id);
    if (orderToUpdate && orderToUpdate.orderStatus === "Abandoned") {
      alert("Abandoned checkout status cannot be changed.");
      return;
    }
    if (status === "Abandoned") {
      alert("You cannot manually change a regular order to Abandoned status.");
      return;
    }

    try {
      await api.put(`/orders/admin/update/${id}`, { status });
      setOrders((prev) =>
        prev.map((o) => (o._id === id ? { ...o, orderStatus: status } : o))
      );
      if (detailedOrder?._id === id)
        setDetailedOrder({ ...detailedOrder, orderStatus: status });
    } catch (err) {
      console.error("Error updating order", err);
      alert("Failed to update status");
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("Attempt to delete this order?")) return;
    try {
      await api.delete(`/orders/admin/delete/${id}`);
      fetchOrders(page);
      if (detailedOrder?._id === id) closeDetails();
      alert("Order deleted successfully!");
    } catch (err) {
      alert("Delete failed: " + (err.response?.data?.message || err.message));
    }
  };

  const sendWhatsApp = (order, type = "confirm") => {
    const phoneRaw = order?.shippingInfo?.phone || order?.shippingInfo?.mobile || "";
    const phone = formatPhoneForWhatsApp(phoneRaw);
    if (!phone) return alert("Customer mobile number missing");

    const name = cleanText(order?.shippingInfo?.name || order?.user?.name || "Customer");
    const orderId = order._id;
    const trackLink = `https://cuztory.in/track-order?order_id=${orderId}`;
    const itemNames = order.orderItems?.map((item) => cleanText(item.name)).join(", ") || "your item";

    let msg = "";
    if (type === "confirm") {
      msg = `📦 Cuztory – Order Confirmed\n\nHi ${name},\nOrder ID: ${orderId}\nYour ${itemNames} is confirmed.\nTrack: ${trackLink}`;
    } else if (type === "status") {
      msg = `🔄 Order Status Update\nOrder ID: ${orderId}\nStatus: ${order.orderStatus}\nTrack: ${trackLink}`;
    } else if (type === "cancel") {
      msg = `❌ Order Cancelled\nHi ${name},\nYour order (${orderId}) has been cancelled.\nTrack: ${trackLink}`;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const extractSpecifications = (item) => {
    if (!item?.specifications?.length) return "-";
    return item.specifications.map((s) => `${cleanText(s.key)}: ${cleanText(s.value)}`).join(", ");
  };

  const extractCustomization = (item) => {
    if (!item?.customization?.length) return "-";
    return item.customization
      .map((c) => {
        const label = cleanText(c.label || c.key || "");
        const value = c.value === 0 ? "0" : cleanText(c.value);
        if (!value) return null;
        return label ? `${label}: ${value}` : `${value}`;
      })
      .filter(Boolean)
      .join(" | ") || "-";
  };

  const downloadInvoice = (order) => {
    if (!order) return;
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      let cursorY = 40;
      const left = 40;

      doc.setFontSize(20);
      doc.text("Cuztory — Invoice", left, cursorY);
      cursorY += 28;

      doc.setFontSize(11);
      doc.text(`Order ID: ${order._id}`, left, cursorY);
      cursorY += 14;
      doc.text(`Placed At: ${new Date(order.createdAt).toLocaleString()}`, left, cursorY);
      cursorY += 18;

      const customerName = cleanText(order.user?.name || order.shippingInfo?.name || "Guest");
      const email = cleanText(order.user?.email || order.guestEmail || "");
      const phone = cleanText(order.shippingInfo?.phone || "");

      doc.text(`Customer: ${customerName}`, left, cursorY);
      cursorY += 14;
      doc.text(`Email: ${email || "N/A"}`, left, cursorY);
      cursorY += 14;
      doc.text(`Phone: ${phone || "N/A"}`, left, cursorY);
      cursorY += 18;

      const tableBody = (order.orderItems || []).map((item) => [
        cleanText(item.name || "-"),
        item.quantity || 1,
        `₹${(Number(item.price) || 0).toFixed(2)}`,
        extractSpecifications(item),
        extractCustomization(item),
      ]);

      autoTable(doc, {
        startY: cursorY,
        head: [["Product", "Qty", "Price", "Specifications", "Customization"]],
        body: tableBody,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 136, 229] },
        theme: "grid",
      });

      doc.save(`Invoice_${order._id}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Failed to generate PDF");
    }
  };

  const downloadExcelDetails = () => {
    if (selectedOrderIds.size === 0) {
      alert("Please select at least one order.");
      return;
    }

    const selectedData = orders.filter((order) => selectedOrderIds.has(order._id));
    let csvContent = "Order ID,Customer,Status,Product,Specifications,Customizations\n";

    selectedData.forEach((order) => {
      order.orderItems.forEach((item) => {
        const specs = extractSpecifications(item).replace(/,/g, ";");
        const custom = extractCustomization(item).replace(/,/g, ";");
        const customerName = order.user?.name || order.shippingInfo?.name || "Guest";
        csvContent += `${order._id},${customerName},${order.orderStatus},${item.name},${specs},${custom}\n`;
      });
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Order_Details_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const createShiprocketOrder = async (orderId) => {
    try {
      const res = await api.post(`/orders/admin/shiprocket/${orderId}`);
      alert(`Shiprocket order created! SR Order ID: ${res.data.shipData.order_id}`);
      loadDetailedOrder(orderId);
      fetchOrders(page);
    } catch (err) {
      alert("Failed to create Shiprocket order: " + (err.response?.data?.message || err.message));
    }
  };

  const bulkCreateShiprocketOrders = async () => {
    if (selectedOrderIds.size === 0) return alert("Select at least one order.");
    if (!window.confirm(`Create Shiprocket orders for ${selectedOrderIds.size} orders?`)) return;

    setBulkActionLoading(true);
    try {
      const orderIds = Array.from(selectedOrderIds);
      const res = await api.post(`/orders/admin/shiprocket/bulk`, { orderIds });
      alert(`Bulk creation complete:\nSuccess: ${res.data.results.filter(r => r.status === 'Success').length}`);
      setSelectedOrderIds(new Set());
      fetchOrders(page);
    } catch (err) {
      alert("Bulk Shiprocket creation failed: " + (err.response?.data?.message || err.message));
    } finally {
      setBulkActionLoading(false);
    }
  };

  const syncShiprocketStatus = async (orderId) => {
    if (syncLoading) return;
    setSyncLoading(true);
    try {
      const res = await api.post(`/orders/admin/sync-shiprocket/${orderId}`);
      alert(res.data.message);
      loadDetailedOrder(orderId);
      fetchOrders(page);
    } catch (err) {
      alert("Failed to sync: " + (err.response?.data?.details || err.message));
    } finally {
      setSyncLoading(false);
    }
  };

  const syncSelectedShiprocketOrders = async () => {
    if (selectedOrderIds.size === 0) return alert("Select at least one order to sync.");
    if (!window.confirm(`Sync Shiprocket status for ${selectedOrderIds.size} selected order(s)?`)) return;

    setSyncLoading(true);
    try {
      const orderIds = Array.from(selectedOrderIds);
      const res = await api.post("/orders/admin/sync-shiprocket-selected", { orderIds });
      alert(
        `Selected Sync Complete:\n✅ Updated: ${res.data.updated}\n⚠️ Skipped: ${res.data.skipped}\n❌ Failed: ${res.data.failed}`
      );
      fetchOrders(page);
    } catch (err) {
      alert("Selected sync failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSyncLoading(false);
    }
  };

  const syncAllShiprocketOrders = async () => {
    if (!window.confirm("Sync ALL Shiprocket orders? This may take 30–60 seconds.")) return;
    try {
      setSyncLoading(true);
      const res = await api.post("/orders/admin/sync-shiprocket-all");
      alert(
        `Global Sync Completed:\nUpdated: ${res.data.updated}\nSkipped: ${res.data.skipped}\nFailed: ${res.data.failed}`
      );
      fetchOrders(page);
    } catch (err) {
      alert("Global sync failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSyncLoading(false);
    }
  };

  const resetShiprocketData = async (orderId) => {
    if (!window.confirm("Are you sure you want to clear Shiprocket data for this order?")) return;
    try {
      await api.put(`/orders/admin/shiprocket/reset/${orderId}`);
      alert("Shiprocket data cleared.");
      loadDetailedOrder(orderId);
      fetchOrders(page);
    } catch (err) {
      alert("Failed to reset: " + (err.response?.data?.message || err.message));
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) newSet.delete(orderId);
      else newSet.add(orderId);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === orders.length) {
      setSelectedOrderIds(new Set());
    } else {
      const validOrderIds = orders
        .filter((order) => order.orderStatus !== "Abandoned")
        .map((order) => order._id);
      setSelectedOrderIds(new Set(validOrderIds));
    }
  };

  const getPaymentTag = (order) => {
    const amountPaid = Number(order.amountPaid || 0);
    const amountDue = Number(order.amountDue || 0);
    if (amountDue <= 0) return <span className="payment-tag paid">PAID</span>;
    if (amountPaid > 0 && amountDue > 0) return <span className="payment-tag advanced">ADVANCED</span>;
    return <span className="payment-tag cod">{order.paymentMethod === "COD" ? "COD" : "PENDING"}</span>;
  };

  return (
    <div className="admin-orders">
      <h2>📦 All Orders</h2>

      {/* Filter and DB Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="filter-bar"
        style={{
          marginBottom: "15px",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "5px",
          display: "flex",
          gap: "15px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label>
          Start Date:
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange("start", e.target.value)}
            style={{ marginLeft: "5px", padding: "5px" }}
          />
        </label>
        <label>
          End Date:
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange("end", e.target.value)}
            style={{ marginLeft: "5px", padding: "5px" }}
          />
        </label>
        <label>
          Status:
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{ marginLeft: "5px", padding: "5px" }}
          >
            <option value="All">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {/* Database Search Input */}
        <div style={{ flex: "1", display: "flex", gap: "8px", minWidth: "280px" }}>
          <input
            type="text"
            placeholder="Search DB (Name, ID, Phone, Specs...)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ padding: "6px", flex: "1" }}
          />
          <button type="submit" className="btn" style={{ padding: "6px 15px", backgroundColor: "#007bff", color: "#fff" }}>
            🔍 Search
          </button>
        </div>
      </form>

      {/* Top Action Bar */}
      <div className="bulk-actions-bar" style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <button
          onClick={bulkCreateShiprocketOrders}
          disabled={selectedOrderIds.size === 0 || bulkActionLoading}
          className="btn-bulk"
        >
          {bulkActionLoading ? "Processing..." : `🚚 Create SR (${selectedOrderIds.size})`}
        </button>

        <button
          onClick={syncSelectedShiprocketOrders}
          disabled={selectedOrderIds.size === 0 || syncLoading}
          className="btn-bulk"
          style={{ backgroundColor: "#17a2b8" }}
        >
          {syncLoading ? "Syncing..." : `🔄 Sync Selected SR (${selectedOrderIds.size})`}
        </button>

        <button
          onClick={syncAllShiprocketOrders}
          className="btn-bulk"
          disabled={syncLoading}
          style={{ backgroundColor: "#6c757d" }}
        >
          {syncLoading ? "Syncing All..." : "🔄 Sync ALL Shiprocket Orders"}
        </button>

        <button
          onClick={downloadExcelDetails}
          disabled={selectedOrderIds.size === 0}
          className="btn"
          style={{ backgroundColor: "#28a745" }}
        >
          Download Specs (Excel)
        </button>
      </div>

      {/* Pagination Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          padding: "5px 0",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: "bold" }}>
          Total Orders Found: <span style={{ color: "#007bff" }}>{totalOrders}</span> | Page {page} of {totalPages}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handlePrevPage} disabled={page === 1 || loading} className="btn">
            ◀ Prev
          </button>
          <button onClick={handleNextPage} disabled={page >= totalPages || loading} className="btn">
            Next ▶
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading orders...</p>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedOrderIds.size > 0 && selectedOrderIds.size === orders.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>Sl No.</th>
              <th>Order ID</th>
              <th>Products</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Placed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center" }}>
                  No Orders Found
                </td>
              </tr>
            ) : (
              orders.map((order, index) => {
                const postal = order.shippingInfo?.postalCode || order.shippingInfo?.pincode || "";
                let allowedStatuses = ALL_STATUSES;
                if (order.orderStatus === "Delivered") allowedStatuses = ["Delivered", "Returned"];
                else if (["Returned", "Cancelled", "Failed Delivery"].includes(order.orderStatus)) {
                  allowedStatuses = [order.orderStatus];
                }

                let rowClass = "";
                const hasShiprocketStatus = order.shiprocketAWB && order.fullTrackingHistory?.shipment_track?.[0]?.current_status;
                if (order.orderStatus === "Delivered") rowClass = "delivered-row";
                else if (["Cancelled", "Failed Delivery", "Returned"].includes(order.orderStatus)) rowClass = "failed-or-cancelled-row";
                else if (hasShiprocketStatus) rowClass = "in-transit-row";

                const firstItem = order.orderItems?.[0];
                const productName = firstItem?.name || "Order Item";
                const initialLetter = productName.charAt(0).toUpperCase();
                const avatarColor = getAvatarColor(productName);
                const extraItemsCount = (order.orderItems?.length || 0) - 1;

                return (
                  <tr key={order._id} className={`${selectedOrderIds.has(order._id) ? "selected-row" : ""} ${rowClass}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.has(order._id)}
                        onChange={() => toggleOrderSelection(order._id)}
                      />
                    </td>
                    <td style={{ fontWeight: "bold" }}>{(page - 1) * limit + index + 1}</td>
                    <td>
                      <div className="order-id-container">
                        {order._id}
                        {order.shiprocketOrderId && <span className="sr-dot" title="Shiprocket Order Created"></span>}
                      </div>
                    </td>

                    {/* Letter Avatar Block Column */}
                    <td>
                      <div className="order-product-preview">
                        <div className="product-thumb-container">
                          <div
                            className="product-letter-avatar"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {initialLetter}
                          </div>
                          {extraItemsCount > 0 && (
                            <span className="extra-count-badge" title={`${extraItemsCount} more item(s)`}>
                              +{extraItemsCount}
                            </span>
                          )}
                        </div>
                        <div className="product-details-summary">
                          <span className="product-title-text" title={productName}>
                            {productName}
                          </span>
                          <span className="product-sub-qty">
                            Qty: {firstItem?.quantity || 1}
                            {extraItemsCount > 0 && (
                              <span className="more-products-text"> ({extraItemsCount}+ more)</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div>
                        <strong>{order.user?.name || order.shippingInfo?.name || "Guest"}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>{order.user?.email || order.guestEmail || ""}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>📞 {order.shippingInfo?.phone || "N/A"}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>📮 {postal || "N/A"}</div>
                      <div style={{ fontSize: 12, marginTop: 5 }}>{getPaymentTag(order)}</div>
                    </td>
                    <td>₹{(Number(order.totalPrice) || 0).toFixed(2)}</td>
                    <td>
                      <select
                        value={order.orderStatus}
                        onChange={(e) => updateStatus(order._id, e.target.value)}
                        disabled={order.orderStatus === "Abandoned"}
                        className={order.orderStatus === "Abandoned" ? "disabled-select" : ""}
                      >
                        {allowedStatuses.map((s) => {
                          if (order.orderStatus !== "Abandoned" && s === "Abandoned") return null;
                          return (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          );
                        })}
                      </select>
                      <div style={{ fontSize: "12px", marginBottom: "5px" }}>
                        <b>SR Status:</b> {order.fullTrackingHistory?.shipment_track?.[0]?.current_status || "—"}
                      </div>
                      <div style={{ fontSize: "12px", marginBottom: "5px" }}>
                        <b>AWB:</b> {order.shiprocketAWB || "Not Assigned"}
                      </div>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td>
                      <button className="btn-view" onClick={() => openDetails(order)}>
                        👁 View
                      </button>
                      <button className="btn-delete" onClick={() => deleteOrder(order._id)}>
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}

      {/* Pagination Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "15px",
        }}
      >
        <div>
          Showing page <b>{page}</b> of <b>{totalPages}</b> ({totalOrders} Total Orders)
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handlePrevPage} disabled={page === 1 || loading} className="btn">
            ◀ Prev 100
          </button>
          <button onClick={handleNextPage} disabled={page >= totalPages || loading} className="btn">
            Next 100 ▶
          </button>
        </div>
      </div>

      {/* Order Details Modal */}
      {detailedOrder && !showEditModal && (
        <div className="modal">
          <div className="modal-content-large">
            <h3>🧾 Order Details</h3>
            
            <button className="btn-edit" onClick={() => openEditModal(detailedOrder)} style={{float: 'right', marginTop: '-40px'}}>
                ✏️ Edit Order
            </button>
            
            <div className="grid2">
              <div>
                <p>
                  <b>Order ID:</b> {detailedOrder._id}
                </p>
                <p>
                  <b>Status:</b> {detailedOrder.orderStatus}
                </p>
                <p>
                  <b>Placed At:</b> {new Date(detailedOrder.createdAt).toLocaleString()}
                </p>
              </div>

              <div>
                <p>
                  <b>Customer:</b> {detailedOrder.user?.name || detailedOrder.shippingInfo?.name || "Guest"}
                </p>
                <p>
                  <b>Email:</b> {detailedOrder.user?.email || detailedOrder.guestEmail}
                </p>
                <p>
                  <b>Phone:</b> {detailedOrder.shippingInfo?.phone || "N/A"}
                </p>
                <p>
                  <b>Pincode:</b>{" "}
                  {detailedOrder.shippingInfo?.postalCode || detailedOrder.shippingInfo?.pincode || "N/A"}
                </p>
              </div>
            </div>
          
            {detailedOrder.shiprocketOrderId && (
              <button 
                  className="btn btn-warning" 
                  onClick={() => resetShiprocketData(detailedOrder._id)}
                  style={{backgroundColor: '#ff9800'}}
              >
                  🗑️ Reset SR Data
              </button>
            )}

            {!detailedOrder.shiprocketOrderId ? (
              <button className="btn btn-shiprocket-create" onClick={() => createShiprocketOrder(detailedOrder._id)}>
                  🚚 Create Shiprocket Order
              </button>
            ) : (
              <button 
                  className="btn btn-shiprocket-sync" 
                  onClick={() => syncShiprocketStatus(detailedOrder._id)}
                  disabled={syncLoading}
              >
                  🔄 {syncLoading ? 'Syncing...' : 'Sync Shiprocket Status'}
              </button>
            )}

            <h4>🚚 Shipping & Tracking Status (Shiprocket)</h4>
            <div className="shiprocket-info-box">
              <p>
                <b>SR Order ID:</b>{" "}
                {detailedOrder.shiprocketOrderId || "Not created"}
              </p>
              {detailedOrder.shiprocketAWB && (
                <p>
                  <b>AWB Number:</b>{" "}
                  <a
                    href={`https://shiprocket.in/tracking/${detailedOrder.shiprocketAWB}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {detailedOrder.shiprocketAWB} ↗️
                  </a>
                </p>
              )}
              {detailedOrder.shiprocketShipmentId && (
                <p>
                  <b>Shipment ID:</b> {detailedOrder.shiprocketShipmentId}
                </p>
              )}
            </div>
            
            {detailedOrder.fullTrackingHistory && detailedOrder.fullTrackingHistory.track_status === 1 && (
                <>
                <h4 style={{marginTop: '15px'}}>📍 Tracking History</h4>
                <ul className="tracking-list" style={{listStyle: 'none', paddingLeft: '0'}}>
                    {detailedOrder.fullTrackingHistory.tracking_data?.track_history?.map((event, index) => (
                        <li key={index} style={{borderLeft: '2px solid #007bff', paddingLeft: '10px', marginBottom: '8px'}}>
                            <small><b>{event.location}</b> on {event.date}</small>
                            <p style={{margin: '0', fontSize: '14px'}}>{event.status_description}</p>
                        </li>
                    )).reverse()}
                </ul>
                </>
            )}

            <h4>📍 Shipping Info</h4>
            <p>
              {cleanText(detailedOrder.shippingInfo?.name || "")}
              <br />
              {cleanText(detailedOrder.shippingInfo?.address || "")}
              <br />
              {cleanText(detailedOrder.shippingInfo?.city || "")},{" "}
              {cleanText(detailedOrder.shippingInfo?.state || "")} -{" "}
              {cleanText(
                detailedOrder.shippingInfo?.postalCode || detailedOrder.shippingInfo?.pincode || ""
              )}
            </p>

            <h4>🛒 Items</h4>
            <ul className="item-list">
              {detailedOrder.orderItems.map((item, idx) => (
                <li key={idx}>
                  <b>{cleanText(item.name || "-")}</b> — ₹{(Number(item.price) || 0).toFixed(2)} ×{" "}
                  {item.quantity || 1}
                  {item.specifications && item.specifications.length > 0 && (
                    <div className="info-tag">Specs: {extractSpecifications(item)}</div>
                  )}
                  {item.customization && extractCustomization(item) !== "-" && (
                    <div className="info-tag">Customization: {extractCustomization(item)}</div>
                  )}
                </li>
              ))}
            </ul>

            <h4>💰 Payment Summary</h4>
            {detailedOrder.paymentInfo?.id && (
              <p>
                <b>Razorpay Payment ID:</b> <code style={{background: "#eee", padding: "2px 4px"}}>{detailedOrder.paymentInfo.id}</code>
              </p>
            )}
            {detailedOrder.paymentInfo?.method && (
              <p><b>Method:</b> {detailedOrder.paymentInfo.method}</p>
            )}

            <p>Items: ₹{(Number(detailedOrder.itemsPrice) || 0).toFixed(2)}</p>
            <p>Shipping: ₹{(Number(detailedOrder.shippingPrice) || 0).toFixed(2)}</p>
            <p>Discount: ₹{(Number(detailedOrder.discount) || 0).toFixed(2)}</p>
            <p>
              <b>Total: ₹{(Number(detailedOrder.totalPrice) || 0).toFixed(2)}</b>
            </p>
            <p>
              <b>Paid: ₹{(Number(detailedOrder.amountPaid) || 0).toFixed(2)}</b>
            </p>
            <p>Due: ₹{(Number(detailedOrder.amountDue) || 0).toFixed(2)}</p>
            <p style={{marginTop: '10px'}}>
                Payment Status: {getPaymentTag(detailedOrder)}
            </p>

            <div className="actions-row">
              <button className="btn" onClick={() => downloadInvoice(detailedOrder)}>
                📄 Download PDF
              </button>
              <button className="btn" onClick={() => sendWhatsApp(detailedOrder, "confirm")}>
                WhatsApp Confirm
              </button>
              <button className="btn" onClick={() => sendWhatsApp(detailedOrder, "status")}>
                WhatsApp Status
              </button>
              <button className="btn" onClick={() => sendWhatsApp(detailedOrder, "cancel")}>
                WhatsApp Cancel
              </button>
              {!detailedOrder.shiprocketOrderId ? (
                <button className="btn btn-shiprocket-create" onClick={() => createShiprocketOrder(detailedOrder._id)}>
                  🚚 Create Shiprocket Order
                </button>
              ) : (
                <button 
                    className="btn btn-shiprocket-sync" 
                    onClick={() => syncShiprocketStatus(detailedOrder._id)}
                    disabled={syncLoading}
                >
                  🔄 {syncLoading ? 'Syncing...' : 'Sync Shiprocket Status'}
                </button>
              )}
              
              <button className="btn-close" onClick={closeDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Editing Modal */}
      {showEditModal && detailedOrder && (
        <div className="modal">
            <div className="modal-content-small">
                <h3>✏️ Edit Shipping Details: {detailedOrder._id}</h3>
                <form onSubmit={editOrderAdmin}>
                    <h4>Shipping Info</h4>
                    <label>
                        Name:
                        <input type="text" name="shippingInfo.name" value={editFormData.shippingInfo?.name || ''} onChange={handleEditChange} required />
                    </label>
                    <label>
                        Phone:
                        <input type="text" name="shippingInfo.phone" value={editFormData.shippingInfo?.phone || ''} onChange={handleEditChange} required />
                    </label>
                    <label>
                        Email:
                        <input type="email" name="shippingInfo.email" value={editFormData.shippingInfo?.email || ''} onChange={handleEditChange} />
                    </label>
                    <label>
                        Address:
                        <input type="text" name="shippingInfo.address" value={editFormData.shippingInfo?.address || ''} onChange={handleEditChange} required />
                    </label>
                    <label>
                        City:
                        <input type="text" name="shippingInfo.city" value={editFormData.shippingInfo?.city || ''} onChange={handleEditChange} required />
                    </label>
                    <label>
                        State:
                        <input type="text" name="shippingInfo.state" value={editFormData.shippingInfo?.state || ''} onChange={handleEditChange} required />
                    </label>
                    <label>
                        Pincode:
                        <input type="text" name="shippingInfo.postalCode" value={editFormData.shippingInfo?.postalCode || ''} onChange={handleEditChange} required />
                    </label>
                    <label>
                        Country:
                        <input type="text" name="shippingInfo.country" value={editFormData.shippingInfo?.country || ''} onChange={handleEditChange} required />
                    </label>

                    <div className="actions-row" style={{marginTop: '20px'}}>
                        <button type="submit" className="btn" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Shipping Changes'}
                        </button>
                        <button type="button" className="btn-close" onClick={closeDetails}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}