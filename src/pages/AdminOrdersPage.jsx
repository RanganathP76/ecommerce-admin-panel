import React, { useEffect, useState } from "react";
import api from "../utils/axiosInstance";
import "./AdminOrdersPage.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Helper: decode common HTML entities and collapse extra whitespace
 */
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

/**
 * Ensure phone is in international format for wa.me
 */
function formatPhoneForWhatsApp(phone = "") {
  if (!phone) return "";
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (/^\d{10}$/.test(p)) p = "91" + p;
  return p;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailedOrder, setDetailedOrder] = useState(null);
  
  // 🆕 New state for Order Editing
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // 🆕 New state for Bulk Actions
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // fetch all orders (admin)
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/orders/admin/all");
      setOrders(res.data || []);
    } catch (err) {
      console.error("Error fetching orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // fetch single order
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
    setShowEditModal(false); // Close edit modal too
  };

  // 🆕 HANDLERS FOR ORDER EDITING
const openEditModal = (order) => {
    // ⚠️ ONLY initialize shippingInfo based on the backend restriction
    setEditFormData({
        shippingInfo: { ...order.shippingInfo },
    });
    setShowEditModal(true);
};

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested shippingInfo fields exclusively
    if (name.startsWith("shippingInfo.")) {
        const key = name.split(".")[1];
        setEditFormData((prev) => ({
            ...prev,
            shippingInfo: { 
                ...prev.shippingInfo, 
                [key]: value 
            },
        }));
    } 
    // ⚠️ REMOVED ELSE BLOCK: No longer handle top-level pricing fields like itemsPrice, totalPrice.
};

  const editOrderAdmin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.put(`/orders/admin/edit/${detailedOrder._id}`, editFormData);
      alert("Order updated successfully!");
      setShowEditModal(false);
      loadDetailedOrder(detailedOrder._id); // Refresh details
      fetchOrders(); // Refresh table view
    } catch (err) {
      console.error("Error editing order", err);
      alert("Failed to update order: " + (err.response?.data?.details || err.message));
    } finally {
      setLoading(false);
    }
  };

  // update status (Manual update)
  const updateStatus = async (id, status) => {
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

  // delete order (NOW BLOCKED on backend, but client-side UI remains the same)
  const deleteOrder = async (id) => {
    if (!window.confirm("Attempt to delete this order? (Note: Deletion is often disabled on the server for data integrity.)")) return;
    try {
      await api.delete(`/orders/admin/delete/${id}`);
      // If the backend blocks the delete, this code won't run, but we catch the error below.
      setOrders((prev) => prev.filter((o) => o._id !== id));
      if (detailedOrder?._id === id) closeDetails();
      alert("Order deleted successfully!");
    } catch (err) {
      console.error("Error deleting order", err);
      // The backend now returns a message if deletion is blocked.
      alert(
        "Delete failed: " + (err.response?.data?.message || err.message)
      );
    }
  };

  // WhatsApp actions (Same as before)
  const sendWhatsApp = (order, type = "confirm") => {
    const phoneRaw = order?.shippingInfo?.phone || order?.shippingInfo?.mobile || "";
    const phone = formatPhoneForWhatsApp(phoneRaw);
    if (!phone) return alert("Customer mobile number missing");

    const name = cleanText(order?.shippingInfo?.name || order?.user?.name || "Customer");
    const orderId = order._id;
    const trackLink = `https://cuztory.in/track-order?order_id=${orderId}`;

    const itemNames =
      order.orderItems?.map((item) => cleanText(item.name)).join(", ") || "your item";

    let msg = "";

    if (type === "confirm") {
      msg = `📦 Cuztory – Order Confirmed\n\nHi ${name},\nOrder ID: ${orderId}\nYour ${itemNames} is confirmed.\nTrack: ${trackLink}`;
      const hasCustomization = order.orderItems?.some(
        (item) => item.customization && item.customization.length > 0
      );
      if (hasCustomization)
        msg += `\nOur team will contact you soon to confirm customization details.`;
    } else if (type === "status") {
      msg = `🔄 Order Status Update\nOrder ID: ${orderId}\nStatus: ${order.orderStatus}\nTrack: ${trackLink}`;
    } else if (type === "cancel") {
      msg = `❌ Order Cancelled\nHi ${name},\nYour order (${orderId}) has been cancelled.\nTrack: ${trackLink}`;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // specifications and customization helpers (Same as before)
  const extractSpecifications = (item) => {
    if (!item?.specifications?.length) return "-";
    return item.specifications
      .map((s) => `${cleanText(s.key)}: ${cleanText(s.value)}`)
      .join(", ");
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

  // PDF invoice (Same as before)
  const downloadInvoice = (order) => {
    // ... (PDF logic remains the same)
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

      const shipping = order.shippingInfo || {};
      const postal = shipping.postalCode || shipping.pincode || "";
      const addressLines = [
        cleanText(shipping.name || ""),
        cleanText(shipping.address || ""),
        `${cleanText(shipping.city || "")}, ${cleanText(shipping.state || "")} ${
          postal ? `- ${postal}` : ""
        }`,
        cleanText(shipping.country || ""),
      ].filter(Boolean);

      doc.text("Shipping Address:", left, cursorY);
      cursorY += 14;
      const wrapped = doc.splitTextToSize(addressLines.join(", "), 500);
      doc.text(wrapped, left, cursorY);
      cursorY += wrapped.length * 12 + 10;

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
        columnStyles: {
          0: { cellWidth: 170 },
          1: { cellWidth: 40, halign: "center" },
          2: { cellWidth: 70, halign: "right" },
          3: { cellWidth: 140 },
          4: { cellWidth: 140 },
        },
        theme: "grid",
      });

      const afterTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : cursorY + 80;

      const itemsPrice = Number(order.itemsPrice || 0);
      const shippingPrice = Number(order.shippingPrice || 0);
      const discount = Number(order.discount || 0);
      const total = Number(order.totalPrice || 0);
      const paid = Number(order.amountPaid || 0);
      const due = Number(order.amountDue || 0);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Payment Summary:", left, afterTableY);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(11);
      let payY = afterTableY + 18;

      const payLines = [
        `Items Price: ₹${itemsPrice.toFixed(2)}`,
        `Shipping Charges: ₹${shippingPrice.toFixed(2)}`,
        `Discount: ₹${discount.toFixed(2)}`,
        `Total Amount: ₹${total.toFixed(2)}`,
        `Amount Paid: ₹${paid.toFixed(2)}`,
        `Amount Due: ₹${due.toFixed(2)}`,
      ];
      payLines.forEach((line) => {
        const wrap = doc.splitTextToSize(line, 350);
        doc.text(wrap, left, payY);
        payY += wrap.length * 14;
      });

      doc.setFontSize(9);
      const footY = doc.internal.pageSize.height - 40;
      doc.text("Thank you for choosing Cuztory.", left, footY);

      doc.save(`Invoice_${order._id}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Failed to generate PDF");
    }
  };

  // Shiprocket Create Order (Single)
  const createShiprocketOrder = async (orderId) => {
    try {
      const res = await api.post(`/orders/admin/shiprocket/${orderId}`);
      alert(
        `Shiprocket order created! SR Order ID: ${res.data.shipData.order_id}. AWB: ${
          res.data.shipData.awb_code || "Not yet assigned"
        }`
      );
      loadDetailedOrder(orderId); // Refresh detailed view
      fetchOrders(); // Refresh table view
    } catch (err) {
      console.error("Shiprocket creation failed", err);
      alert(
        "Failed to create Shiprocket order: " + (err.response?.data?.message || err.message)
      );
    }
  };

  // 🆕 Shiprocket Create Order (Bulk)
  const bulkCreateShiprocketOrders = async () => {
    if (selectedOrderIds.size === 0) return alert("Select at least one order.");
    if (!window.confirm(`Create Shiprocket orders for ${selectedOrderIds.size} orders?`)) return;

    setBulkActionLoading(true);
    try {
      const orderIds = Array.from(selectedOrderIds);
      const res = await api.post(`/orders/admin/shiprocket/bulk`, { orderIds });
      
      const successCount = res.data.results.filter(r => r.status === 'Success').length;
      const failCount = res.data.results.filter(r => r.status === 'Failed').length;
      const skipCount = res.data.results.filter(r => r.status === 'Skipped').length;

      alert(`Bulk creation complete:\n✅ Success: ${successCount}\n⚠️ Skipped: ${skipCount}\n❌ Failed: ${failCount}`);
      
      setSelectedOrderIds(new Set()); // Clear selection
      fetchOrders(); // Refresh table view
    } catch (err) {
      console.error("Bulk Shiprocket creation failed", err);
      alert("Bulk Shiprocket creation failed: " + (err.response?.data?.message || err.message));
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Shiprocket Sync Status & Tracking (Same as before)
  const syncShiprocketStatus = async (orderId) => {
    if (syncLoading) return;
    setSyncLoading(true);
    try {
      const res = await api.post(`/orders/admin/sync-shiprocket/${orderId}`);
      alert(res.data.message);
      loadDetailedOrder(orderId); // Refresh detailed view
      fetchOrders(); // Refresh table view to show new status
    } catch (err) {
      console.error("Shiprocket sync failed", err);
      alert(
        "Failed to synchronize with Shiprocket: " + (err.response?.data?.details || err.message)
      );
    } finally {
      setSyncLoading(false);
    }
  };

  // 🆕 HANDLERS FOR BULK SELECTION
  const toggleOrderSelection = (orderId) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === orders.length) {
      setSelectedOrderIds(new Set());
    } else {
      const allIds = new Set(orders.map(o => o._id));
      setSelectedOrderIds(allIds);
    }
  };

  // 🆕 Reset Shiprocket Info
const resetShiprocketData = async (orderId) => {
    if (!window.confirm("Are you sure you want to clear the Shiprocket data for this order? This allows re-creating the order.")) return;

    try {
        await api.put(`/orders/admin/shiprocket/reset/${orderId}`);
        alert("Shiprocket data cleared. Refreshing details...");
        loadDetailedOrder(orderId); // Refresh detailed view
        fetchOrders(); // Refresh table view
    } catch (err) {
        console.error("Shiprocket reset failed", err);
        alert(
            "Failed to reset Shiprocket data: " + (err.response?.data?.message || err.message)
        );
    }
};

  // render
  return (
    <div className="admin-orders">
      <h2>📦 All Orders</h2>

      <div className="bulk-actions-bar">
        <button 
          onClick={bulkCreateShiprocketOrders} 
          disabled={selectedOrderIds.size === 0 || bulkActionLoading}
          className="btn-bulk"
        >
          {bulkActionLoading ? 'Processing...' : `🚚 Create Shiprocket for ${selectedOrderIds.size} Orders`}
        </button>
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
              <th>Order ID</th>
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
                <td colSpan="7" style={{ textAlign: "center" }}>
                  No Orders
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const postal = order.shippingInfo?.postalCode || order.shippingInfo?.pincode || "";
                return (
                  <tr key={order._id} className={selectedOrderIds.has(order._id) ? 'selected-row' : ''}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedOrderIds.has(order._id)} 
                        onChange={() => toggleOrderSelection(order._id)}
                      />
                    </td>
                    <td>{order._id}</td>
                    <td>
                      <div>
                        <strong>{order.user?.name || order.shippingInfo?.name || "Guest"}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {order.user?.email || order.guestEmail || ""}
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        📞 {order.shippingInfo?.phone || "N/A"}
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>📮 {postal || "N/A"}</div>
                    </td>
                    <td>₹{(Number(order.totalPrice) || 0).toFixed(2)}</td>
                    <td>
                      <select
                        value={order.orderStatus}
                        onChange={(e) => updateStatus(order._id, e.target.value)}
                        className="status-select"
                      >
                        {[
                          "Pending",
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
                        ].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
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

      {/* 🆕 Order Details Modal (View/Actions) */}
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
    // Step 1: Create Shiprocket Order
    <button className="btn btn-shiprocket-create" onClick={() => createShiprocketOrder(detailedOrder._id)}>
        🚚 Create Shiprocket Order
    </button>
) : (
    // Step 2: Sync Shiprocket Status
    <button 
        className="btn btn-shiprocket-sync" 
        onClick={() => syncShiprocketStatus(detailedOrder._id)}
        disabled={syncLoading}
    >
        🔄 {syncLoading ? 'Syncing...' : 'Sync Shiprocket Status'}
    </button>
)}

            {/* 🆕 SHIPROCKET INTEGRATION DETAILS */}
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
            
            {/* Display full tracking history if available */}
            {detailedOrder.fullTrackingHistory && detailedOrder.fullTrackingHistory.track_status === 1 && (
                <>
                <h4 style={{marginTop: '15px'}}>📍 Tracking History</h4>
                <ul className="tracking-list" style={{listStyle: 'none', paddingLeft: '0'}}>
                    {detailedOrder.fullTrackingHistory.tracking_data?.track_history?.map((event, index) => (
                        <li key={index} style={{borderLeft: '2px solid #007bff', paddingLeft: '10px', marginBottom: '8px'}}>
                            <small><b>{event.location}</b> on {event.date}</small>
                            <p style={{margin: '0', fontSize: '14px'}}>{event.status_description}</p>
                        </li>
                    )).reverse() /* Show newest event first */}
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
                // Step 1: Create Shiprocket Order
                <button className="btn btn-shiprocket-create" onClick={() => createShiprocketOrder(detailedOrder._id)}>
                  🚚 Create Shiprocket Order
                </button>
              ) : (
                // Step 2: Sync Shiprocket Status
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


{/* 🆕 Order Editing Modal (UPDATED) */}
{showEditModal && detailedOrder && (
    <div className="modal">
        <div className="modal-content-small">
            <h3>✏️ Edit Shipping Details: {detailedOrder._id}</h3>
            <form onSubmit={editOrderAdmin}>
                
                {/* ⚠️ WARNING: All pricing fields (Items Price, Shipping Price, Discount, Total Price) 
                  HAVE BEEN REMOVED to align with the backend's current restriction 
                  (exports.editOrderAdmin only updates shippingInfo). 
                */}
                
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
                    Email: {/* 🔑 Added the Email field, crucial for Shiprocket re-creation and contact */}
                    <input type="email" name="shippingInfo.email" value={editFormData.shippingInfo?.email || ''} onChange={handleEditChange} />
                </label>
                <label>
                    Address:
                    <input type="text" name="shippingInfo.address" value={editFormData.shippingInfo?.address || ''} onChange={handleEditChange} required />
                </label>
                <label>
                    City: {/* Added City */}
                    <input type="text" name="shippingInfo.city" value={editFormData.shippingInfo?.city || ''} onChange={handleEditChange} required />
                </label>
                <label>
                    State: {/* Added State */}
                    <input type="text" name="shippingInfo.state" value={editFormData.shippingInfo?.state || ''} onChange={handleEditChange} required />
                </label>
                <label>
                    Pincode:
                    <input type="text" name="shippingInfo.postalCode" value={editFormData.shippingInfo?.postalCode || ''} onChange={handleEditChange} required />
                </label>
                <label>
                    Country: {/* Added Country */}
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