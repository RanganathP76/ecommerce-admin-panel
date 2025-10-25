import React, { useEffect, useRef, useState } from "react";
import api from "../utils/axiosInstance"; // ✅ using your axios instance
import "./AdminBanners.css";

export default function AdminBannersPage() {
  const [banners, setBanners] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    link: "",
    image: null,
    isActive: true,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch all banners
  const fetchBanners = async () => {
    try {
      const res = await api.get("/banners");
      setBanners(res.data || []);
    } catch (err) {
      console.error("Fetch Banners Error:", err);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Add/Edit Banner
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      alert("Title is required");
      return;
    }

    const fd = new FormData();
    fd.append("title", formData.title);
    fd.append("subtitle", formData.subtitle);
    fd.append("link", formData.link);
    fd.append("isActive", formData.isActive);
    if (formData.image) {
      fd.append("file", formData.image); // backend expects `req.file`
    }

    try {
      setLoading(true);
      if (isEditing) {
        await api.put(`/banners/admin/edit/${editId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/banners/admin/create", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      resetForm();
      fetchBanners();
    } catch (err) {
      console.error("Submit Banner Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "",
      link: "",
      image: null,
      isActive: true,
    });
    setIsEditing(false);
    setEditId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Edit Banner
  const handleEdit = (banner) => {
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle,
      link: banner.link,
      image: null,
      isActive: banner.isActive,
    });
    setIsEditing(true);
    setEditId(banner._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Delete Banner
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this banner?")) {
      try {
        await api.delete(`/banners/admin/delete/${id}`);
        fetchBanners();
      } catch (err) {
        console.error("Delete Banner Error:", err);
      }
    }
  };

  // Remove selected file
  const removeFile = () => {
    setFormData({ ...formData, image: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="admin-banners">
      <h2>{isEditing ? "Edit Banner" : "Add New Banner"}</h2>

      {/* Add/Edit Form */}
      <form className="banner-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Banner Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
        <input
          type="text"
          placeholder="Subtitle (optional)"
          value={formData.subtitle}
          onChange={(e) =>
            setFormData({ ...formData, subtitle: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Link (optional)"
          value={formData.link}
          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
        />

        <div className="file-input-wrapper">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={(e) =>
              setFormData({ ...formData, image: e.target.files[0] })
            }
          />
          {formData.image && (
            <button type="button" className="remove-file-btn" onClick={removeFile}>
              Remove File
            </button>
          )}
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) =>
              setFormData({ ...formData, isActive: e.target.checked })
            }
          />
          Active
        </label>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading
              ? "Saving..."
              : isEditing
              ? "Update Banner"
              : "Add Banner"}
          </button>
          {isEditing && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Banners List */}
      <div className="banners-list">
        {banners.map((banner) => (
          <div className="banner-card" key={banner._id}>
            <img src={banner.image?.url} alt={banner.title} />
            <div className="banner-info">
              <h3>{banner.title}</h3>
              <p>{banner.subtitle || "—"}</p>
              {banner.link && (
                <a href={banner.link} target="_blank" rel="noreferrer">
                  {banner.link}
                </a>
              )}
              <span className={`status ${banner.isActive ? "active" : "inactive"}`}>
                {banner.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="banner-actions">
              <button className="edit-btn" onClick={() => handleEdit(banner)}>
                Edit
              </button>
              <button className="delete-btn" onClick={() => handleDelete(banner._id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
