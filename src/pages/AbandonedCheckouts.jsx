import { useEffect, useState } from "react";
import axios from "axios";
import "./AbandonedCheckouts.css";

export default function AbandonedCheckouts() {
    const [checkouts, setCheckouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedCheckout, setSelectedCheckout] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const fetchCheckouts = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem("adminToken");

            const { data } = await axios.get(
                "http://localhost:5000/api/admin/abandoned-checkouts",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            // Defensive check: ensure data and checkouts array exist
            setCheckouts(data?.checkouts || []);
        } catch (err) {
            console.error("Error fetching checkouts:", err);
            setError("Failed to load abandoned checkouts. Please check your connection or login session.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCheckouts();
    }, []);

    if (loading) return <div className="abandoned-page"><h2>Loading...</h2></div>;
    if (error) return <div className="abandoned-page"><h2 style={{ color: "#e53935" }}>{error}</h2></div>;

    return (
        <div className="abandoned-page">
            <h1>Abandoned Checkouts</h1>

            {checkouts.length === 0 ? (
                <p>No abandoned checkouts found.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Payment</th>
                            <th>Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {checkouts.map((checkout) => (
                            <tr key={checkout._id || Math.random()}>
                                <td>
                                    <strong>
                                        {checkout.shippingInfo?.name || "Guest"}
                                    </strong>
                                    <br />
                                    {checkout.shippingInfo?.email || "No Email"}
                                    <br />
                                    {checkout.shippingInfo?.phone || "No Phone"}
                                </td>

                                <td>
                                    {checkout.orderItems?.length || 0}
                                </td>

                                <td>
                                    ₹{checkout.totalPrice ?? 0}
                                </td>

                                <td>
                                    {checkout.paymentInfo?.method || "N/A"}
                                </td>

                                <td>
                                    {checkout.createdAt
                                        ? new Date(checkout.createdAt).toLocaleString()
                                        : "N/A"}
                                </td>

                                <td>
                                    <button
                                        className="view-btn"
                                        onClick={() => {
                                            setSelectedCheckout(checkout);
                                            setShowModal(true);
                                        }}
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* MODAL */}
            {showModal && selectedCheckout && (
                <div 
                    className="modal-overlay" 
                    onClick={() => setShowModal(false)}
                >
                    <div 
                        className="checkout-modal" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2>Abandoned Checkout</h2>
                            <button
                                className="close-btn"
                                onClick={() => setShowModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <h3>Customer Details</h3>
                        <p><strong>Name:</strong> {selectedCheckout.shippingInfo?.name || "Guest"}</p>
                        <p><strong>Email:</strong> {selectedCheckout.shippingInfo?.email || "N/A"}</p>
                        <p><strong>Phone:</strong> {selectedCheckout.shippingInfo?.phone || "N/A"}</p>
                        <p>
                            <strong>Address:</strong>{" "}
                            {selectedCheckout.shippingInfo?.address || "N/A"},{" "}
                            {selectedCheckout.shippingInfo?.city || ""}
                        </p>

                        <hr />

                        <h3>Products</h3>
                        {(!selectedCheckout.orderItems || selectedCheckout.orderItems.length === 0) ? (
                            <p>No products attached to this checkout.</p>
                        ) : (
                            selectedCheckout.orderItems.map((item, index) => (
                                <div key={index} className="product-card">
                                    {item?.image && (
                                        <img
                                            src={item.image}
                                            alt={item.name || "Product"}
                                        />
                                    )}
                                    <div>
                                        <h4>{item?.name || "Unnamed Product"}</h4>
                                        <p>₹ {item?.price ?? 0}</p>
                                        <p>Qty: {item?.quantity ?? 1}</p>

                                        {Array.isArray(item?.specifications) && item.specifications.length > 0 && (
                                            <div>
                                                <strong>Variants:</strong>
                                                {item.specifications.map((s, i) => (
                                                    <p key={i}>
                                                        {s?.key} : {s?.value}
                                                    </p>
                                                ))}
                                            </div>
                                        )}

                                        {Array.isArray(item?.customization) && item.customization.length > 0 && (
                                            <div>
                                                <strong>Customization:</strong>
                                                {item.customization.map((c, i) => (
                                                    <p key={i}>
                                                        {c?.label} : {c?.value}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        <hr />

                        <h3>Payment Summary</h3>
                        <p>
                            <strong>Method:</strong>{" "}
                            {selectedCheckout.paymentInfo?.method || "N/A"}
                        </p>
                        <p>
                            <strong>Total:</strong> ₹ {selectedCheckout.totalPrice ?? 0}
                        </p>
                        <p>
                            <strong>Amount Paid:</strong> ₹ {selectedCheckout.amountPaid ?? 0}
                        </p>
                        <p>
                            <strong>Amount Due:</strong> ₹ {selectedCheckout.amountDue ?? 0}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}