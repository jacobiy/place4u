import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "./Modal";
import { PrimaryBtn, SecondaryBtn } from "./Buttons";
import { T } from "../Styles/designTokens";

export const PropertyDetailsModal = ({ isOpen, onClose, property , onEdit}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [property?.id, isOpen]);

  if (!property) return null;

  const images = property.image_urls && property.image_urls.length > 0
    ? property.image_urls
    : [property.image];

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const field = (label, value) => (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", padding: "0.875rem 1rem" }}>
      <span
        style={{
          fontSize: "0.68rem",
          color: T.textMuted,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.06em"
        }}
      >
        {label}
      </span>
      <p style={{ fontWeight: 500, color: T.textPrimary, marginTop: "4px", fontSize: "0.9rem" }}>{value}</p>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Property Details" size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        
        {/* Sliding Image Carousel */}
        <div style={{ position: "relative", width: "100%", height: "240px", borderRadius: "0.75rem", overflow: "hidden" }}>
          <img
            src={images[currentIndex]}
            alt={`${property.name} - slide ${currentIndex + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "all 0.3s ease-in-out" }}
          />

          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(15, 23, 42, 0.65)",
                  backdropFilter: "blur(4px)",
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
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(15, 23, 42, 0.85)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(15, 23, 42, 0.65)"}
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
                  background: "rgba(15, 23, 42, 0.65)",
                  backdropFilter: "blur(4px)",
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
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(15, 23, 42, 0.85)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(15, 23, 42, 0.65)"}
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
              background: "rgba(15, 23, 42, 0.4)",
              backdropFilter: "blur(4px)",
              padding: "6px 10px",
              borderRadius: "20px"
            }}>
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    border: "none",
                    background: i === currentIndex ? "#fff" : "rgba(255, 255, 255, 0.4)",
                    cursor: "pointer",
                    padding: 0,
                    transition: "all 0.25s"
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {field("Property Name", property.name)}
          {field("Location", property.location)}
          {field("Monthly Rent", property.rent)}
          {field("Size", property.size)}
          {field("Bedrooms", property.bedrooms)}
          {field("Bathrooms", property.bathrooms)}
        </div>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", padding: "1rem" }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: T.textSecondary, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Current Tenants
          </p>
          {property.tenants?.length > 0 ? (
            property.tenants.map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: "0.875rem", color: T.textPrimary }}>{t}</span>
                <span style={{ fontSize: "0.75rem", color: T.emerald, fontWeight: 500 }}>Active</span>
              </div>
            ))
          ) : (
            <p style={{ fontSize: "0.875rem", color: T.textMuted }}>No tenants currently</p>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
        <PrimaryBtn
  style={{ flex: 1 }}
  onClick={() => {
    onClose();
    onEdit(property);
  }}
>
  Edit Property
</PrimaryBtn>
          <SecondaryBtn style={{ flex: 1 }}>View Documents</SecondaryBtn>
        </div>
      </div>
    </Modal>
  );
};

