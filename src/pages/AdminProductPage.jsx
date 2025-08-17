import React, { useEffect, useState, useRef } from "react";
import api from "../utils/axiosInstance"; // token auto added
import "./AdminProductPage.css";

export default function AdminProductPage() {
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    collection: "",
    isCustomizable: false,
    customizationFields: [],
    productImages: []
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch products & collections
  const fetchProducts = async () => {
    try {
      const res = await api.get("/products");
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await api.get("/collections");
      setCollections(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCollections();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({
      ...prev,
      productImages: [...prev.productImages, ...files]
    }));
  };

  const removeImage = (index) => {
    setFormData((prev) => {
      const updated = [...prev.productImages];
      updated.splice(index, 1);
      return { ...prev, productImages: updated };
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle customization field add
  const addCustomizationField = () => {
    setFormData((prev) => ({
      ...prev,
      customizationFields: [...prev.customizationFields, { label: "", type: "text" }]
    }));
  };

  const updateCustomizationField = (index, key, value) => {
    setFormData((prev) => {
      const updated = [...prev.customizationFields];
      updated[index][key] = value;
      return { ...prev, customizationFields: updated };
    });
  };

  const removeCustomizationField = (index) => {
    setFormData((prev) => {
      const updated = [...prev.customizationFields];
      updated.splice(index, 1);
      return { ...prev, customizationFields: updated };
    });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    const fd = new FormData();
    fd.append("title", formData.title);
    fd.append("description", formData.description);
    fd.append("price", formData.price);
    fd.append("category", formData.category);
    fd.append("collection", formData.collection);
    fd.append("isCustomizable", formData.isCustomizable);
    fd.append("customizationFields", JSON.stringify(formData.customizationFields));

    formData.productImages.forEach((file) => {
      fd.append("productImages", file);
    });

    try {
      setLoading(true);
      if (isEditing) {
        await api.put(`/products/admin/edit/${editId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        await api.post("/products/add", fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }
      resetForm();
      fetchProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Edit
  const handleEdit = (prod) => {
    setFormData({
      title: prod.title,
      description: prod.description,
      price: prod.price,
      category: prod.category,
      collection: prod.collection || "",
      isCustomizable: prod.isCustomizable,
      customizationFields: prod.customizationFields || [],
      productImages: []
    });
    setIsEditing(true);
    setEditId(prod._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Delete
  const handleDelete = async (id) => {
    if (window.confirm("Delete this product?")) {
      try {
        await api.delete(`/products/admin/delete/${id}`);
        fetchProducts();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      price: "",
      category: "",
      collection: "",
      isCustomizable: false,
      customizationFields: [],
      productImages: []
    });
    setIsEditing(false);
    setEditId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="admin-products">
      <h2>{isEditing ? "Edit Product" : "Add Product"}</h2>

      {/* Product Form */}
      <form className="product-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <input
          type="number"
          placeholder="Price"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
        />
        <input
          type="text"
          placeholder="Category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        />
        <select
          value={formData.collection}
          onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
        >
          <option value="">Select Collection</option>
          {collections.map((col) => (
            <option key={col._id} value={col._id}>{col.name}</option>
          ))}
        </select>

        <label>
          <input
            type="checkbox"
            checked={formData.isCustomizable}
            onChange={(e) => setFormData({ ...formData, isCustomizable: e.target.checked })}
          />
          Customizable
        </label>

        {formData.isCustomizable && (
          <div className="customization-fields">
            <h4>Customization Fields</h4>
            {formData.customizationFields.map((field, i) => (
              <div key={i} className="custom-field">
                <input
                  type="text"
                  placeholder="Label"
                  value={field.label}
                  onChange={(e) => updateCustomizationField(i, "label", e.target.value)}
                />
                <select
                  value={field.type}
                  onChange={(e) => updateCustomizationField(i, "type", e.target.value)}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="file">File Upload</option>
                </select>
                <button type="button" onClick={() => removeCustomizationField(i)}>X</button>
              </div>
            ))}
            <button type="button" onClick={addCustomizationField}>+ Add Field</button>
          </div>
        )}

        <div className="file-input-wrapper">
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
        {formData.productImages.length > 0 && (
          <div className="preview-images">
            {formData.productImages.map((file, index) => (
              <div key={index} className="preview-image">
                <img src={URL.createObjectURL(file)} alt="preview" />
                <button type="button" onClick={() => removeImage(index)}>Remove</button>
              </div>
            ))}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : isEditing ? "Update Product" : "Add Product"}
          </button>
          {isEditing && <button type="button" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      {/* Product List */}
      <h2>All Products</h2>
      <div className="products-list">
        {products.map((prod) => (
          <div className="product-card" key={prod._id}>
            <img src={prod.images?.[0] || "https://via.placeholder.com/150"} alt={prod.title} />
            <h4>{prod.title}</h4>
            <p>₹{prod.price}</p>
            <p>{prod.category}</p>
            <div className="product-actions">
              <button onClick={() => handleEdit(prod)}>Edit</button>
              <button onClick={() => handleDelete(prod._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
