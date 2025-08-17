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

  // ✅ Update status instantly in UI without full re-fetch
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

  // ✅ Download Invoice
  const downloadInvoice = (order) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("My Awesome Store", 14, 20);
    doc.setFontSize(12);
    doc.text("Invoice", 14, 28);

    doc.setFontSize(10);
    doc.text(`Order ID: ${order._id}`, 14, 40);
    doc.text(`Customer: ${order.user?.name}`, 14, 46);
    doc.text(`Email: ${order.user?.email}`, 14, 52);
    doc.text(`Mobile: ${order.shippingInfo?.phone || "N/A"}`, 14, 58);
    doc.text(`Status: ${order.orderStatus}`, 14, 64);
    doc.text(`Placed At: ${new Date(order.createdAt).toLocaleString()}`, 14, 70);

    doc.text("Shipping Address:", 14, 80);
    doc.text(
      `${order.shippingInfo?.address}, ${order.shippingInfo?.city}, ${order.shippingInfo?.state} - ${order.shippingInfo?.pincode}`,
      14,
      86
    );

    const tableData = order.orderItems.map((item) => [
      item.name,
      item.quantity,
      `₹${item.price}`,
      item.customization
        ? Array.isArray(item.customization)
          ? item.customization.map((c) => `${c.label}: ${c.value || "-"}`).join(", ")
          : Object.entries(item.customization)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")
        : "-",
    ]);

    autoTable(doc, {
      head: [["Product", "Qty", "Price", "Customization"]],
      body: tableData,
      startY: 100,
    });

    const finalY = doc.lastAutoTable.finalY || 100;
    doc.text(`Items Price: ₹${order.itemsPrice}`, 14, finalY + 10);
    doc.text(`Shipping: ₹${order.shippingPrice}`, 14, finalY + 16);
    doc.text(`Discount: ₹${order.discount}`, 14, finalY + 22);
    doc.text(`Total: ₹${order.totalPrice}`, 14, finalY + 28);
    doc.text(`Paid: ₹${order.amountPaid}`, 14, finalY + 34);
    doc.text(`Due: ₹${order.amountDue}`, 14, finalY + 40);

    doc.save(`Invoice_${order._id}.pdf`);
  };

  return (
    <div className="admin-orders">
      <h2>All Orders</h2>
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
                    {order.user?.name} <br />
                    <small>{order.user?.email}</small> <br />
                    <small>📞 {order.shippingInfo?.phone || "N/A"}</small>
                  </td>
                  <td>₹{order.totalPrice}</td>
                  <td>
  <select
    value={order.orderStatus}
    onChange={(e) => updateStatus(order._id, e.target.value)}
  >
    <option value="Pending">Pending</option>
    <option value="Processing">Processing</option>
    <option value="Confirmed">Confirmed</option>
    <option value="Packed">Packed</option>
    <option value="In Transit">In Transit</option>
    <option value="Arriving Tomorrow">Arriving Tomorrow</option>
    <option value="Out for Delivery">Out for Delivery</option>
    <option value="Delivered">Delivered</option>
    <option value="Failed Delivery">Failed Delivery</option>
    <option value="Cancelled">Cancelled</option>
    <option value="Returned">Returned</option>
  </select>
</td>

                  <td>{new Date(order.createdAt).toLocaleString()}</td>
                  <td>
                    <button onClick={() => openDetails(order)}>View</button>{" "}
                    <button onClick={() => deleteOrder(order._id)}>Delete</button>
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

      {selectedOrder && (
        <div className="modal">
          <div className="modal-content">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> {selectedOrder._id}</p>
            <p><strong>Customer:</strong> {selectedOrder.user?.name} ({selectedOrder.user?.email})</p>
            <p><strong>Mobile:</strong> {selectedOrder.shippingInfo?.phone || "N/A"}</p>
            <p><strong>Status:</strong> {selectedOrder.orderStatus}</p>
            <p><strong>Shipping:</strong> {selectedOrder.shippingInfo?.address}, {selectedOrder.shippingInfo?.city}, {selectedOrder.shippingInfo?.state} - {selectedOrder.shippingInfo?.pincode}</p>

            <h4>Items:</h4>
            <ul>
              {selectedOrder.orderItems.map((item, i) => (
                <li key={i}>
                  {item.name} - ₹{item.price} x {item.quantity}
                  {item.customization && (
                    <div className="customization-info">
                      {Array.isArray(item.customization) ? (
                        item.customization.map((field, idx) => (
                          <small key={idx}>
                            {field.label}: {field.value || "-"}
                          </small>
                        ))
                      ) : (
                        Object.entries(item.customization).map(([key, val]) => (
                          <small key={key}>
                            {key}: {typeof val === "object" ? JSON.stringify(val) : val}
                          </small>
                        ))
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <h4>Totals</h4>
            <p>Items Price: ₹{selectedOrder.itemsPrice}</p>
            <p>Shipping: ₹{selectedOrder.shippingPrice}</p>
            <p>Discount: ₹{selectedOrder.discount}</p>
            <p>Total: ₹{selectedOrder.totalPrice}</p>
            <p>Paid: ₹{selectedOrder.amountPaid}</p>
            <p>Due: ₹{selectedOrder.amountDue}</p>

            <div className="modal-actions">
              <button onClick={() => downloadInvoice(selectedOrder)}>Download Invoice</button>
              <button onClick={closeDetails}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
