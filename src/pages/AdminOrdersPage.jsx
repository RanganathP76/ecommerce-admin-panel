// AdminOrdersPage.js
import React, { useEffect, useState } from "react";
import api from "../utils/axiosInstance";
import "./AdminOrdersPage.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/orders/admin/all");
      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ✅ Update order status instantly
  const updateStatus = async (id, status) => {
    try {
      await api.put(`/orders/admin/update/${id}`, { status });
      setOrders((prev) =>
        prev.map((order) =>
          order._id === id ? { ...order, orderStatus: status } : order
        )
      );
    } catch (err) {
      console.error("Error updating order", err);
    }
  };

  // ✅ Delete order
  const deleteOrder = async (id) => {
    if (window.confirm("Delete this order?")) {
      try {
        await api.delete(`/orders/admin/delete/${id}`);
        setOrders((prev) => prev.filter((order) => order._id !== id));
      } catch (err) {
        console.error("Error deleting order", err);
      }
    }
  };

  const openDetails = (order) => setSelectedOrder(order);
  const closeDetails = () => setSelectedOrder(null);

  // ✅ Download Invoice with Specifications
  const downloadInvoice = (order) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text("My Awesome Store", 14, 20);
    doc.setFontSize(12);
    doc.text("INVOICE", 14, 28);

    // Order Info
    doc.setFontSize(10);
    doc.text(`Order ID: ${order._id}`, 14, 40);
    doc.text(`Customer: ${order.user?.name || "Guest"}`, 14, 46);
    doc.text(`Email: ${order.user?.email || order.guestEmail || "N/A"}`, 14, 52);
    doc.text(`Mobile: ${order.shippingInfo?.phone || "N/A"}`, 14, 58);
    doc.text(`Status: ${order.orderStatus}`, 14, 64);
    doc.text(`Placed At: ${new Date(order.createdAt).toLocaleString()}`, 14, 70);

    // Shipping
    doc.text("Shipping Address:", 14, 80);
    doc.text(
      `${order.shippingInfo?.address}, ${order.shippingInfo?.city}, ${order.shippingInfo?.state} - ${order.shippingInfo?.pincode}`,
      14,
      86
    );

    // Items with Specifications + Customization
    const tableData = order.orderItems.map((item) => [
      item.name,
      item.quantity,
      `₹${item.price.toFixed(1)}`,
      item.specifications?.length
        ? item.specifications.map((s) => `${s.key}: ${s.value}`).join(", ")
        : "-",
      item.customization?.length
        ? item.customization.map((c) => `${c.label}: ${c.value}`).join(", ")
        : "-",
    ]);

    autoTable(doc, {
      head: [["Product", "Qty", "Price", "Specifications", "Customization"]],
      body: tableData,
      startY: 100,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [22, 160, 133] }, // teal
    });

    const finalY = doc.lastAutoTable.finalY || 100;
    doc.text(`Items Price: ₹${order.itemsPrice.toFixed(1)}`, 14, finalY + 10);
    doc.text(`Shipping: ₹${order.shippingPrice.toFixed(1)}`, 14, finalY + 16);
    doc.text(`Discount: ₹${order.discount.toFixed(1)}`, 14, finalY + 22);
    doc.text(`Total: ₹${order.totalPrice.toFixed(1)}`, 14, finalY + 28);
    doc.text(`Paid: ₹${order.amountPaid.toFixed(1)}`, 14, finalY + 34);
    doc.text(`Due: ₹${order.amountDue.toFixed(1)}`, 14, finalY + 40);

    doc.save(`Invoice_${order._id}.pdf`);
  };

  return (
    <div className="admin-orders">
      <h2>📦 All Orders</h2>

      {loading ? (
        <p>Loading orders...</p>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>User</th>
              <th>Total</th>
              <th>Status</th>
              <th>Placed At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order._id}>
                  <td>{order._id}</td>
                  <td>
                    {order.user?.name || "Guest"} <br />
                    <small>{order.user?.email || order.guestEmail}</small> <br />
                    <small>📞 {order.shippingInfo?.phone || "N/A"}</small>
                  </td>
                  <td>₹{order.totalPrice.toFixed(1)}</td>
                  <td>
                    <select
                      className="status-select"
                      value={order.orderStatus}
                      onChange={(e) => updateStatus(order._id, e.target.value)}
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
                      ].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleString()}</td>
                  <td>
                    <button className="btn-view" onClick={() => openDetails(order)}>👁 View</button>
                    <button className="btn-delete" onClick={() => deleteOrder(order._id)}>🗑 Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  No orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {selectedOrder && (
        <div className="modal">
          <div className="modal-content">
            <h3>🧾 Order Details</h3>
            <p><strong>Order ID:</strong> {selectedOrder._id}</p>
            <p><strong>Customer:</strong> {selectedOrder.user?.name || "Guest"} ({selectedOrder.user?.email || selectedOrder.guestEmail})</p>
            <p><strong>Mobile:</strong> {selectedOrder.shippingInfo?.phone || "N/A"}</p>
            <p><strong>Status:</strong> {selectedOrder.orderStatus}</p>
            <p><strong>Shipping:</strong> {selectedOrder.shippingInfo?.address}, {selectedOrder.shippingInfo?.city}, {selectedOrder.shippingInfo?.state} - {selectedOrder.shippingInfo?.pincode}</p>

            <h4>🛒 Items:</h4>
            <ul>
              {selectedOrder.orderItems.map((item, i) => (
                <li key={i}>
                  <strong>{item.name}</strong> - ₹{item.price.toFixed(1)} × {item.quantity}
                  {item.specifications?.length > 0 && (
                    <div className="specs">
                      {item.specifications.map((s, idx) => (
                        <small key={idx}>{s.key}: {s.value}</small>
                      ))}
                    </div>
                  )}
                  {item.customization?.length > 0 && (
                    <div className="customization-info">
                      {item.customization.map((c, idx) => (
                        <small key={idx}>{c.label}: {c.value || "-"}</small>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <h4>💰 Totals</h4>
            <p>Items Price: ₹{selectedOrder.itemsPrice.toFixed(1)}</p>
            <p>Shipping: ₹{selectedOrder.shippingPrice.toFixed(1)}</p>
            <p>Discount: ₹{selectedOrder.discount.toFixed(1)}</p>
            <p>Total: ₹{selectedOrder.totalPrice.toFixed(1)}</p>
            <p>Paid: ₹{selectedOrder.amountPaid.toFixed(1)}</p>
            <p>Due: ₹{selectedOrder.amountDue.toFixed(1)}</p>

            <div className="modal-actions">
              <button className="btn-download" onClick={() => downloadInvoice(selectedOrder)}>⬇ Download Invoice</button>
              <button className="btn-close" onClick={closeDetails}>❌ Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

