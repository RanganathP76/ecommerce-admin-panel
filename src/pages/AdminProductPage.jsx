import React, { useEffect, useState, useRef } from "react";
import api from "../utils/axiosInstance";
import "./AdminProductPage.css";

export default function AdminProductPage() {
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [formData, setFormData] = useState(initialFormData());
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null); // ✅ New ref for videos

  // Drag & drop states
  const dragItemExisting = useRef(null);
  const dragOverExisting = useRef(null);
  const [dragOverExistingIndex, setDragOverExistingIndex] = useState(null);

  const dragItemNew = useRef(null);
  const dragOverNew = useRef(null);
  const [dragOverNewIndex, setDragOverNewIndex] = useState(null);

  function initialFormData() {
    return {
      title: "",
      description: [
  { headline: "", text: "", image: "", video: "" }
],

      price: "",
      comparePrice: "",
      category: "",
      collection: "",
      isCustomizable: false,
      customizationFields: [],
      specifications: [],
      stock: 0,

      // Media
      productImages: [],
      existingImages: [],
      productVideos: [], // ✅ new
      existingVideos: [], // ✅ new

      // Reviews
      reviews: [],
      reviewsToDelete: [],
    };
  }

  // Fetch products & collections
  const fetchProducts = async () => {
    try {
      const res = await api.get("/products?forAdmin=true");
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

  // =========================
  // IMAGE HANDLERS
  // =========================
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({ ...prev, productImages: [...prev.productImages, ...files] }));
  };

  const removeNewImage = (index) => {
    setFormData((prev) => {
      const updated = [...prev.productImages];
      updated.splice(index, 1);
      return { ...prev, productImages: updated };
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeExistingImage = (index) => {
    setFormData((prev) => {
      const updated = [...prev.existingImages];
      updated.splice(index, 1);
      return { ...prev, existingImages: updated };
    });
  };

  // Drag & drop handlers
  const handleDragStartExisting = (index) => (dragItemExisting.current = index);
  const handleDragEnterExisting = (index) => {
    dragOverExisting.current = index;
    setDragOverExistingIndex(index);
  };
  const handleDragEndExisting = () => {
    const from = dragItemExisting.current;
    const to = dragOverExisting.current;
    if (from == null || to == null) return;
    const list = Array.from(formData.existingImages);
    const draggedItem = list.splice(from, 1)[0];
    list.splice(to, 0, draggedItem);
    setFormData((prev) => ({ ...prev, existingImages: list }));
    setDragOverExistingIndex(null);
    dragItemExisting.current = null;
    dragOverExisting.current = null;
  };

  const handleDragStartNew = (index) => (dragItemNew.current = index);
  const handleDragEnterNew = (index) => {
    dragOverNew.current = index;
    setDragOverNewIndex(index);
  };
  const handleDragEndNew = () => {
    const from = dragItemNew.current;
    const to = dragOverNew.current;
    if (from == null || to == null) return;
    const list = Array.from(formData.productImages);
    const draggedItem = list.splice(from, 1)[0];
    list.splice(to, 0, draggedItem);
    setFormData((prev) => ({ ...prev, productImages: list }));
    setDragOverNewIndex(null);
    dragItemNew.current = null;
    dragOverNew.current = null;
  };

  // =========================
  // VIDEO HANDLERS
  // =========================
  const handleVideoChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({ ...prev, productVideos: [...prev.productVideos, ...files] }));
  };

  const removeNewVideo = (index) => {
    setFormData((prev) => {
      const updated = [...prev.productVideos];
      updated.splice(index, 1);
      return { ...prev, productVideos: updated };
    });
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const removeExistingVideo = (index) => {
    setFormData((prev) => {
      const updated = [...prev.existingVideos];
      updated.splice(index, 1);
      return { ...prev, existingVideos: updated };
    });
  };

  // =========================
  // CUSTOMIZATION + SPECS
  // =========================
  const addCustomizationField = () =>
    setFormData((prev) => ({ ...prev, customizationFields: [...prev.customizationFields, { label: "", type: "text" }] }));
  const updateCustomizationField = (index, key, value) =>
    setFormData((prev) => {
      const updated = [...prev.customizationFields];
      updated[index][key] = value;
      return { ...prev, customizationFields: updated };
    });
  const removeCustomizationField = (index) =>
    setFormData((prev) => {
      const updated = [...prev.customizationFields];
      updated.splice(index, 1);
      return { ...prev, customizationFields: updated };
    });

  const addSpecification = () =>
    setFormData((prev) => ({ ...prev, specifications: [...prev.specifications, { key: "", values: [] }] }));
  const updateSpecificationKey = (index, value) =>
    setFormData((prev) => {
      const updated = [...prev.specifications];
      updated[index].key = value;
      return { ...prev, specifications: updated };
    });
  const addSpecValue = (specIndex) =>
    setFormData((prev) => {
      const updated = [...prev.specifications];
      updated[specIndex].values.push({ value: "", stock: 0 });
      return { ...prev, specifications: updated };
    });
  const updateSpecValue = (specIndex, valIndex, key, value) =>
    setFormData((prev) => {
      const updated = [...prev.specifications];
      updated[specIndex].values[valIndex][key] = key === "stock" ? Number(value) : value;
      return { ...prev, specifications: updated };
    });
  const removeSpecValue = (specIndex, valIndex) =>
    setFormData((prev) => {
      const updated = [...prev.specifications];
      updated[specIndex].values.splice(valIndex, 1);
      return { ...prev, specifications: updated };
    });
  const removeSpecification = (index) =>
    setFormData((prev) => {
      const updated = [...prev.specifications];
      updated.splice(index, 1);
      return { ...prev, specifications: updated };
    });

  // =========================
  // REVIEWS
  // =========================
  const addReview = () => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setFormData((prev) => ({
      ...prev,
      reviews: [...prev.reviews, { tempId, name: "", rating: 5, comment: "", images: [], newImages: [] }],
    }));
  };

  const updateReview = (index, key, value) => {
    setFormData((prev) => {
      const updated = [...prev.reviews];
      updated[index][key] = value;
      return { ...prev, reviews: updated };
    });
  };

  const handleReviewImageUpload = (index, files) => {
    setFormData((prev) => {
      const updated = [...prev.reviews];
      updated[index].newImages = [...(updated[index].newImages || []), ...files];
      return { ...prev, reviews: updated };
    });
  };

  const removeReview = (index) => {
    setFormData((prev) => {
      const updated = [...prev.reviews];
      const [removed] = updated.splice(index, 1);
      const toDelete = [...prev.reviewsToDelete];
      if (removed && removed._id) toDelete.push(removed._id);
      return { ...prev, reviews: updated, reviewsToDelete: toDelete };
    });
  };

  const removeReviewExistingImage = (reviewIndex, imgIndex) => {
    setFormData((prev) => {
      const updated = [...prev.reviews];
      const review = { ...updated[reviewIndex] };
      review.images = (review.images || []).filter((_, i) => i !== imgIndex);
      updated[reviewIndex] = review;
      return { ...prev, reviews: updated };
    });
  };

  const removeReviewNewImage = (reviewIndex, fileIndex) => {
    setFormData((prev) => {
      const updated = [...prev.reviews];
      const review = { ...updated[reviewIndex] };
      review.newImages = (review.newImages || []).filter((_, i) => i !== fileIndex);
      updated[reviewIndex] = review;
      return { ...prev, reviews: updated };
    });
  };

  // =========================
  // SUBMIT FORM
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const fd = new FormData();
    fd.append("title", formData.title);
    fd.append("description", JSON.stringify(formData.description.map(d => ({
  headline: d.headline,
  text: d.text,
  image: typeof d.image === "string" ? d.image : "",
  video: typeof d.video === "string" ? d.video : "",
}))));

// Upload new description media files
formData.description.forEach((d) => {
  if (d.image && typeof d.image !== "string") fd.append("descriptionImages", d.image);
  if (d.video && typeof d.video !== "string") fd.append("descriptionVideos", d.video);
});

    fd.append("price", formData.price);
    fd.append("comparePrice", formData.comparePrice);
    fd.append("category", formData.category);
    fd.append("collection", formData.collection);
    fd.append("isCustomizable", formData.isCustomizable);
    fd.append("customizationFields", JSON.stringify(formData.customizationFields));
    fd.append("specifications", JSON.stringify(formData.specifications || []));
    fd.append("stock", formData.stock || 0);

    // ✅ Images & Videos
    fd.append("images", JSON.stringify(formData.existingImages));
    fd.append("videos", JSON.stringify(formData.existingVideos));
    formData.productImages.forEach((f) => fd.append("productImages", f));
    formData.productVideos.forEach((f) => fd.append("productVideos", f));

    // ✅ Reviews
    const reviewsPayload = formData.reviews.map(({ newImages, ...rest }) => rest);
    fd.append("reviews", JSON.stringify(reviewsPayload));
    fd.append("reviewsToDelete", JSON.stringify(formData.reviewsToDelete || []));
    formData.reviews.forEach((r) => {
      const files = r.newImages || [];
      const key = `review_${r._id || r.tempId}`;
      files.forEach((f) => fd.append(key, f));
    });

    try {
      setLoading(true);
      if (isEditing) {
        await api.put(`/products/admin/edit/${editId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.post(`/products/add`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      resetForm();
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // EDIT PRODUCT
  // =========================
  const handleEdit = (prod) => {
    const mappedReviews = (prod.reviews || []).map((r) => ({ ...r, newImages: [] }));
    setFormData({
      title: prod.title || "",
      description:
  Array.isArray(prod.description) && prod.description.length > 0
    ? prod.description.map((d) => ({
        headline: d.headline || "",
        text: d.text || "",
        image: d.image || "",
        video: d.video || "",
      }))
    : [{ headline: "", text: "", image: "", video: "" }],

      price: prod.price || "",
      comparePrice: prod.comparePrice || "",
      category: prod.category || "",
      collection: prod.collection || "",
      isCustomizable: !!prod.isCustomizable,
      customizationFields: prod.customizationFields || [],
      specifications: prod.specifications || [],
      stock: prod.stock || 0,
      productImages: [],
      existingImages: prod.images || [],
      productVideos: [], // ✅ added
      existingVideos: prod.videos || [], // ✅ added
      reviews: mappedReviews,
      reviewsToDelete: [],
    });
    setIsEditing(true);
    setEditId(prod._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  // =========================
  // DELETE + RESET
  // =========================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/admin/delete/${id}`);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  const resetForm = () => {
    setFormData(initialFormData());
    setIsEditing(false);
    setEditId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  // =========================
  // JSX
  // =========================
  return (
    <div className="admin-products">
      <h2>{isEditing ? "Edit Product" : "Add Product"}</h2>

      <form className="product-form" onSubmit={handleSubmit}>
        {/* Basic fields */}
        <input type="text" placeholder="Title" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} required />
        <div className="description-section">
  <h4>Product Description (multi-part)</h4>
  {formData.description.map((desc, i) => (
    <div key={i} className="desc-part">
      <input
        type="text"
        placeholder="Headline"
        value={desc.headline}
        onChange={(e) => {
          const updated = [...formData.description];
          updated[i].headline = e.target.value;
          setFormData({ ...formData, description: updated });
        }}
      />
      <textarea
        placeholder="Text Description"
        value={desc.text}
        onChange={(e) => {
          const updated = [...formData.description];
          updated[i].text = e.target.value;
          setFormData({ ...formData, description: updated });
        }}
      />

      {/* Image Upload */}
<label>Image:</label>
<input
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files[0];
    const updated = [...formData.description];
    updated[i].image = file;
    setFormData({ ...formData, description: updated });
  }}
/>

{desc.image && (
  <div className="desc-media-preview">
    {typeof desc.image === "string" ? (
      <img src={desc.image} alt="desc" style={{ width: 120, marginTop: 8 }} />
    ) : (
      <img
        src={URL.createObjectURL(desc.image)}
        alt="desc"
        style={{ width: 120, marginTop: 8 }}
      />
    )}
    <button
      type="button"
      className="remove-media-btn"
      onClick={() => {
        const updated = [...formData.description];
        updated[i].image = "";
        setFormData({ ...formData, description: updated });
      }}
    >
      Remove Image
    </button>
  </div>
)}

{/* Video Upload */}
<label>Video:</label>
<input
  type="file"
  accept="video/*"
  onChange={(e) => {
    const file = e.target.files[0];
    const updated = [...formData.description];
    updated[i].video = file;
    setFormData({ ...formData, description: updated });
  }}
/>

{desc.video && (
  <div className="desc-media-preview">
    {typeof desc.video === "string" ? (
      <video src={desc.video} controls width={180} style={{ marginTop: 8 }} />
    ) : (
      <video
        src={URL.createObjectURL(desc.video)}
        controls
        width={180}
        style={{ marginTop: 8 }}
      />
    )}
    <button
      type="button"
      className="remove-media-btn"
      onClick={() => {
        const updated = [...formData.description];
        updated[i].video = "";
        setFormData({ ...formData, description: updated });
      }}
    >
      Remove Video
    </button>
  </div>
)}


      <button
        type="button"
        onClick={() => {
          const updated = [...formData.description];
          updated.splice(i, 1);
          setFormData({ ...formData, description: updated });
        }}
      >
        Remove Section
      </button>
    </div>
  ))}

  <button
    type="button"
    onClick={() =>
      setFormData((prev) => ({
        ...prev,
        description: [...prev.description, { headline: "", text: "", image: "", video: "" }],
      }))
    }
  >
    + Add Description Part
  </button>
</div>

        <input type="number" placeholder="Price" value={formData.price} onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))} required />
        <input type="number" placeholder="Compare Price" value={formData.comparePrice} onChange={(e) => setFormData((p) => ({ ...p, comparePrice: e.target.value }))} />
        <input type="text" placeholder="Category" value={formData.category} onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))} />

        <select value={formData.collection} onChange={(e) => setFormData((p) => ({ ...p, collection: e.target.value }))}>
          <option value="">Select Collection</option>
          {collections.map((col) => (
            <option key={col._id} value={col._id}>{col.name}</option>
          ))}
        </select>

        <label>
          <input type="checkbox" checked={formData.isCustomizable} onChange={(e) => setFormData((p) => ({ ...p, isCustomizable: e.target.checked }))} /> Customizable
        </label>

        {/* Customization Fields */}
        {formData.isCustomizable && (
          <div className="customization-fields">
            <h4>Customization Fields</h4>
            {formData.customizationFields.map((field, i) => (
              <div key={i} className="custom-field">
                <input type="text" placeholder="Label" value={field.label} onChange={(e) => updateCustomizationField(i, "label", e.target.value)} />
                <select value={field.type} onChange={(e) => updateCustomizationField(i, "type", e.target.value)}>
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

        {/* Stock */}
        {formData.specifications.length === 0 && (
          <div className="simple-stock">
            <h4>Stock</h4>
            <input type="number" placeholder="Stock" value={formData.stock} onChange={(e) => setFormData((p) => ({ ...p, stock: Number(e.target.value) }))} />
          </div>
        )}

        {/* Specifications */}
        <div className="specifications">
          <h4>Specifications</h4>
          {formData.specifications.map((spec, i) => (
            <div key={i} className="spec-block">
              <input type="text" placeholder="Spec Key" value={spec.key} onChange={(e) => updateSpecificationKey(i, e.target.value)} />
              <div className="spec-values">
                {spec.values.map((val, j) => (
                  <div key={j} className="spec-value">
                    <input type="text" placeholder="Value" value={val.value} onChange={(e) => updateSpecValue(i, j, "value", e.target.value)} />
                    <input type="number" placeholder="Stock" value={val.stock} onChange={(e) => updateSpecValue(i, j, "stock", e.target.value)} />
                    <button type="button" onClick={() => removeSpecValue(i, j)}>X</button>
                  </div>
                ))}
                <button type="button" onClick={() => addSpecValue(i)}>+ Add Value</button>
              </div>
              <button type="button" onClick={() => removeSpecification(i)}>Remove Spec</button>
            </div>
          ))}
          <button type="button" onClick={addSpecification}>+ Add Specification</button>
        </div>

        {/* IMAGES */}
        <div className="images-section">
          <h4>Images</h4>
          <div className="existing-images">
            {formData.existingImages.map((img, i) => (
              <div key={i} className={`preview-image ${dragOverExistingIndex === i ? "drag-over" : ""}`} draggable onDragStart={() => handleDragStartExisting(i)} onDragEnter={() => handleDragEnterExisting(i)} onDragOver={(e) => e.preventDefault()} onDragEnd={handleDragEndExisting}>
                <img src={img} alt="existing" />
                <button type="button" onClick={() => removeExistingImage(i)}>Remove</button>
              </div>
            ))}
          </div>

          <div className="file-input-wrapper">
            <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFileChange} />
          </div>

          {formData.productImages.length > 0 && (
            <div className="preview-images">
              {formData.productImages.map((file, index) => (
                <div key={index} className={`preview-image ${dragOverNewIndex === index ? "drag-over" : ""}`} draggable onDragStart={() => handleDragStartNew(index)} onDragEnter={() => handleDragEnterNew(index)} onDragOver={(e) => e.preventDefault()} onDragEnd={handleDragEndNew}>
                  <img src={URL.createObjectURL(file)} alt="preview" />
                  <button type="button" onClick={() => removeNewImage(index)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ✅ VIDEOS SECTION */}
        <div className="videos-section">
          <h4>Videos</h4>

          <div className="existing-videos">
            {formData.existingVideos.map((vid, i) => (
              <div key={i} className="preview-video">
                <video src={vid} controls width="200" />
                <button type="button" onClick={() => removeExistingVideo(i)}>Remove</button>
              </div>
            ))}
          </div>

          <input type="file" accept="video/*" multiple ref={videoInputRef} onChange={handleVideoChange} />

          {formData.productVideos.length > 0 && (
            <div className="preview-videos">
              {formData.productVideos.map((file, i) => (
                <div key={i} className="preview-video">
                  <video src={URL.createObjectURL(file)} controls width="200" />
                  <button type="button" onClick={() => removeNewVideo(i)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* REVIEWS */}
        <div className="reviews-section">
          <h4>Reviews (admin)</h4>
          {formData.reviews.map((review, i) => (
            <div className="review-block" key={review._id || review.tempId || i}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="text" placeholder="Reviewer Name" value={review.name || ""} onChange={(e) => updateReview(i, "name", e.target.value)} />
                <input type="number" min={1} max={5} value={review.rating || 5} onChange={(e) => updateReview(i, "rating", Number(e.target.value))} style={{ width: 80 }} />
                <button type="button" onClick={() => removeReview(i)}>Delete Review</button>
              </div>
              <textarea placeholder="Comment" value={review.comment || ""} onChange={(e) => updateReview(i, "comment", e.target.value)} />

              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <input type="file" multiple onChange={(e) => handleReviewImageUpload(i, Array.from(e.target.files))} />

                <div className="review-images-preview">
                  {(review.images || []).map((img, idx) => (
                    <div key={idx} style={{ position: "relative" }}>
                      <img src={img} alt={`r-${idx}`} width={60} />
                      <button type="button" onClick={() => removeReviewExistingImage(i, idx)}>x</button>
                    </div>
                  ))}
                  {(review.newImages || []).map((file, idx) => (
                    <div key={idx} style={{ position: "relative" }}>
                      <img src={URL.createObjectURL(file)} alt={`new-${idx}`} width={60} />
                      <button type="button" onClick={() => removeReviewNewImage(i, idx)}>x</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={addReview}>+ Add Review</button>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>{loading ? "Saving..." : isEditing ? "Update Product" : "Add Product"}</button>
          {isEditing && <button type="button" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      {/* PRODUCT LIST */}
      <h2>All Products</h2>
      <div className="products-list">
        {products.map((prod) => (
          <div className="product-card" key={prod._id}>
            <img src={prod.images?.[0] || "https://via.placeholder.com/150"} alt={prod.title} />
            <h4>{prod.title}</h4>
            <p>
              {prod.comparePrice && prod.comparePrice > prod.price ? (
                <span><s>₹{prod.comparePrice}</s> ₹{prod.price}</span>
              ) : (
                <>₹{prod.price}</>
              )}
            </p>
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
