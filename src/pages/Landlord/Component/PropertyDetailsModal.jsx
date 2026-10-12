import { useEffect, useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  MapPin, 
  Coins, 
  Maximize2, 
  BedDouble, 
  Bath, 
  Users, 
  CheckCircle2, 
  FileText, 
  Edit3 
} from "lucide-react";
import { Modal } from "./Modal";
import { PrimaryBtn, SecondaryBtn } from "./Buttons";
import { T } from "../Styles/designTokens";

export const PropertyDetailsModal = ({ isOpen, onClose, property, onEdit, onViewDocuments }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [property?.id, isOpen]);

  if (!property) return null;

  const rawImages = property.image_urls && property.image_urls.length > 0
    ? property.image_urls
    : (property.images && property.images.length > 0)
      ? property.images
      : property.image
        ? [property.image]
        : ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=80"];

  const images = Array.isArray(rawImages) ? rawImages : [rawImages];

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const field = (Icon, label, value) => (
    <div style={{
      background: "rgba(255, 255, 255, 0.03)",
      border: `1px solid ${T.border}`,
      borderRadius: "0.875rem",
      padding: "0.875rem 1rem",
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      transition: "border-color 0.2s"
    }}>
      <div style={{
        width: "36px",
        height: "36px",
        borderRadius: "0.625rem",
        background: "rgba(79, 126, 248, 0.1)",
        border: "1px solid rgba(79, 126, 248, 0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: T.accent,
        flexShrink: 0
      }}>
        <Icon size={18} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontSize: "0.65rem",
            color: T.textMuted,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            display: "block"
          }}
        >
          {label}
        </span>
        <p style={{
          fontWeight: 600,
          color: T.textPrimary,
          marginTop: "2px",
          fontSize: "0.92rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}>
          {value || "—"}
        </p>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Property Overview" size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        
        {/* Sliding Image Carousel Hero */}
        <div style={{
          position: "relative",
          width: "100%",
          height: "260px",
          borderRadius: "1rem",
          overflow: "hidden",
          border: `1px solid ${T.border}`,
          background: "#080d1a"
        }}>
          <img
            src={images[currentIndex]}
            alt={`${property.name || property.title || "Property"} - slide ${currentIndex + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "all 0.3s ease-in-out" }}
          />

          {/* Top Info Bar */}
          <div style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            right: "12px",
            display: "flex",
            justifyContent: "space-between",
            pointerEvents: "none"
          }}>
            <span style={{
              background: "rgba(15, 22, 41, 0.75)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "0.72rem",
              fontWeight: 600
            }}>
              {property.status || "Active Listing"}
            </span>

            {images.length > 1 && (
              <span style={{
                background: "rgba(15, 22, 41, 0.75)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "0.72rem",
                fontWeight: 600
              }}>
                {currentIndex + 1} / {images.length}
              </span>
            )}
          </div>

          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(15, 23, 42, 0.7)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#fff",
                  transition: "all 0.2s",
                  outline: "none"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(15, 23, 42, 0.95)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(15, 23, 42, 0.7)"}
                type="button"
                aria-label="Previous image"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNext}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(15, 23, 42, 0.7)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#fff",
                  transition: "all 0.2s",
                  outline: "none"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(15, 23, 42, 0.95)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(15, 23, 42, 0.7)"}
                type="button"
                aria-label="Next image"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {images.length > 1 && (
            <div style={{
              position: "absolute",
              bottom: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "6px",
              background: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(6px)",
              padding: "5px 10px",
              borderRadius: "20px",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                  style={{
                    width: i === currentIndex ? "16px" : "6px",
                    height: "6px",
                    borderRadius: "4px",
                    border: "none",
                    background: i === currentIndex ? "#fff" : "rgba(255, 255, 255, 0.4)",
                    cursor: "pointer",
                    padding: 0,
                    transition: "all 0.25s"
                  }}
                  type="button"
                />
              ))}
            </div>
          )}
        </div>

        {/* Bento Specifications Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" }}>
          {field(Building2, "Property Name", property.name || property.title)}
          {field(MapPin, "Location", property.location || property.address)}
          {field(Coins, "Monthly Rent", property.rent || (property.price ? `R${property.price}` : null))}
          {field(Maximize2, "Floor Size", property.size || "95 m²")}
          {field(BedDouble, "Bedrooms", property.bedrooms ? `${property.bedrooms} Beds` : "2 Beds")}
          {field(Bath, "Bathrooms", property.bathrooms ? `${property.bathrooms} Baths` : "2 Baths")}
        </div>

        {/* Current Occupancy / Tenants Card */}
        <div style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: `1px solid ${T.border}`,
          borderRadius: "0.875rem",
          padding: "1.1rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Users size={16} color={T.accent} />
              <p style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: T.textSecondary,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                margin: 0
              }}>
                Current Occupancy & Tenants
              </p>
            </div>
            <span style={{ fontSize: "0.75rem", color: T.textMuted }}>
              {property.tenants?.length || 0} active
            </span>
          </div>

          {property.tenants && property.tenants.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {property.tenants.map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: "0.625rem",
                    border: `1px solid ${T.border}`
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: T.emerald,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 600
                    }}>
                      {typeof t === 'string' ? t.charAt(0) : 'T'}
                    </div>
                    <span style={{ fontSize: "0.88rem", color: T.textPrimary, fontWeight: 500 }}>
                      {typeof t === 'object' ? (t.name || t.full_name) : t}
                    </span>
                  </div>
                  <span style={{
                    fontSize: "0.72rem",
                    color: T.emerald,
                    fontWeight: 600,
                    background: "rgba(16, 185, 129, 0.1)",
                    padding: "3px 8px",
                    borderRadius: "12px",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <CheckCircle2 size={11} /> Active Lease
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "0.85rem", color: T.textMuted, margin: 0, padding: "8px 0" }}>
              No active tenant records assigned to this listing.
            </p>
          )}
        </div>

        {/* Modal Actions */}
        <div style={{ display: "flex", gap: "12px", paddingTop: "4px" }}>
          <PrimaryBtn
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            onClick={() => {
              onClose();
              onEdit(property);
            }}
          >
            <Edit3 size={16} />
            <span>Edit Property</span>
          </PrimaryBtn>
          <SecondaryBtn
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            onClick={() => {
              onClose();
              if (onViewDocuments) onViewDocuments(property);
            }}
          >
            <FileText size={16} />
            <span>View Documents</span>
          </SecondaryBtn>
        </div>
      </div>
    </Modal>
  );
};
