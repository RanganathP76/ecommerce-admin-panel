// AdminOrdersPage.js (UPGRADED — fixes pincode, customization blanks, PDF spacing, uses /orders/admin/order/:id)

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
  // decode basic HTML entities using a textarea (browser-only)
  try {
    const t = document.createElement("textarea");
    t.innerHTML = raw;
    raw = t.value;
  } catch (e) {
    // fallback: replace common entity
    raw = raw.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
  }
  // collapse repeated whitespace and trim
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Ensure phone is in international format for wa.me
 * If 10-digit number and no country code, assume India (91).
 * If already starts with +, remove + for wa.me.
 */
function formatPhoneForWhatsApp(phone = "") {
  if (!phone) return "";
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  // if it's 10 digits assume India
  if (/^\d{10}$/.test(p)) p = "91" + p;
  return p;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailedOrder, setDetailedOrder] = useState(null);

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

  // fetch single order with admin route
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
  };

  // update status
  const updateStatus = async (id, status) => {
    try {
      await api.put(`/orders/admin/update/${id}`, { status });
      setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, orderStatus: status } : o)));
      if (detailedOrder?._id === id) setDetailedOrder({ ...detailedOrder, orderStatus: status });
    } catch (err) {
      console.error("Error updating order", err);
      alert("Failed to update status");
    }
  };

  // delete order
  const deleteOrder = async (id) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await api.delete(`/orders/admin/delete/${id}`);
      setOrders((prev) => prev.filter((o) => o._id !== id));
      if (detailedOrder?._id === id) closeDetails();
    } catch (err) {
      console.error("Error deleting order", err);
      alert("Delete failed");
    }
  };

  // WhatsApp actions: confirm / status / cancel
  const sendWhatsApp = (order, type = "confirm") => {
  const phoneRaw = order?.shippingInfo?.phone || order?.shippingInfo?.mobile || "";
  const phone = formatPhoneForWhatsApp(phoneRaw);
  if (!phone) return alert("Customer mobile number missing");

  const name = cleanText(order?.shippingInfo?.name || order?.user?.name || "Customer");
  const orderId = order._id;
  const trackLink = `https://cuztory.in/track-order?order_id=${orderId}`;

  // Get all item names
  const itemNames = order.orderItems?.map(item => cleanText(item.name)).join(", ") || "your item";

  let msg = "";

  if (type === "confirm") {
    msg = `📦 Cuztory – Order Confirmed\n\nHi ${name},\nthanks for your order!\n\nOrder ID: ${orderId}\n\nYour ${itemNames} is confirmed.`;

    // Only include customization line if any item has customization
    const hasCustomization = order.orderItems?.some(item => item.customization && item.customization.length > 0);
    if (hasCustomization) {
      msg += `\nOur team will contact you soon to confirm your customization details.`;
    }

    msg += `\nTrack your order here:\n${trackLink}\n\nIf you need any help, feel free to reply to this message at any time! 💬\n\nThank you for choosing Cuztory! 🙂`;
  } else if (type === "status") {
    msg = `🔄 *Order Status Update*\nOrder ID: ${orderId}\nStatus: ${order.orderStatus}\nTrack your order: ${trackLink}\nIf you have questions reply to this message.`;
  } else if (type === "cancel") {
    msg = `❌ *Order Cancelled*\nHi ${name},\nYour order (${orderId}) has been cancelled. If this is a mistake contact support.\nTrack your order: ${trackLink}`;
  }

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
};


  /**
   * Helper: build clean spec string
   */
  const extractSpecifications = (item) => {
    if (!item?.specifications || !Array.isArray(item.specifications) || item.specifications.length === 0) return "-";
    const arr = item.specifications
      .map((s) => {
        const k = cleanText(s.key || s.name || "");
        const v = cleanText(s.value || s.option || "");
        return k && v ? `${k}: ${v}` : null;
      })
      .filter(Boolean);
    return arr.length ? arr.join(", ") : "-";
  };

  /**
   * Helper: build clean customization string (filter blanks)
   */
  const extractCustomization = (item) => {
    if (!item?.customization || !Array.isArray(item.customization) || item.customization.length === 0) return "-";
    const arr = item.customization
      .map((c) => {
        // c may be { label, value } or { key, value } or simple string
        const label = cleanText(c.label || c.key || "");
        const value = c.value === 0 ? "0" : cleanText(c.value);
        if (!value) return null; // skip empty customization values
        return label ? `${label}: ${value}` : `${value}`;
      })
      .filter(Boolean);
    return arr.length ? arr.join(" | ") : "-";
  };

  // PDF generator — improved formatting & spacing
  const downloadInvoice = (order) => {
  if (!order) return;
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const left = 40;
    let cursorY = 40;

    doc.setFontSize(20);
    doc.text("Cuztory — Invoice", left, cursorY);
    cursorY += 28;

    doc.setFontSize(11);
    doc.text(`Order ID: ${order._id}`, left, cursorY);
    cursorY += 14;
    doc.text(`Placed At: ${new Date(order.createdAt).toLocaleString()}`, left, cursorY);
    cursorY += 18;

    const customerName = cleanText(order.user?.name || order.shippingInfo?.name || "Guest");
    const email = cleanText(order.user?.email || order.guestEmail || (order.shippingInfo?.email || ""));
    const phone = cleanText(order.shippingInfo?.phone || "");

    doc.text(`Customer: ${customerName}`, left, cursorY);
    cursorY += 14;
    doc.text(`Email: ${email || "N/A"}`, left, cursorY);
    cursorY += 14;
    doc.text(`Phone: ${phone || "N/A"}`, left, cursorY);
    cursorY += 18;

    // Shipping Address
    const shipping = order.shippingInfo || {};
    const postal = shipping.postalCode || shipping.pincode || shipping.postcode || "";
    const addressLines = [
      cleanText(shipping.name || ""),
      cleanText(shipping.address || ""),
      `${cleanText(shipping.city || "")}${shipping.city ? ", " : ""}${cleanText(
        shipping.state || ""
      )} ${postal ? `- ${cleanText(postal)}` : ""}`,
      cleanText(shipping.country || ""),
    ].filter(Boolean);

    doc.text("Shipping Address:", left, cursorY);
    cursorY += 14;
    const wrapped = doc.splitTextToSize(addressLines.join(", "), 500);
    doc.text(wrapped, left, cursorY);
    cursorY += wrapped.length * 12 + 10;

    // Items table
    const tableBody = (order.orderItems || []).map((item) => {
      const priceNum = typeof item.price === "number" ? item.price : Number(item.price || 0);
      return [
        cleanText(item.name || "-"),
        item.quantity || 1,
        `₹${priceNum.toFixed(2)}`,
        extractSpecifications(item),
        extractCustomization(item),
      ];
    });

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

    // ------- CLEAN PAYMENT SUMMARY SECTION -------
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
    // ------------------------------------------------------

    // Footer
    const footY = doc.internal.pageSize.height - 40;
    doc.setFontSize(9);
    doc.text("Thank you for choosing Cuztory.", left, footY);

    doc.save(`Invoice_${order._id}.pdf`);
  } catch (err) {
    console.error("PDF generation failed", err);
    alert("Failed to generate PDF");
  }
};


  // render
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
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Placed</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: "center" }}>No Orders</td></tr>
            ) : (
              orders.map((order) => {
                // show postal code intelligently
                const postal = order.shippingInfo?.postalCode || order.shippingInfo?.pincode || order.shippingInfo?.postcode || "";
                return (
                  <tr key={order._id}>
                    <td>{order._id}</td>
                    <td>
                      <div><strong>{order.user?.name || order.shippingInfo?.name || "Guest"}</strong></div>
                      <div style={{ fontSize: 12, color: "#666" }}>{order.user?.email || order.guestEmail || ""}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>📞 {order.shippingInfo?.phone || "N/A"}</div>
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
                          "Out for Delivery",
                          "Delivered",
                          "Failed Delivery",
                          "Cancelled",
                          "Returned",
                        ].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td>
                      <button className="btn-view" onClick={() => openDetails(order)}>👁 View</button>
                      <button className="btn-delete" onClick={() => deleteOrder(order._id)}>🗑 Delete</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}

      {/* modal */}
      {detailedOrder && (
        <div className="modal">
          <div className="modal-content-large">
            <h3>🧾 Order Details</h3>

            <div className="grid2">
              <div>
                <p><b>Order ID:</b> {detailedOrder._id}</p>
                <p><b>Status:</b> {detailedOrder.orderStatus}</p>
                <p><b>Placed At:</b> {new Date(detailedOrder.createdAt).toLocaleString()}</p>
              </div>

              <div>
                <p><b>Customer:</b> {detailedOrder.user?.name || detailedOrder.shippingInfo?.name || "Guest"}</p>
                <p><b>Email:</b> {detailedOrder.user?.email || detailedOrder.guestEmail}</p>
                <p><b>Phone:</b> {detailedOrder.shippingInfo?.phone}</p>
                <p><b>Pincode:</b> {detailedOrder.shippingInfo?.postalCode || detailedOrder.shippingInfo?.pincode || "N/A"}</p>
              </div>
            </div>

            <h4>📍 Shipping Info</h4>
            <p>
              {cleanText(detailedOrder.shippingInfo?.name || "")}<br />
              {cleanText(detailedOrder.shippingInfo?.address || "")}<br />
              {cleanText(detailedOrder.shippingInfo?.city || "")}, {cleanText(detailedOrder.shippingInfo?.state || "")} - {cleanText(detailedOrder.shippingInfo?.postalCode || detailedOrder.shippingInfo?.pincode || "")}
            </p>

            <h4>🛒 Items</h4>
            <ul className="item-list">
              {detailedOrder.orderItems.map((item, idx) => (
                <li key={idx}>
                  <b>{cleanText(item.name || "-")}</b> — ₹{(Number(item.price) || 0).toFixed(2)} × {item.quantity || 1}
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
            <p>Items: ₹{(Number(detailedOrder.itemsPrice)||0).toFixed(2)}</p>
            <p>Shipping: ₹{(Number(detailedOrder.shippingPrice)||0).toFixed(2)}</p>
            <p>Discount: ₹{(Number(detailedOrder.discount)||0).toFixed(2)}</p>
            <p><b>Total: ₹{(Number(detailedOrder.totalPrice)||0).toFixed(2)}</b></p>
            <p><b>Paid: ₹{(Number(detailedOrder.amountPaid)||0).toFixed(2)}</b></p>
            <p>Due: ₹{(Number(detailedOrder.amountDue)||0).toFixed(2)}</p>

            <div className="actions-row">
              <button className="btn" onClick={() => downloadInvoice(detailedOrder)}>📄 Download PDF</button>
              <button className="btn" onClick={() => sendWhatsApp(detailedOrder, "confirm")}>WhatsApp Confirm</button>
              <button className="btn" onClick={() => sendWhatsApp(detailedOrder, "status")}>WhatsApp Status</button>
              <button className="btn" onClick={() => sendWhatsApp(detailedOrder, "cancel")}>WhatsApp Cancel</button>
              <button className="btn-close" onClick={closeDetails}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}