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
      description: "",
      price: "",
      category: "",
      collection: "",
      isCustomizable: false,
      customizationFields: [],
      specifications: [],
      stock: 0, // simple stock
      productImages: [],
      existingImages: [],
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

  // File handlers
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({
      ...prev,
      productImages: [...prev.productImages, ...files],
    }));
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

  // Customization fields
  const addCustomizationField = () =>
    setFormData((prev) => ({
      ...prev,
      customizationFields: [
        ...prev.customizationFields,
        { label: "", type: "text" },
      ],
    }));
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

  // Specifications
  const addSpecification = () =>
    setFormData((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { key: "", values: [] }],
    }));
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
      updated[specIndex].values[valIndex][key] =
        key === "stock" ? Number(value) : value;
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
    fd.append(
      "customizationFields",
      JSON.stringify(formData.customizationFields)
    );
    fd.append("specifications", JSON.stringify(formData.specifications || []));
    fd.append("stock", formData.stock || 0); // ✅ ensure numeric stock
    fd.append("images", JSON.stringify(formData.existingImages));
    formData.productImages.forEach((file) => fd.append("productImages", file));

    try {
      setLoading(true);
      if (isEditing) {
        await api.put(`/products/admin/edit/${editId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/products/add", fd, {
          headers: { "Content-Type": "multipart/form-data" },
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

  // Edit product
  const handleEdit = (prod) => {
    setFormData({
      title: prod.title,
      description: prod.description,
      price: prod.price,
      category: prod.category,
      collection: prod.collection || "",
      isCustomizable: prod.isCustomizable,
      customizationFields: prod.customizationFields || [],
      specifications: prod.specifications || [],
      stock: prod.stock || 0,
      productImages: [],
      existingImages: prod.images || [],
    });
    setIsEditing(true);
    setEditId(prod._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Delete product
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
    setFormData(initialFormData());
    setIsEditing(false);
    setEditId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="admin-products">
      <h2>{isEditing ? "Edit Product" : "Add Product"}</h2>

      <form className="product-form" onSubmit={handleSubmit}>
        {/* Basic fields */}
        <input
          type="text"
          placeholder="Title"
          value={formData.title}
          onChange={(e) =>
            setFormData({ ...formData, title: e.target.value })
          }
        />
        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
        <input
          type="number"
          placeholder="Price"
          value={formData.price}
          onChange={(e) =>
            setFormData({ ...formData, price: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Category"
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
        />
        <select
          value={formData.collection}
          onChange={(e) =>
            setFormData({ ...formData, collection: e.target.value })
          }
        >
          <option value="">Select Collection</option>
          {collections.map((col) => (
            <option key={col._id} value={col._id}>
              {col.name}
            </option>
          ))}
        </select>

        <label>
          <input
            type="checkbox"
            checked={formData.isCustomizable}
            onChange={(e) =>
              setFormData({ ...formData, isCustomizable: e.target.checked })
            }
          />
          Customizable
        </label>

        {/* Customization fields */}
        {formData.isCustomizable && (
          <div className="customization-fields">
            <h4>Customization Fields</h4>
            {formData.customizationFields.map((field, i) => (
              <div key={i} className="custom-field">
                <input
                  type="text"
                  placeholder="Label"
                  value={field.label}
                  onChange={(e) =>
                    updateCustomizationField(i, "label", e.target.value)
                  }
                />
                <select
                  value={field.type}
                  onChange={(e) =>
                    updateCustomizationField(i, "type", e.target.value)
                  }
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="file">File Upload</option>
                </select>
                <button type="button" onClick={() => removeCustomizationField(i)}>
                  X
                </button>
              </div>
            ))}
            <button type="button" onClick={addCustomizationField}>
              + Add Field
            </button>
          </div>
        )}

        {/* Simple stock */}
        {formData.specifications.length === 0 && (
          <div className="simple-stock">
            <h4>Stock</h4>
            <input
              type="number"
              placeholder="Stock"
              value={formData.stock}
              onChange={(e) =>
                setFormData({ ...formData, stock: Number(e.target.value) })
              }
            />
          </div>
        )}

        {/* Specifications */}
        <div className="specifications">
          <h4>Specifications</h4>
          {formData.specifications.map((spec, i) => (
            <div key={i} className="spec-block">
              <input
                type="text"
                placeholder="Spec Key"
                value={spec.key}
                onChange={(e) => updateSpecificationKey(i, e.target.value)}
              />
              <div className="spec-values">
                {spec.values.map((val, j) => (
                  <div key={j} className="spec-value">
                    <input
                      type="text"
                      placeholder="Value"
                      value={val.value}
                      onChange={(e) =>
                        updateSpecValue(i, j, "value", e.target.value)
                      }
                    />
                    <input
                      type="number"
                      placeholder="Stock"
                      value={val.stock}
                      onChange={(e) =>
                        updateSpecValue(i, j, "stock", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecValue(i, j)}
                    >
                      X
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addSpecValue(i)}>
                  + Add Value
                </button>
              </div>
              <button type="button" onClick={() => removeSpecification(i)}>
                Remove Spec
              </button>
            </div>
          ))}
          <button type="button" onClick={addSpecification}>
            + Add Specification
          </button>
        </div>

        {/* Images */}
        <div className="images-section">
          <h4>Images</h4>
          <div className="existing-images">
            {formData.existingImages.map((img, i) => (
              <div
                key={i}
                className={`preview-image ${
                  dragOverExistingIndex === i ? "drag-over" : ""
                }`}
                draggable
                onDragStart={() => handleDragStartExisting(i)}
                onDragEnter={() => handleDragEnterExisting(i)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={handleDragEndExisting}
              >
                <img src={img} alt="existing" />
                <button type="button" onClick={() => removeExistingImage(i)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
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
                <div
                  key={index}
                  className={`preview-image ${
                    dragOverNewIndex === index ? "drag-over" : ""
                  }`}
                  draggable
                  onDragStart={() => handleDragStartNew(index)}
                  onDragEnter={() => handleDragEnterNew(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={handleDragEndNew}
                >
                  <img src={URL.createObjectURL(file)} alt="preview" />
                  <button type="button" onClick={() => removeNewImage(index)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading
              ? "Saving..."
              : isEditing
              ? "Update Product"
              : "Add Product"}
          </button>
          {isEditing && <button type="button" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      {/* Product List */}
      <h2>All Products</h2>
      <div className="products-list">
        {products.map((prod) => (
          <div className="product-card" key={prod._id}>
            <img
              src={prod.images?.[0] || "https://via.placeholder.com/150"}
              alt={prod.title}
            />
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


