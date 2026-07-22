import { useEffect, useState } from "react";
import axios from "axios";
import "./AbandonedCheckouts.css";

export default function AbandonedCheckouts() {

    const [checkouts, setCheckouts] = useState([]);
const [loading, setLoading] = useState(true);

const [selectedCheckout, setSelectedCheckout] = useState(null);
const [showModal, setShowModal] = useState(false);

    const fetchCheckouts = async () => {

        try {

            const token = localStorage.getItem("adminToken");

            const { data } = await axios.get(
                "http://localhost:5000/api/admin/abandoned-checkouts",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setCheckouts(data.checkouts);

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        fetchCheckouts();

    }, []);

    if (loading)
        return <h2>Loading...</h2>;

    return (

        <div className="abandoned-page">

            <h1>Abandoned Checkouts</h1>

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

                        <tr key={checkout._id}>

                            <td>

                                <strong>

                                    {checkout.shippingInfo?.name || "Guest"}

                                </strong>

                                <br />

                                {checkout.shippingInfo?.email}

                                <br />

                                {checkout.shippingInfo?.phone}

                            </td>

                            <td>

                                {checkout.orderItems.length}

                            </td>

                            <td>

                                ₹{checkout.totalPrice}

                            </td>

                            <td>

                                {checkout.paymentInfo?.method}

                            </td>

                            <td>

                                {new Date(
                                    checkout.createdAt
                                ).toLocaleString()}

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
</button>                </td>

                        </tr>

                    ))}

                </tbody>

            </table>

{showModal && selectedCheckout && (

<div className="modal-overlay">

    <div className="checkout-modal">

        <div className="modal-header">

            <h2>Abandoned Checkout</h2>

            <button
                className="close-btn"
                onClick={() => setShowModal(false)}
            >
                ✕
            </button>

        </div>

        <h3>Customer</h3>

        <p><strong>Name:</strong> {selectedCheckout.shippingInfo?.name}</p>

        <p><strong>Email:</strong> {selectedCheckout.shippingInfo?.email}</p>

        <p><strong>Phone:</strong> {selectedCheckout.shippingInfo?.phone}</p>

        <p>
            <strong>Address:</strong>{" "}
            {selectedCheckout.shippingInfo?.address},{" "}
            {selectedCheckout.shippingInfo?.city}
        </p>

        <hr />

        <h3>Products</h3>

        {selectedCheckout.orderItems.map((item, index) => (

            <div
                key={index}
                className="product-card"
            >

                <img
                    src={item.image}
                    alt={item.name}
                />

                <div>

                    <h4>{item.name}</h4>

                    <p>₹ {item.price}</p>

                    <p>Qty : {item.quantity}</p>

                    {item.specifications?.length > 0 && (

                        <div>

                            <strong>Variants</strong>

                            {item.specifications.map((s, i) => (

                                <p key={i}>
                                    {s.key} : {s.value}
                                </p>

                            ))}

                        </div>

                    )}

                    {item.customization?.length > 0 && (

                        <div>

                            <strong>Customization</strong>

                            {item.customization.map((c, i) => (

                                <p key={i}>
                                    {c.label} : {c.value}
                                </p>

                            ))}

                        </div>

                    )}

                </div>

            </div>

        ))}

        <hr />

        <h3>Payment</h3>

        <p>

            <strong>Method:</strong>{" "}

            {selectedCheckout.paymentInfo?.method}

        </p>

        <p>

            <strong>Total:</strong>

            ₹ {selectedCheckout.totalPrice}

        </p>

        <p>

            <strong>Amount Paid:</strong>

            ₹ {selectedCheckout.amountPaid}

        </p>

        <p>

            <strong>Amount Due:</strong>

            ₹ {selectedCheckout.amountDue}

        </p>

    </div>

</div>

)}

        </div>

    );

}