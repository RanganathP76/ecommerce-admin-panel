import React, { useEffect, useRef, useState } from "react";
import api from "../utils/axiosInstance"; // ✅ using your axios instance
import "./AdminCollections.css";

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [formData, setFormData] = useState({ name: "", description: "", image: null });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch all collections + products
  const fetchCollections = async () => {
    try {
      const res = await api.get("/collections");
      const withProducts = await Promise.all(
        res.data.map(async (col) => {
          const colRes = await api.get(`/collections/${col._id}`);
          return { ...col, products: colRes.data.products || [] };
        })
      );
      setCollections(withProducts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  // Add/Edit Collection
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Name is required");
      return;
    }

    const fd = new FormData();
    fd.append("name", formData.name);
    fd.append("description", formData.description);
    if (formData.image) {
      fd.append("file", formData.image); // backend expects `req.file`
    }

    try {
      setLoading(true);
      if (isEditing) {
        await api.put(`/collections/admin/edit/${editId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        await api.post("/collections/admin/create", fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }
      resetForm();
      fetchCollections();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", image: null });
    setIsEditing(false);
    setEditId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEdit = (col) => {
    setFormData({ name: col.name, description: col.description, image: null });
    setIsEditing(true);
    setEditId(col._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure?")) {
      try {
        await api.delete(`/collections/admin/delete/${id}`);
        fetchCollections();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const removeFile = () => {
    setFormData({ ...formData, image: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="admin-collections">
      <h2>{isEditing ? "Edit Collection" : "Add New Collection"}</h2>

      {/* Add/Edit Form */}
      <form className="collection-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Collection Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />

        <div className="file-input-wrapper">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
          />
          {formData.image && (
            <button type="button" className="remove-file-btn" onClick={removeFile}>
              Remove File
            </button>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : isEditing ? "Update Collection" : "Add Collection"}
          </button>
          {isEditing && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Collections List */}
      <div className="collections-list">
        {collections.map((col) => (
          <div className="collection-card" key={col._id}>
            <img src={col.image?.url} alt={col.name} />
            <h3>{col.name}</h3>
            <p>{col.description}</p>
            <div className="collection-actions">
              <button className="edit-btn" onClick={() => handleEdit(col)}>Edit</button>
              <button className="delete-btn" onClick={() => handleDelete(col._id)}>Delete</button>
            </div>

            {/* Products */}
            <div className="products-list">
              {col.products.length > 0 ? (
                col.products.map((prod) => (
                  <div className="product-card" key={prod._id}>
                    <img
                      src={
                        prod.images?.[0]?.url ||
                        prod.image?.url ||
                        "https://via.placeholder.com/90"
                      }
                      alt={prod.name || prod.title || "Product"}
                    />
                    <p className="product-title">{prod.name || prod.title || "Unnamed"}</p>
                    <span>₹{prod.price || 0}</span>
                  </div>
                ))
              ) : (
                <p className="no-products">No products</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
