import React, { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '../../utils/Supabase'
import {
  getAdminProperties,
  togglePropertyActive,
  createAdminProperty,
  updateAdminProperty,
  deleteAdminProperty,
  getLandlordsList,
  formatCurrency,
  formatDate,
  openGmail
} from './db/queries'
import PropertyDetailView from './PropertyDetailView'
import {
  Search,
  Filter,
  CheckCircle2,
  Building2,
  MapPin,
  Mail,
  Eye,
  Bed,
  Bath,
  Plus,
  Sparkles,
  Edit3,
  Trash2,
  X,
  ExternalLink,
  DollarSign,
  Calendar,
  Layers,
  Image as ImageIcon,
  Check,
  RefreshCw,
  SlidersHorizontal,
  AlertTriangle,
  Home,
  Tag,
  Globe,
  UploadCloud,
  FileCode
} from 'lucide-react'

// Demo photo sets for quick manual property creation
const DEMO_PHOTO_PRESETS = [
  {
    label: 'Modern Urban Apartment',
    urls: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'
    ]
  },
  {
    label: 'Suburban Luxury Townhouse',
    urls: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'
    ]
  },
  {
    label: 'Student Studio / Bachelor Flat',
    urls: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'
    ]
  },
  {
    label: 'Sea Point Penthouse Suite',
    urls: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800'
    ]
  }
]

// Compress and process attached image files
const optimizeAndProcessFile = async (file) => {
  // 1. Attempt upload to Supabase storage 'properties' bucket if accessible
  try {
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt) ? fileExt : 'jpg'
    const fileName = `prop-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt}`
    const filePath = `uploads/${fileName}`

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('properties')
      .upload(filePath, file, { cacheControl: '3600', upsert: false })

    if (!uploadErr && uploadData) {
      const { data } = supabase.storage.from('properties').getPublicUrl(filePath)
      if (data?.publicUrl) {
        return data.publicUrl
      }
    }
  } catch (err) {
    // If storage is restricted by RLS or not configured, fall back to client-side data URL
  }

  // 2. High-performance client-side image compression via Canvas (max 1280px, 0.82 quality)
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const MAX_DIM = 1280
        let w = img.width
        let h = img.height

        if (w > h) {
          if (w > MAX_DIM) {
            h = Math.round((h * MAX_DIM) / w)
            w = MAX_DIM
          }
        } else {
          if (h > MAX_DIM) {
            w = Math.round((w * MAX_DIM) / h)
            h = MAX_DIM
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
        resolve(dataUrl)
      }
      img.onerror = () => resolve(event.target?.result)
      img.src = event.target?.result
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

// Reusable picture attachment component with Drag & Drop, File Picker, Previews, and Cover selection
function PropertyImageManager({
  images = [],
  onChange,
  disabled = false
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const fileInputRef = useRef(null)

  const handleFiles = async (fileList) => {
    const validFiles = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (validFiles.length === 0) return

    setIsProcessing(true)
    try {
      const processed = await Promise.all(validFiles.map(optimizeAndProcessFile))
      const successful = processed.filter(Boolean)
      if (successful.length > 0) {
        onChange([...images, ...successful])
      }
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = (indexToRemove) => {
    onChange(images.filter((_, i) => i !== indexToRemove))
  }

  const handleSetCover = (index) => {
    if (index === 0) return
    const next = [...images]
    const [selected] = next.splice(index, 1)
    next.unshift(selected)
    onChange(next)
  }

  const handleAddManualUrl = (e) => {
    e?.preventDefault()
    const trimmed = manualUrl.trim()
    if (!trimmed) return
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      alert('Please enter a valid URL starting with http:// or https://')
      return
    }
    onChange([...images, trimmed])
    setManualUrl('')
  }

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <label className="block font-semibold text-slate-800 text-xs flex items-center gap-1.5">
          <ImageIcon size={14} className="text-blue-600" />
          <span>Property Pictures & Media</span>
          <span className="ml-1 text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {images.length} {images.length === 1 ? 'photo' : 'photos'}
          </span>
        </label>
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 transition cursor-pointer"
        >
          {showManualInput ? 'Hide Web Link' : '+ Paste Web Link'}
        </button>
      </div>

      {/* Manual URL input toggle */}
      {showManualInput && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://images.unsplash.com/... or property image URL"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddManualUrl()
                }
              }}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-600"
            />
            <button
              type="button"
              onClick={handleAddManualUrl}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
            >
              Add Link
            </button>
          </div>
        </div>
      )}

      {/* Dropzone / Upload button */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30 text-slate-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          multiple
          disabled={disabled || isProcessing}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-1.5 py-1">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
            {isProcessing ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <UploadCloud size={20} />
            )}
          </div>
          <p className="font-bold text-slate-800 text-xs">
            {isProcessing
              ? 'Processing and attaching pictures...'
              : 'Click to attach pictures or drag & drop files here'}
          </p>
          <p className="text-[11px] text-slate-400">
            Supports JPG, PNG, WEBP from your device. Select multiple photos at once.
          </p>
        </div>
      </div>

      {/* Thumbnail Gallery */}
      {images.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Attached Pictures ({images.length})</span>
            <span className="text-slate-400">First picture is the primary cover photo</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1.5 bg-slate-50/50 rounded-xl border border-slate-200">
            {images.map((imgUrl, idx) => (
              <div
                key={idx}
                className="group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-xs aspect-video"
              >
                <img
                  src={imgUrl}
                  alt={`Attachment ${idx + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Primary Cover Badge */}
                {idx === 0 ? (
                  <div className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                    Cover Photo
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSetCover(idx)
                    }}
                    title="Set as Cover Photo"
                    className="opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition absolute top-1 left-1 bg-slate-900/80 hover:bg-blue-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shadow cursor-pointer"
                  >
                    Set Cover
                  </button>
                )}

                {/* Delete / Remove button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(idx)
                  }}
                  title="Remove picture"
                  className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow cursor-pointer transition opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState([])
  const [landlords, setLandlords] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [sourceFilter, setSourceFilter] = useState('All Sources')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [toast, setToast] = useState(null)

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isScraperModalOpen, setIsScraperModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Active item for edit/delete
  const [activeProperty, setActiveProperty] = useState(null)

  // Form state for Add/Edit
  const defaultFormState = {
    address: '',
    area: '',
    city: 'Johannesburg',
    province: 'Gauteng',
    property_type: 'apartment',
    price: '',
    bedrooms: '2',
    bathrooms: '1',
    furnished: false,
    pet_friendly: false,
    available_from: new Date().toISOString().slice(0, 10),
    is_active: true,
    imageUrlsText: '',
    image_urls: [],
    landlord_id: '', // empty string means Place4U Sourced (null)
    sourceNote: ''
  }
  const [formData, setFormData] = useState(defaultFormState)

  // Scraper raw JSON state
  const [scraperInput, setScraperInput] = useState('')

  useEffect(() => {
    fetchProperties()
    fetchLandlords()
  }, [])

  const fetchProperties = async () => {
    setLoading(true)
    const data = await getAdminProperties()
    setProperties(data || [])
    setLoading(false)
  }

  const fetchLandlords = async () => {
    const list = await getLandlordsList()
    setLandlords(list || [])
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const handleToggleActive = async (prop) => {
    try {
      const newStatus = !prop.is_active
      await togglePropertyActive(prop.id, newStatus)
      setProperties((prev) =>
        prev.map((p) => (p.id === prop.id ? { ...p, is_active: newStatus } : p))
      )
      showToast(`Property marked as ${newStatus ? 'Active' : 'Inactive'}`)
    } catch (err) {
      showToast(`Error: ${err.message}`)
    }
  }

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData(defaultFormState)
    setIsAddModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (prop) => {
    setActiveProperty(prop)
    const existingImages = Array.isArray(prop.image_urls)
      ? prop.image_urls
      : (prop.image_url ? [prop.image_url] : [])

    setFormData({
      address: prop.address || '',
      area: prop.area || '',
      city: prop.city || 'Johannesburg',
      province: prop.province || 'Gauteng',
      property_type: prop.property_type || 'apartment',
      price: String(prop.price || ''),
      bedrooms: String(prop.bedrooms ?? '1'),
      bathrooms: String(prop.bathrooms ?? '1'),
      furnished: Boolean(prop.furnished),
      pet_friendly: Boolean(prop.pet_friendly),
      available_from: prop.available_from ? prop.available_from.slice(0, 10) : new Date().toISOString().slice(0, 10),
      is_active: Boolean(prop.is_active),
      imageUrlsText: '',
      image_urls: existingImages,
      landlord_id: prop.landlord_id || '',
      sourceNote: ''
    })
    setIsEditModalOpen(true)
  }

  // Open Delete Modal
  const handleOpenDeleteModal = (prop) => {
    setActiveProperty(prop)
    setIsDeleteModalOpen(true)
  }

  // Handle Create Property Submit
  const handleCreateProperty = async (e) => {
    e.preventDefault()
    if (!formData.address.trim() || !formData.area.trim() || !formData.city.trim() || !formData.price) {
      showToast('Please fill in all required fields (Address, Area, City, and Price).')
      return
    }

    setSubmitting(true)
    try {
      // Gather image_urls from attachments and any parsed URLs
      const parsedUrls = (formData.imageUrlsText || '')
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 5 && (s.startsWith('http') || s.startsWith('data:image/')))

      const allImages = Array.from(new Set([...(formData.image_urls || []), ...parsedUrls]))

      const payload = {
        address: formData.address.trim(),
        area: formData.area.trim(),
        city: formData.city.trim(),
        province: formData.province.trim(),
        property_type: formData.property_type.toLowerCase(),
        price: Number(formData.price),
        bedrooms: Number(formData.bedrooms) || null,
        bathrooms: Number(formData.bathrooms) || null,
        furnished: formData.furnished,
        pet_friendly: formData.pet_friendly,
        available_from: formData.available_from || null,
        is_active: formData.is_active,
        image_urls: allImages,
        landlord_id: formData.landlord_id || null
      }

      const created = await createAdminProperty(payload)
      setProperties([created, ...properties])
      setIsAddModalOpen(false)
      showToast(`Property "${payload.address}" successfully added to registry!`)
    } catch (err) {
      showToast(`Failed to create property: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Update Property Submit
  const handleUpdateProperty = async (e) => {
    e.preventDefault()
    if (!activeProperty?.id) return

    setSubmitting(true)
    try {
      const parsedUrls = (formData.imageUrlsText || '')
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 5 && (s.startsWith('http') || s.startsWith('data:image/')))

      const allImages = Array.from(new Set([...(formData.image_urls || []), ...parsedUrls]))

      const payload = {
        address: formData.address.trim(),
        area: formData.area.trim(),
        city: formData.city.trim(),
        province: formData.province.trim(),
        property_type: formData.property_type.toLowerCase(),
        price: Number(formData.price),
        bedrooms: Number(formData.bedrooms) || null,
        bathrooms: Number(formData.bathrooms) || null,
        furnished: formData.furnished,
        pet_friendly: formData.pet_friendly,
        available_from: formData.available_from || null,
        is_active: formData.is_active,
        image_urls: allImages,
        landlord_id: formData.landlord_id || null
      }

      const updated = await updateAdminProperty(activeProperty.id, payload)
      setProperties((prev) => prev.map((p) => (p.id === activeProperty.id ? updated : p)))
      setIsEditModalOpen(false)
      showToast(`Property "${payload.address}" updated successfully!`)
    } catch (err) {
      showToast(`Failed to update property: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete Property Submit
  const handleDeleteProperty = async () => {
    if (!activeProperty?.id) return
    setSubmitting(true)
    try {
      await deleteAdminProperty(activeProperty.id)
      setProperties((prev) => prev.filter((p) => p.id !== activeProperty.id))
      setIsDeleteModalOpen(false)
      showToast(`Property successfully removed from database.`)
    } catch (err) {
      showToast(`Failed to delete property: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Quick Scrape JSON Import
  const handleScrapeImport = async (e) => {
    e.preventDefault()
    if (!scraperInput.trim()) return

    setSubmitting(true)
    try {
      const parsed = JSON.parse(scraperInput)
      const items = Array.isArray(parsed) ? parsed : [parsed]

      let createdCount = 0
      for (const item of items) {
        if (!item.address || !item.area || !item.price) continue

        const payload = {
          address: item.address,
          area: item.area,
          city: item.city || 'Johannesburg',
          province: item.province || 'Gauteng',
          property_type: (item.property_type || 'apartment').toLowerCase(),
          price: Number(item.price) || 0,
          bedrooms: item.bedrooms ? Number(item.bedrooms) : null,
          bathrooms: item.bathrooms ? Number(item.bathrooms) : null,
          furnished: Boolean(item.furnished),
          pet_friendly: Boolean(item.pet_friendly),
          available_from: item.available_from || null,
          is_active: item.is_active !== undefined ? Boolean(item.is_active) : true,
          image_urls: Array.isArray(item.image_urls) ? item.image_urls : (item.images || []),
          landlord_id: item.landlord_id || null
        }

        const created = await createAdminProperty(payload)
        setProperties((prev) => [created, ...prev])
        createdCount++
      }

      setIsScraperModalOpen(false)
      setScraperInput('')
      showToast(`Successfully imported ${createdCount} scraped propert${createdCount === 1 ? 'y' : 'ies'}!`)
    } catch (err) {
      showToast(`Invalid JSON format: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Preset demo photo helper
  const handleApplyPhotoPreset = (preset) => {
    const existing = formData.image_urls || []
    setFormData({
      ...formData,
      image_urls: [...existing, ...preset.urls]
    })
    showToast(`Added ${preset.urls.length} photos from "${preset.label}".`)
  }

  // Example Scraper JSON
  const loadExampleScraperJSON = () => {
    const example = {
      address: "88 Umhlanga Rocks Drive, Ocean View Apt 14",
      area: "Umhlanga",
      city: "Durban",
      province: "KwaZulu-Natal",
      property_type: "apartment",
      price: 18500,
      bedrooms: 2,
      bathrooms: 2,
      furnished: true,
      pet_friendly: false,
      available_from: "2026-11-01",
      is_active: true,
      image_urls: [
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"
      ]
    }
    setScraperInput(JSON.stringify(example, null, 2))
  }

  // Filtered properties
  const filtered = useMemo(() => {
    return properties.filter((p) => {
      const landlordName = p.landlord?.full_name || ''
      const landlordEmail = p.landlord?.email || ''
      const isPlace4USourced = !p.landlord_id

      const haystack = `${p.address || ''} ${p.area || ''} ${p.city || ''} ${p.property_type || ''} ${landlordName} ${landlordEmail}`.toLowerCase()
      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase())
      
      const pStatus = p.is_active ? 'active' : 'inactive'
      const matchesStatus = statusFilter === 'All Statuses' || pStatus === statusFilter.toLowerCase()

      let matchesSource = true
      if (sourceFilter === 'Place4U Sourced (Scraped)') {
        matchesSource = isPlace4USourced
      } else if (sourceFilter === 'Landlord Registered') {
        matchesSource = !isPlace4USourced
      }

      const matchesType = typeFilter === 'All Types' || (p.property_type || '').toLowerCase() === typeFilter.toLowerCase()

      return matchesQuery && matchesStatus && matchesSource && matchesType
    })
  }, [properties, query, statusFilter, sourceFilter, typeFilter])

  // Summary Metrics
  const activeCount = properties.filter((p) => p.is_active).length
  const sourcedCount = properties.filter((p) => !p.landlord_id).length
  const totalRentVolume = properties.reduce((acc, p) => acc + (Number(p.price) || 0), 0)

  if (selectedProperty) {
    return <PropertyDetailView property={selectedProperty} onBack={() => setSelectedProperty(null)} />
  }

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Banner & Management Actions */}
      <section className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Property Management Registry</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Admin Direct Control
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manually add, scrape, and manage rental properties for Place4U matching without requiring registered landlords.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 w-full md:w-auto">
          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Property</span>
          </button>

          <button
            onClick={() => setIsScraperModalOpen(true)}
            className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            title="Import scraped property listings in bulk JSON format"
          >
            <Sparkles size={14} className="text-purple-600" />
            <span>Quick Scrape</span>
          </button>

          <button
            onClick={fetchProperties}
            disabled={loading}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs transition-colors shrink-0 cursor-pointer"
            title="Refresh database listings"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </section>

      {/* Metric Counters Grid (2x2 on mobile, 4 columns on large screens) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate">Total Units</p>
            <h3 className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{properties.length}</h3>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">On Place4U</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate">Active Units</p>
            <h3 className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1">{activeCount}</h3>
            <p className="text-[9px] sm:text-[10px] text-emerald-600/80 font-medium mt-0.5 truncate">Ready to match</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate">Scraped Sourced</p>
            <h3 className="text-lg sm:text-2xl font-black text-purple-600 mt-0.5 sm:mt-1">{sourcedCount}</h3>
            <p className="text-[9px] sm:text-[10px] text-purple-600/80 font-medium mt-0.5 truncate">Place4U managed</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate">Rent Portfolio</p>
            <h3 className="text-base sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1 font-mono truncate">{formatCurrency(totalRentVolume)}</h3>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">Gross monthly</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </section>

      {/* Main Table & Listings Section */}
      <section className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Filters and Controls Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3 bg-slate-50/50">
          <div className="relative w-full lg:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by address, area, city, type…"
              className="w-full pl-9 pr-3 py-2 sm:py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
            <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto text-[11px] sm:text-xs">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-600 font-medium truncate"
              >
                <option>All Statuses</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>

              {/* Source Filter */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full sm:w-auto px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-600 font-medium truncate"
              >
                <option>All Sources</option>
                <option value="Place4U Sourced (Scraped)">Scraped</option>
                <option value="Landlord Registered">Landlords</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full sm:w-auto px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-600 font-medium truncate"
              >
                <option>All Types</option>
                <option value="apartment">Apartment</option>
                <option value="townhouse">Townhouse</option>
                <option value="house">House</option>
                <option value="room">Room</option>
                <option value="studio">Studio</option>
                <option value="condo">Condo</option>
              </select>
            </div>

            <span className="text-slate-500 font-medium text-[10px] sm:text-xs text-right sm:text-left sm:ml-1 shrink-0">
              Showing {filtered.length} of {properties.length}
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 text-slate-400 gap-2">
            <RefreshCw size={24} className="animate-spin text-blue-500" />
            <p className="text-xs">Loading property listings from database…</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile <768px) */}
            <div className="hidden md:block overflow-x-auto min-h-[340px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold border-b border-slate-100">
                    <th className="text-left px-5 py-3">Property Unit</th>
                    <th className="text-left px-4 py-3">Location & Province</th>
                    <th className="text-left px-4 py-3">Ownership / Source</th>
                    <th className="text-left px-4 py-3">Specs</th>
                    <th className="text-left px-4 py-3">Monthly Rent</th>
                    <th className="text-left px-4 py-3">Listing State</th>
                    <th className="text-right px-5 py-3">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => {
                    const landlordName = p.landlord?.full_name || ''
                    const landlordEmail = p.landlord?.email || ''
                    const isPlace4USourced = !p.landlord_id
                    const thumb = p.image_urls?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400'

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Property Unit */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={thumb}
                              alt={p.address}
                              className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200 bg-slate-100"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400'
                              }}
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate max-w-[220px]" title={p.address}>
                                {p.address || p.property_type}
                              </p>
                              <span className="inline-block mt-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded capitalize">
                                {p.property_type || 'Apartment'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span>{p.area || p.city || '—'}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 ml-4.5">{p.city}, {p.province || 'Gauteng'}</p>
                        </td>

                        {/* Ownership / Sourcing */}
                        <td className="px-4 py-3.5">
                          {isPlace4USourced ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                              <Sparkles size={11} className="text-purple-600" />
                              Place4U Sourced
                            </div>
                          ) : (
                            <div>
                              <p className="font-semibold text-slate-800">{landlordName || 'Registered Landlord'}</p>
                              <p className="text-[10px] text-slate-400">{landlordEmail || '—'}</p>
                            </div>
                          )}
                        </td>

                        {/* Specs */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2 text-slate-600">
                            <span title={`${p.bedrooms || 0} Bedrooms`} className="flex items-center gap-1">
                              <Bed size={13} className="text-slate-400" /> {p.bedrooms ?? 1}
                            </span>
                            <span title={`${p.bathrooms || 0} Bathrooms`} className="flex items-center gap-1">
                              <Bath size={13} className="text-slate-400" /> {p.bathrooms ?? 1}
                            </span>
                          </div>
                          <div className="flex gap-1 mt-1 text-[9px] font-semibold text-slate-500">
                            {p.furnished && <span className="bg-slate-100 px-1 rounded">Furnished</span>}
                            {p.pet_friendly && <span className="bg-slate-100 px-1 rounded">Pets OK</span>}
                          </div>
                        </td>

                        {/* Monthly Rent */}
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(p.price)}
                          <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                        </td>

                        {/* Active Status */}
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => handleToggleActive(p)}
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all active:scale-95 cursor-pointer ${
                              p.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                            title="Click to toggle listing visibility"
                          >
                            {p.is_active ? '● Active' : '○ Inactive'}
                          </button>
                        </td>

                        {/* Action buttons */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedProperty(p)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                              title="View full listing details page"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-colors cursor-pointer"
                              title="Edit property details"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteModal(p)}
                              className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors cursor-pointer"
                              title="Delete property from database"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {!filtered.length && (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-xs text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Building2 size={32} className="text-slate-300" />
                          <p className="font-semibold text-slate-700">No properties match your filter</p>
                          <p className="text-[11px] text-slate-400">Try adjusting your search terms or add a new property listing.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Property Cards View (Shown on screens <768px) */}
            <div className="md:hidden divide-y divide-slate-100 min-h-[300px]">
              {filtered.map((p) => {
                const landlordName = p.landlord?.full_name || ''
                const isPlace4USourced = !p.landlord_id
                const thumb = p.image_urls?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400'

                return (
                  <div key={p.id} className="p-3.5 space-y-3 hover:bg-slate-50/60 transition-colors">
                    {/* Top Row: Thumbnail + Info */}
                    <div className="flex items-start gap-3">
                      <img
                        src={thumb}
                        alt={p.address}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 bg-slate-100 shadow-xs cursor-pointer"
                        onClick={() => setSelectedProperty(p)}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400'
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5">
                          <h4
                            onClick={() => setSelectedProperty(p)}
                            className="font-bold text-slate-900 text-xs sm:text-sm leading-tight truncate hover:text-blue-600 cursor-pointer"
                            title={p.address}
                          >
                            {p.address || p.property_type}
                          </h4>
                          <button
                            onClick={() => handleToggleActive(p)}
                            className={`shrink-0 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all active:scale-95 cursor-pointer ${
                              p.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {p.is_active ? '● Active' : '○ Inactive'}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-1">
                          <MapPin size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate">{p.area || p.city}, {p.province || 'Gauteng'}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1.5">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(p.price)}
                            <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                          </span>
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded capitalize">
                            {p.property_type || 'Apartment'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Meta bar: Specs & Source */}
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center gap-1">
                          <Bed size={13} className="text-slate-400" />
                          <strong className="font-semibold text-slate-800">{p.bedrooms ?? 1}</strong> bed
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath size={13} className="text-slate-400" />
                          <strong className="font-semibold text-slate-800">{p.bathrooms ?? 1}</strong> bath
                        </span>
                        {p.furnished && <span className="bg-white border border-slate-200 px-1.5 py-0.2 rounded text-[9px] font-medium text-slate-700">Furnished</span>}
                      </div>

                      {isPlace4USourced ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-100/80 text-purple-700 text-[10px] font-bold shrink-0">
                          <Sparkles size={10} className="text-purple-600" />
                          Place4U Sourced
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 truncate max-w-[110px]" title={landlordName}>
                          {landlordName || 'Landlord'}
                        </span>
                      )}
                    </div>

                    {/* Touch Action Buttons */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        onClick={() => setSelectedProperty(p)}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>View Details</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(p)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors shrink-0 cursor-pointer"
                        title="Delete property"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}

              {!filtered.length && (
                <div className="px-4 py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Building2 size={32} className="text-slate-300" />
                  <p className="font-semibold text-slate-700">No properties match your filter</p>
                  <p className="text-[11px] text-slate-400">Try adjusting your search terms or add a new property listing.</p>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* ================= MODAL: ADD PROPERTY ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto sm:my-8 max-h-[92vh] sm:max-h-[85vh] flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Building2 size={18} className="text-blue-600" />
                  Add New Rental Property
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">Manually enter scraped or direct marketplace inventory</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto text-xs flex-1">
              {/* Presets banner */}
              <div className="p-2.5 sm:p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                <span className="font-bold text-purple-900 flex items-center gap-1.5 text-[11px] sm:text-xs">
                  <Sparkles size={13} className="text-purple-600 shrink-0" />
                  Quick Scraped Photo Presets:
                </span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                  {DEMO_PHOTO_PRESETS.map((pr, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleApplyPhotoPreset(pr)}
                      className="px-2 sm:px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-md font-semibold transition-colors text-[10px] sm:text-[11px] cursor-pointer"
                    >
                      + {pr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address & Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Street Address / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 42 Rosebank Boulevard (Unit 12B)"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 text-sm sm:text-xs"
                />
              </div>

              {/* Location Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Area / Suburb <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rosebank"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 text-sm sm:text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Johannesburg"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 text-sm sm:text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Province</label>
                  <select
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 text-sm sm:text-xs"
                  >
                    <option value="Gauteng">Gauteng</option>
                    <option value="Western Cape">Western Cape</option>
                    <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                    <option value="Limpopo">Limpopo</option>
                    <option value="Eastern Cape">Eastern Cape</option>
                    <option value="Free State">Free State</option>
                    <option value="Mpumalanga">Mpumalanga</option>
                    <option value="North West">North West</option>
                    <option value="Northern Cape">Northern Cape</option>
                  </select>
                </div>
              </div>

              {/* Rent & Type Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Monthly Rent (ZAR) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R</span>
                    <input
                      type="number"
                      required
                      min="100"
                      placeholder="e.g. 8500"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 font-bold text-sm sm:text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Property Type</label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 capitalize text-sm sm:text-xs"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="house">House</option>
                    <option value="room">Room</option>
                    <option value="studio">Studio</option>
                    <option value="condo">Condo</option>
                    <option value="penthouse">Penthouse</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Available Date</label>
                  <input
                    type="date"
                    value={formData.available_from}
                    onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 text-sm sm:text-xs"
                  />
                </div>
              </div>

              {/* Specs & Amenities */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bedrooms</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm sm:text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bathrooms</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="20"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm sm:text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 sm:pt-5">
                  <input
                    type="checkbox"
                    id="furnished"
                    checked={formData.furnished}
                    onChange={(e) => setFormData({ ...formData, furnished: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="furnished" className="font-semibold text-slate-700 cursor-pointer">
                    Furnished
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2 sm:pt-5">
                  <input
                    type="checkbox"
                    id="pet_friendly"
                    checked={formData.pet_friendly}
                    onChange={(e) => setFormData({ ...formData, pet_friendly: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="pet_friendly" className="font-semibold text-slate-700 cursor-pointer">
                    Pet Friendly
                  </label>
                </div>
              </div>

              {/* Pictures Attachment Manager */}
              <PropertyImageManager
                images={formData.image_urls}
                onChange={(newImages) => setFormData({ ...formData, image_urls: newImages })}
                disabled={submitting}
              />

              {/* Landlord Ownership Selection */}
              <div className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <label className="block font-semibold text-slate-700">Landlord Assignment / Ownership</label>
                <select
                  value={formData.landlord_id}
                  onChange={(e) => setFormData({ ...formData, landlord_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium text-sm sm:text-xs"
                >
                  <option value="">Place4U Direct / Platform Sourced (No registered landlord)</option>
                  {landlords.map((l) => (
                    <option key={l.id} value={l.id}>
                      Registered: {l.full_name || l.email} ({l.email})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">
                  Select "Place4U Direct" for manually scraped listings where no landlord user exists yet.
                </p>
              </div>

              {/* Status toggle */}
              <div className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="pr-2">
                  <p className="font-bold text-slate-900">Make Listing Active Immediately</p>
                  <p className="text-[10px] text-slate-400">Allows tenants to see and match this property right away</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-600 cursor-pointer shrink-0"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 sm:gap-2.5 pt-3 border-t border-slate-100 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 sm:px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 sm:px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? 'Adding...' : 'Save & Publish Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT PROPERTY ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto sm:my-8 max-h-[92vh] sm:max-h-[85vh] flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Edit3 size={18} className="text-blue-600" />
                  Edit Property Listing
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">Update unit parameters and image links</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateProperty} className="p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto text-xs flex-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Street Address / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 text-sm sm:text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Area / Suburb</label>
                  <input
                    type="text"
                    required
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm sm:text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm sm:text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Province</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm sm:text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Rent (ZAR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R</span>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold text-sm sm:text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Property Type</label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 capitalize text-sm sm:text-xs"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="house">House</option>
                    <option value="room">Room</option>
                    <option value="studio">Studio</option>
                    <option value="condo">Condo</option>
                    <option value="penthouse">Penthouse</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Active Status</label>
                  <select
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm sm:text-xs"
                  >
                    <option value="true">Active (Published)</option>
                    <option value="false">Inactive (Draft)</option>
                  </select>
                </div>
              </div>

              {/* Pictures Attachment Manager */}
              <PropertyImageManager
                images={formData.image_urls}
                onChange={(newImages) => setFormData({ ...formData, image_urls: newImages })}
                disabled={submitting}
              />

              <div className="flex justify-end gap-2 sm:gap-2.5 pt-3 border-t border-slate-100 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 sm:px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 sm:px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Update Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: QUICK SCRAPER JSON IMPORT ================= */}
      {isScraperModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto sm:my-8 max-h-[92vh] flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-purple-50/70 border-b border-purple-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-purple-950 text-sm sm:text-base flex items-center gap-2">
                  <Sparkles size={18} className="text-purple-600" />
                  Quick Scraper Batch Importer
                </h3>
                <p className="text-[11px] sm:text-xs text-purple-700">Paste scraped JSON payload directly into the database</p>
              </div>
              <button onClick={() => setIsScraperModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScrapeImport} className="p-3.5 sm:p-6 space-y-3 text-xs overflow-y-auto flex-1">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                <label className="font-semibold text-slate-700">Paste JSON Object or Array:</label>
                <button
                  type="button"
                  onClick={loadExampleScraperJSON}
                  className="text-purple-600 hover:text-purple-800 font-semibold hover:underline text-left sm:text-right cursor-pointer"
                >
                  Load Example Scraped Listing
                </button>
              </div>

              <textarea
                rows="8"
                required
                placeholder='{\n  "address": "88 Umhlanga Rocks Drive",\n  "area": "Umhlanga",\n  "city": "Durban",\n  "price": 26000,\n  "property_type": "penthouse",\n  "bedrooms": 3,\n  "bathrooms": 2,\n  "image_urls": ["https://..."]\n}'
                value={scraperInput}
                onChange={(e) => setScraperInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 text-purple-300 font-mono text-xs sm:text-[11px] rounded-lg border border-slate-800 focus:outline-none focus:border-purple-500"
              />

              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Required fields in payload: <code>address</code>, <code>area</code>, and <code>price</code>.
              </p>

              <div className="flex justify-end gap-2 sm:gap-2.5 pt-3 border-t border-slate-100 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsScraperModalOpen(false)}
                  className="px-3.5 sm:px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 sm:px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? 'Importing...' : 'Parse & Import Listings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {isDeleteModalOpen && activeProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm sm:max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 text-xs">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shrink-0">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-base">Delete Property Listing?</h3>
              <p className="text-slate-500 mt-1">
                Are you sure you want to permanently remove <strong>{activeProperty.address}</strong> from the database? This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-center gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 sm:flex-initial px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProperty}
                disabled={submitting}
                className="flex-1 sm:flex-initial px-4 sm:px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
              >
                {submitting ? 'Deleting...' : 'Yes, Delete Property'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
