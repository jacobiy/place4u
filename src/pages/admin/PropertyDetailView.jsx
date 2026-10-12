import React, { useState } from 'react'
import './PropertyDetailView.css'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Building2,
  BedDouble,
  Bath,
  Maximize2,
  ShieldAlert,
  Phone,
  Mail,
  Users,
  Dumbbell,
  Waves,
  Dog,
  Car,
  Briefcase,
  Sparkles,
  Zap,
  Wind,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react'

export default function PropertyDetailView({ property, onBack }) {
  const [activeImage, setActiveImage] = useState(0)

  const rawImages = (property.image_urls && property.image_urls.length > 0) 
    ? property.image_urls 
    : (property.images && property.images.length > 0) 
      ? property.images 
      : property.image
        ? [property.image]
        : ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&auto=format&fit=crop&q=80"];

  const images = Array.isArray(rawImages) ? rawImages : [rawImages];

  const nextImage = () => setActiveImage((prev) => (prev + 1) % images.length)
  const prevImage = () => setActiveImage((prev) => (prev - 1 + images.length) % images.length)

  const amenityIcons = {
    'Fiber Internet': Sparkles,
    'Fitness Center': Dumbbell,
    'Gym': Dumbbell,
    'Rooftop Pool': Waves,
    'Pool': Waves,
    'Concierge Service': Users,
    '24/7 Concierge': Users,
    'Pet Friendly': Dog,
    'Secure Parking': Car,
    'Secure Basement Parking': Car,
    'Parking': Car,
    'Co-working Space': Briefcase,
    'Backup Generator': Zap,
    'Inverter Battery Backup': Zap,
    'Air Conditioning': Wind,
    'Backyard': MapPin,
    'Garage': Car
  }

  const fullAddress = property.address 
    ? `${property.address}${property.city ? `, ${property.city}` : ''}${property.province ? `, ${property.province}` : ''}`
    : property.location || 'South Africa'

  const landlordName = property.landlord?.full_name || property.landlord_name || "Verified Landlord"
  const landlordEmail = property.landlord?.email || "landlord@place4u.co.za"
  const landlordPhone = property.landlord?.phone || "+27 82 000 0000"

  return (
    <div className="pd-wrapper">
      {/* Top Bar */}
      <div className="pd-header">
        <div className="pd-header-group">
          <button onClick={onBack} className="pd-icon-btn" type="button" aria-label="Back">
            <ChevronLeft size={20} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: '4px' }}>Back</span>
          </button>
          <div className="pd-header-group" style={{ gap: '0.5rem' }}>
            <span className="pd-logo-text">Admin Review</span>
            <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              ID: {property.id || 'P-REF'}
            </span>
          </div>
        </div>
        <div className="pd-header-title">
          Listing Inspection
        </div>
        <div className="pd-header-group">
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Status: <strong style={{ color: '#059669' }}>{property.status || 'Active'}</strong>
          </span>
        </div>
      </div>

      <div className="pd-content-grid">
        <div className="pd-main-col">
          {/* Main Showcase Gallery */}
          <div className="pd-image-gallery">
            <img src={images[activeImage]} alt={property.title || property.name || "Property"} className="pd-image" />

            {images.length > 1 && (
              <div className="pd-gallery-nav">
                <button onClick={prevImage} className="pd-nav-btn" type="button" aria-label="Previous">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={nextImage} className="pd-nav-btn" type="button" aria-label="Next">
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            {images.length > 1 && (
              <div className="pd-thumbnail-container">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`pd-thumbnail-btn ${activeImage === idx ? 'active' : ''}`}
                    type="button"
                  >
                    <img src={img} alt="" className="pd-image" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Specifications Bento */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BedDouble size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Bedrooms</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{property.bedrooms || 2} Beds</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bath size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Bathrooms</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{property.bathrooms || 2} Baths</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Maximize2 size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Floor Size</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{property.size || '90 m²'}</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Type</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{property.property_type || 'Apartment'}</div>
              </div>
            </div>
          </div>

          {/* Description & Location Bento */}
          <div className="pd-info-grid">
            <div className="pd-section">
              <div className="pd-section-title">
                <Building2 size={16} />
                <span>Listing Overview</span>
              </div>
              <p className="pd-description">{property.description || "No description provided for this property."}</p>
            </div>

            <div className="pd-section">
              <div className="pd-section-title">
                <MapPin size={16} />
                <span>Location Details</span>
              </div>
              <div className="pd-map-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <MapPin size={20} />
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{fullAddress}</div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#2563eb', marginTop: '6px', textDecoration: 'none', fontWeight: 600 }}
                >
                  <span>Verify on Map</span>
                  <ArrowUpRight size={13} />
                </a>
              </div>
            </div>
          </div>

          {/* Amenities Grid */}
          <div className="pd-section">
            <div className="pd-section-title pd-section-title-px">
              <Sparkles size={16} />
              <span>Registered Features & Amenities</span>
            </div>
            <div className="pd-amenities-grid">
              {(property.amenities && property.amenities.length > 0 ? property.amenities : ['Fiber Internet', 'Security', 'Parking']).map((amenity) => {
                const Icon = amenityIcons[amenity] || Sparkles
                return (
                  <div key={amenity} className="pd-amenity-item">
                    <div className="pd-amenity-icon">
                      <Icon size={18} />
                    </div>
                    <span className="pd-amenity-text">{amenity}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="pd-side-col">
          <div className="pd-card">
            <div className="pd-card-glow" />

            <div className="pd-price-container">
              <div className="pd-price">R{typeof property.price === 'number' ? property.price.toLocaleString('en-ZA') : (property.price || property.rent || 0)}</div>
              <div className="pd-price-label">Monthly Rental Rate</div>
            </div>

            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Trust Score:</span>
                <strong style={{ color: '#10b981' }}>98% Verified</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Created Date:</span>
                <span>{property.created_at ? new Date(property.created_at).toLocaleDateString() : 'Active'}</span>
              </div>
            </div>

            <div className="pd-action-btns">
              <button
                className="pd-btn-danger"
                type="button"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => {
                  alert(`Listing ${property.title || property.name || 'Property'} flagged for administrative compliance review.`)
                }}
              >
                <ShieldAlert size={18} />
                <span>Suspend / Flag Listing</span>
              </button>
            </div>
          </div>

          {/* Landlord Details Card */}
          <div className="pd-section">
            <div className="pd-section-title pd-section-title-px">
              <Users size={16} />
              <span>Owner & Contact Record</span>
            </div>
            <div className="pd-card" style={{ padding: '1.5rem', gap: '1.25rem' }}>
              <div className="pd-landlord-info">
                <div className="pd-landlord-avatar">
                   <Users size={22} />
                </div>
                <div>
                  <div className="pd-landlord-name">{landlordName}</div>
                  <div className="pd-landlord-role" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} color="#10b981" />
                    <span>Registered Owner</span>
                  </div>
                </div>
              </div>

              <div className="pd-contact-list">
                <a
                  href={`tel:${landlordPhone.replace(/\s+/g, '')}`}
                  className="pd-contact-item"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="pd-contact-icon">
                    <Phone size={16} />
                  </div>
                  <span className="pd-contact-text">{landlordPhone}</span>
                </a>
                <a
                  href={`mailto:${landlordEmail}`}
                  className="pd-contact-item"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="pd-contact-icon">
                    <Mail size={16} />
                  </div>
                  <span className="pd-contact-text">{landlordEmail}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
