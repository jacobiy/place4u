import React, { useState } from 'react'
import './PropertyDetailView.css'
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  Menu,
  MapPin,
  Grid,
  Phone,
  Mail,
  Users,
  Dumbbell,
  Waves,
  Dog,
  Car,
  Briefcase,
  FileText
} from 'lucide-react'

export default function PropertyDetailView({ property, onBack }) {
  const [activeImage, setActiveImage] = useState(0)

  const images = (property.image_urls && property.image_urls.length > 0) 
    ? property.image_urls 
    : (property.images && property.images.length > 0) 
      ? property.images 
      : ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=60"];

  const nextImage = () => setActiveImage((prev) => (prev + 1) % images.length)
  const prevImage = () => setActiveImage((prev) => (prev - 1 + images.length) % images.length)

  const amenityIcons = {
    'Fitness Center': Dumbbell,
    'Rooftop Pool': Waves,
    'Concierge Service': Users,
    'Pet Friendly': Dog,
    'Secure Parking': Car,
    'Co-working Space': Briefcase,
    Backyard: MapPin,
    Garage: Car
  }

  return (
    <div className="pd-wrapper">
      <div className="pd-header">
        <div className="pd-header-group">
          <button onClick={onBack} className="pd-icon-btn" type="button">
            <ChevronLeft size={24} />
          </button>
          <div className="pd-header-group" style={{ gap: '0.5rem' }}>
            <div className="pd-logo-container">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </div>
            <span className="pd-logo-text">Place4U</span>
          </div>
        </div>
        <div className="pd-header-title">
          Property Details
        </div>
        <div className="pd-header-group">
          <button className="pd-icon-btn" type="button">
            <Bell size={20} />
          </button>
          <button className="pd-icon-btn" type="button">
            <Menu size={20} />
          </button>
        </div>
      </div>

      <div className="pd-content-grid">
        <div className="pd-main-col">
          <div className="pd-image-gallery">
            <img src={images[activeImage]} alt={property.title || "Property"} className="pd-image" />

            <div className="pd-gallery-nav">
              <button onClick={prevImage} className="pd-nav-btn" type="button">
                <ChevronLeft size={24} />
              </button>
              <button onClick={nextImage} className="pd-nav-btn" type="button">
                <ChevronRight size={24} />
              </button>
            </div>

            <div className="pd-thumbnail-container">
              {images.map((img, idx) => (
                <button
                  key={img}
                  onClick={() => setActiveImage(idx)}
                  className={`pd-thumbnail-btn ${activeImage === idx ? 'active' : ''}`}
                  type="button"
                >
                  <img src={img} alt="" className="pd-image" />
                </button>
              ))}
            </div>
          </div>

          <div className="pd-info-grid">
            <div className="pd-section">
              <div className="pd-section-title">
                <FileText size={14} />
                <span>Description</span>
              </div>
              <p className="pd-description">{property.description || "No description provided for this property."}</p>
            </div>

            <div className="pd-section">
              <div className="pd-section-title">
                <MapPin size={14} />
                <span>Location</span>
              </div>
              <div className="pd-map-container">
                <div className="pd-map-bg" />
                <div className="pd-map-marker-container">
                  <div className="pd-map-marker" />
                </div>
                <div className="pd-map-label">Map</div>
              </div>
            </div>
          </div>

          <div className="pd-section">
            <div className="pd-section-title pd-section-title-px">
              <Grid size={14} />
              <span>Amenities</span>
            </div>
            <div className="pd-amenities-grid">
              {(property.amenities || []).map((amenity) => {
                const Icon = amenityIcons[amenity] || Grid
                return (
                  <div key={amenity} className="pd-amenity-item">
                    <div className="pd-amenity-icon">
                      <Icon size={20} />
                    </div>
                    <span className="pd-amenity-text">{amenity}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="pd-side-col">
          <div className="pd-card">
            <div className="pd-card-glow" />

            <div className="pd-price-container">
              <div className="pd-price">R{property.price || 0}</div>
              <div className="pd-price-label">per month</div>
            </div>

            <div className="pd-action-btns">
              <button className="pd-btn-primary" type="button">
                Edit Listing
              </button>
              <button className="pd-btn-danger" type="button">
                Deactivate Property
              </button>
            </div>
          </div>

          <div className="pd-section">
            <div className="pd-section-title pd-section-title-px">
              <Users size={14} />
              <span>Landlord Details</span>
            </div>
            <div className="pd-card" style={{ padding: '1.5rem', gap: '1.5rem' }}>
              <div className="pd-landlord-info">
                <div className="pd-landlord-avatar">
                   <Users size={24} />
                </div>
                <div>
                  <div className="pd-landlord-name">{property.landlord?.full_name || "Unknown Landlord"}</div>
                  <div className="pd-landlord-role">Property Owner</div>
                </div>
              </div>

              <div className="pd-contact-list">
                <div className="pd-contact-item">
                  <div className="pd-contact-icon">
                    <Phone size={16} />
                  </div>
                  <span className="pd-contact-text">{property.landlord?.phone || "No phone"}</span>
                </div>
                <div className="pd-contact-item">
                  <div className="pd-contact-icon">
                    <Mail size={16} />
                  </div>
                  <span className="pd-contact-text">{property.landlord?.email || "No email"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
