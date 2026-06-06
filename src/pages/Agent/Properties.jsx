import { useMemo, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { SecondaryBtn } from "./Component/Buttons";
import PropertyDetailView from "./PropertyDetailView";
import "./Properties.css";

export const Properties = ({ properties, onRefresh, loading }) => {
  const [query, setQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) => {
      return (
        (p.address || "").toLowerCase().includes(q) ||
        (p.area || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q) ||
        (p.property_type || "").toLowerCase().includes(q)
      );
    });
  }, [properties, query]);

  const placeholderImage = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&auto=format&fit=crop&q=60";

  if (selectedProperty) {
    return <PropertyDetailView property={selectedProperty} onBack={() => setSelectedProperty(null)} />;
  }

  return (
    <div>
      <div className="properties-header">
        <div>
          <h1 className="properties-title">
            Properties
          </h1>
          <p className="properties-subtitle">Browse active listings in the database</p>
        </div>
        <SecondaryBtn onClick={onRefresh} disabled={loading}>
          <span className="properties-refresh-btn-content">
            <RefreshCw size={14} /> Refresh
          </span>
        </SecondaryBtn>
      </div>

      <div className="properties-search-container">
        <div className="properties-search-input-wrapper">
          <Search size={14} className="properties-search-icon" />
          <input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search by address, area, city, type..." 
            className="properties-search-input" 
          />
        </div>
      </div>

      {loading ? (
        <p className="properties-loading">Loading properties…</p>
      ) : filtered.length === 0 ? (
        <div className="properties-empty-container">
          <p className="properties-empty-title">No properties found</p>
          <p className="properties-empty-subtitle">If landlords haven't uploaded listings yet, this will be empty.</p>
        </div>
      ) : (
        <div className="properties-grid">
          {filtered.map((p) => (
            <div key={p.id} className="property-card">
              <div className="property-card-image-wrapper">
                <img src={(p.image_urls && p.image_urls.length > 0) ? p.image_urls[0] : placeholderImage} alt={p.address} className="property-card-image" />
              </div>
              <div className="property-card-content">
                <p className="property-card-type">{p.property_type}</p>
                <p className="property-card-location">{p.area}, {p.city}{p.province ? `, ${p.province}` : ""}</p>
                <p className="property-card-address">{p.address}</p>
                <div className="property-card-tags">
                  <span className="property-card-tag">
                    R{Number(p.price).toLocaleString()}/mo
                  </span>
                  {typeof p.bedrooms === "number" && (
                    <span className="property-card-tag">
                      {p.bedrooms} bd
                    </span>
                  )}
                  {typeof p.bathrooms === "number" && (
                    <span className="property-card-tag">
                      {p.bathrooms} ba
                    </span>
                  )}
                  {p.furnished && (
                    <span className="property-card-tag">
                      Furnished
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedProperty(p)}
                  className="property-view-details-btn"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
