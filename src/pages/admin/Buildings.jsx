import { useEffect, useMemo, useState } from 'react'
import {
  Building2, Plus, RefreshCw, ArrowLeft, Pencil, Trash2, Layers, Users,
  DoorOpen, CheckCircle2, AlertTriangle, X, Wand2, MapPin, Power
} from 'lucide-react'
import { getLandlordsList, togglePropertyActive } from './db/queries'
import {
  getBuildings, createAdminBuilding, updateAdminBuilding, deleteAdminBuilding,
  getBuildingRooms, getBuildingRoomTypes, createBuildingRoomType,
  updateBuildingRoomType, deleteBuildingRoomType, generateBuildingRooms
} from './db/buildingQueries'
import {
  BUILDING_TYPE_OPTIONS, ROOM_TYPE_PRESETS, TENANT_ALLOWED_OPTIONS,
  buildingTypeLabel, propertyTypeShortLabel, tenantAllowedSummary,
  normalizeTenantAllowed, buildRoomLabels
} from '../../services/listingTaxonomy'

const PROVINCES = [
  'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Limpopo', 'Eastern Cape',
  'Free State', 'Mpumalanga', 'North West', 'Northern Cape'
]

const inputClass =
  'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 text-xs'

const labelClass = 'block font-semibold text-slate-700 mb-1'

const emptyBuildingForm = {
  name: '',
  property_type: 'student_residence',
  landlord_id: '',
  address: '',
  area: '',
  city: 'Johannesburg',
  province: 'Gauteng',
  postal_code: '',
  description: '',
  amenitiesText: '',
  imageUrlsText: '',
  is_active: true
}

const emptyRoomTypeForm = {
  name: '',
  rent: '',
  deposit: '',
  bedrooms: '1',
  bathrooms: '1',
  capacity: '1',
  size: '',
  ensuite: false,
  furnished: true,
  description: ''
}

const money = (value) => `R ${(Number(value) || 0).toLocaleString('en-ZA')}`

function Modal({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 my-auto max-h-[92vh] flex flex-col">
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-start shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">{title}</h3>
            {subtitle && <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-3.5 sm:p-6 space-y-3.5 overflow-y-auto text-xs flex-1">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-3.5 sm:px-6 py-3 border-t border-slate-100 shrink-0 bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState([])
  const [rooms, setRooms] = useState([])
  const [landlords, setLandlords] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [selectedId, setSelectedId] = useState(null)
  const [roomTypes, setRoomTypes] = useState([])

  const [buildingModal, setBuildingModal] = useState(null) // { mode: 'create' | 'edit', form }
  const [roomTypeModal, setRoomTypeModal] = useState(null)
  const [confirmState, setConfirmState] = useState(null)

  const [generate, setGenerate] = useState({
    roomTypeId: '',
    prefix: 'Room',
    startNumber: '1',
    count: '1',
    availableFrom: '',
    tenantAllowed: []
  })

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 4000)
  }

  const loadAll = async () => {
    setLoading(true)
    const [buildingRows, roomRows, landlordRows] = await Promise.all([
      getBuildings(),
      getBuildingRooms(),
      getLandlordsList()
    ])
    setBuildings(buildingRows)
    setRooms(roomRows)
    setLandlords(landlordRows || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.id === selectedId) || null,
    [buildings, selectedId]
  )

  useEffect(() => {
    let cancelled = false
    if (!selectedId) { setRoomTypes([]); return }
    getBuildingRoomTypes(selectedId).then((rows) => {
      if (!cancelled) setRoomTypes(rows)
    })
    return () => { cancelled = true }
  }, [selectedId])

  const roomsByBuilding = useMemo(() => {
    const map = {}
    for (const room of rooms) {
      if (!room.building_id) continue
      if (!map[room.building_id]) map[room.building_id] = []
      map[room.building_id].push(room)
    }
    return map
  }, [rooms])

  const buildingRooms = useMemo(
    () => (selectedId ? roomsByBuilding[selectedId] || [] : []),
    [roomsByBuilding, selectedId]
  )

  const totals = useMemo(() => ({
    buildings: buildings.length,
    rooms: rooms.length,
    vacant: rooms.filter((r) => r.is_active && !r.occupied).length,
    // Occupied is its own count: an offline-but-empty room is neither vacant nor
    // occupied, so it must not be inferred as rooms - vacant.
    occupied: rooms.filter((r) => r.occupied).length,
    roomTypes: roomTypes.length
  }), [buildings, rooms, roomTypes])

  /* ----------------------------- building CRUD ----------------------------- */

  const openCreateBuilding = () => setBuildingModal({ mode: 'create', form: { ...emptyBuildingForm } })

  const openEditBuilding = (building) => setBuildingModal({
    mode: 'edit',
    id: building.id,
    form: {
      name: building.name || '',
      property_type: building.property_type || 'student_residence',
      landlord_id: building.landlord_id || '',
      address: building.address || '',
      area: building.area || '',
      city: building.city || '',
      province: building.province || 'Gauteng',
      postal_code: building.postal_code || '',
      description: building.description || '',
      amenitiesText: (building.amenities || []).join(', '),
      imageUrlsText: (building.image_urls || []).join('\n'),
      is_active: building.is_active !== false
    }
  })

  const setBuildingField = (patch) =>
    setBuildingModal((prev) => (prev ? { ...prev, form: { ...prev.form, ...patch } } : prev))

  const toBuildingPayload = (form) => ({
    name: form.name,
    property_type: form.property_type,
    landlord_id: form.landlord_id || null,
    address: form.address,
    area: form.area,
    city: form.city,
    province: form.province,
    postal_code: form.postal_code,
    description: form.description,
    amenities: String(form.amenitiesText || '')
      .split(',').map((s) => s.trim()).filter(Boolean),
    image_urls: String(form.imageUrlsText || '')
      .split('\n').map((s) => s.trim()).filter(Boolean),
    is_active: form.is_active
  })

  const submitBuilding = async (event) => {
    event.preventDefault()
    const form = buildingModal.form
    if (!form.name.trim() || !form.address.trim()) {
      showToast('A building needs at least a name and a street address.')
      return
    }

    setSubmitting(true)
    try {
      const payload = toBuildingPayload(form)
      if (buildingModal.mode === 'edit') {
        const updated = await updateAdminBuilding(buildingModal.id, payload)
        setBuildings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
        showToast(`Building "${updated.name}" updated.`)
      } else {
        const created = await createAdminBuilding(payload)
        setBuildings((prev) => [created, ...prev])
        setSelectedId(created.id)
        showToast(`Building "${created.name}" created. Add its room types next.`)
      }
      setBuildingModal(null)
    } catch (err) {
      showToast(`Error: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDeleteBuilding = (building) => setConfirmState({
    title: `Delete "${building.name}"?`,
    body: 'The building and its room types are removed. Its rooms stay in the registry as standalone listings (their building link is cleared), so no application or payment is lost.',
    action: async () => {
      await deleteAdminBuilding(building.id)
      setBuildings((prev) => prev.filter((b) => b.id !== building.id))
      setRooms((prev) => prev.map((r) => (r.building_id === building.id ? { ...r, building_id: null } : r)))
      if (selectedId === building.id) setSelectedId(null)
      showToast('Building deleted.')
    }
  })

  /* ----------------------------- room type CRUD ---------------------------- */

  const openCreateRoomType = (preset = null) => setRoomTypeModal({
    mode: 'create',
    form: preset
      ? {
          ...emptyRoomTypeForm,
          name: preset.name,
          description: preset.description,
          bedrooms: String(preset.bedrooms),
          bathrooms: String(preset.bathrooms),
          capacity: String(preset.capacity),
          ensuite: preset.ensuite,
          furnished: preset.furnished
        }
      : { ...emptyRoomTypeForm }
  })

  const openEditRoomType = (roomType) => setRoomTypeModal({
    mode: 'edit',
    id: roomType.id,
    form: {
      name: roomType.name || '',
      rent: String(roomType.rent ?? ''),
      deposit: roomType.deposit != null ? String(roomType.deposit) : '',
      bedrooms: String(roomType.bedrooms ?? 1),
      bathrooms: String(roomType.bathrooms ?? 1),
      capacity: String(roomType.capacity ?? 1),
      size: roomType.size || '',
      ensuite: Boolean(roomType.ensuite),
      furnished: roomType.furnished !== false,
      description: roomType.description || ''
    }
  })

  const setRoomTypeField = (patch) =>
    setRoomTypeModal((prev) => (prev ? { ...prev, form: { ...prev.form, ...patch } } : prev))

  const submitRoomType = async (event) => {
    event.preventDefault()
    const form = roomTypeModal.form
    if (!form.name.trim() || !form.rent) {
      showToast('A room type needs a name and a monthly rent.')
      return
    }

    setSubmitting(true)
    try {
      if (roomTypeModal.mode === 'edit') {
        const updated = await updateBuildingRoomType(roomTypeModal.id, {
          name: form.name.trim(),
          rent: Number(form.rent),
          deposit: form.deposit === '' ? null : Number(form.deposit),
          bedrooms: Number(form.bedrooms) || 1,
          bathrooms: Number(form.bathrooms) || 1,
          capacity: Math.max(1, Number(form.capacity) || 1),
          size: form.size.trim() || null,
          ensuite: Boolean(form.ensuite),
          furnished: Boolean(form.furnished),
          description: form.description.trim() || null
        })
        setRoomTypes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
        showToast(`Room type "${updated.name}" updated.`)
      } else {
        const created = await createBuildingRoomType({
          building_id: selectedId,
          name: form.name.trim(),
          rent: Number(form.rent),
          deposit: form.deposit === '' ? null : Number(form.deposit),
          bedrooms: Number(form.bedrooms) || 1,
          bathrooms: Number(form.bathrooms) || 1,
          capacity: Math.max(1, Number(form.capacity) || 1),
          size: form.size.trim() || null,
          ensuite: Boolean(form.ensuite),
          furnished: Boolean(form.furnished),
          description: form.description.trim() || null
        })
        setRoomTypes((prev) => [...prev, created])
        setGenerate((prev) => (prev.roomTypeId ? prev : { ...prev, roomTypeId: created.id }))
        showToast(`Room type "${created.name}" added. Generate its rooms below.`)
      }
      setRoomTypeModal(null)
    } catch (err) {
      showToast(`Error: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDeleteRoomType = (roomType) => {
    const linked = buildingRooms.filter((r) => r.room_type_id === roomType.id).length
    setConfirmState({
      title: `Delete room type "${roomType.name}"?`,
      body: linked > 0
        ? `${linked} room(s) use this type. They are kept, but lose the room-type link, so their rent and capacity stay as they are today.`
        : 'No rooms use this room type yet.',
      action: async () => {
        await deleteBuildingRoomType(roomType.id)
        setRoomTypes((prev) => prev.filter((r) => r.id !== roomType.id))
        setGenerate((prev) => (prev.roomTypeId === roomType.id ? { ...prev, roomTypeId: '' } : prev))
        showToast('Room type deleted.')
      }
    })
  }

  /* ------------------------------ bulk rooms ------------------------------- */

  const generatePreview = useMemo(() => {
    const labels = buildRoomLabels({
      prefix: generate.prefix,
      startNumber: generate.startNumber,
      count: generate.count
    })
    if (labels.length <= 4) return labels
    return [...labels.slice(0, 3), `… ${labels[labels.length - 1]}`]
  }, [generate.prefix, generate.startNumber, generate.count])

  const selectedRoomType = roomTypes.find((r) => r.id === generate.roomTypeId) || null

  const runGenerate = async () => {
    if (!selectedBuilding) return
    if (!selectedRoomType) { showToast('Choose a room type to generate rooms for.'); return }

    const labels = buildRoomLabels({
      prefix: generate.prefix,
      startNumber: generate.startNumber,
      count: generate.count
    })

    const clash = buildingRooms
      .map((r) => String(r.unit_label || '').trim().toLowerCase())
      .filter(Boolean)
    const duplicates = labels.filter((label) => clash.includes(label.toLowerCase()))
    if (duplicates.length > 0) {
      showToast(`These rooms already exist in this building: ${duplicates.slice(0, 3).join(', ')}${duplicates.length > 3 ? '…' : ''}`)
      return
    }

    setSubmitting(true)
    try {
      const created = await generateBuildingRooms({
        building: selectedBuilding,
        roomType: selectedRoomType,
        labels,
        tenantAllowed: generate.tenantAllowed,
        availableFrom: generate.availableFrom || null
      })
      const refreshed = await getBuildingRooms(selectedBuilding.id)
      setRooms((prev) => [...prev.filter((r) => r.building_id !== selectedBuilding.id), ...refreshed])
      showToast(`${created.length} room(s) created for "${selectedRoomType.name}".`)
      setGenerate((prev) => ({ ...prev, startNumber: String(Number(prev.startNumber) + created.length) }))
    } catch (err) {
      showToast(`Error: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleRoomActive = async (room) => {
    try {
      const next = !room.is_active
      await togglePropertyActive(room.id, next)
      setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, is_active: next } : r)))
      showToast(`${room.unit_label || room.title}: ${next ? 'live' : 'offline'}.`)
    } catch (err) {
      showToast(`Error: ${err.message}`)
    }
  }

  const toggleTenantAllowed = (value) => {
    setGenerate((prev) => {
      const current = prev.tenantAllowed || []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : normalizeTenantAllowed([...current, value])
      return { ...prev, tenantAllowed: next }
    })
  }

  const statCard = (label, value, hint, Icon, tone) => (
    <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
      <div className="min-w-0 pr-2">
        <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate">{label}</p>
        <h3 className={`text-lg sm:text-2xl font-black mt-0.5 sm:mt-1 ${tone}`}>{value}</h3>
        <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">{hint}</p>
      </div>
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
    </div>
  )

  /* --------------------------------- render -------------------------------- */

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      <section className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {selectedBuilding ? selectedBuilding.name : 'Buildings & Room Inventory'}
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {selectedBuilding ? 'Building workspace' : 'Multi-room assets'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedBuilding
              ? `${[selectedBuilding.area, selectedBuilding.city].filter(Boolean).join(', ') || 'Location not set'} · ${buildingTypeLabel(selectedBuilding.property_type)}`
              : 'Create a building once, define its room types, then generate every room it contains in one action.'}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 w-full md:w-auto">
          {selectedBuilding ? (
            <button
              onClick={() => setSelectedId(null)}
              className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft size={15} /> All buildings
            </button>
          ) : (
            <button
              onClick={openCreateBuilding}
              className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={15} /> New building
            </button>
          )}
          <button
            onClick={loadAll}
            disabled={loading}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg transition-colors shrink-0 cursor-pointer"
            title="Refresh buildings"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex flex-col justify-center items-center py-20 text-slate-400 gap-2">
          <RefreshCw size={24} className="animate-spin text-blue-500" />
          <p className="text-xs">Loading buildings and rooms…</p>
        </div>
      ) : !selectedBuilding ? (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {statCard('Buildings', totals.buildings, 'Assets under management', Building2, 'text-slate-900')}
            {statCard('Rooms', totals.rooms, 'Individually lettable', DoorOpen, 'text-slate-900')}
            {statCard('Vacant & live', totals.vacant, 'Ready to match', CheckCircle2, 'text-emerald-600')}
            {statCard('Occupied', totals.occupied, 'Tenants in place', Users, 'text-blue-600')}
          </section>

          {buildings.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <Building2 className="mx-auto text-slate-300" size={32} />
              <h3 className="mt-3 text-sm font-bold text-slate-900">No buildings yet</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                Add the asset first — its address, who owns it and what kind of residence it is. Then define room types
                (Single Ensuite, Sharing Double…) and generate the rooms.
              </p>
              <button
                onClick={openCreateBuilding}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Plus size={15} /> Create the first building
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {buildings.map((building) => {
                const list = roomsByBuilding[building.id] || []
                const vacant = list.filter((r) => r.is_active && !r.occupied).length
                return (
                  <button
                    key={building.id}
                    onClick={() => setSelectedId(building.id)}
                    className="text-left bg-white rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all p-4 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 truncate">{building.name}</h3>
                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin size={11} />
                          {[building.address, building.area, building.city].filter(Boolean).join(', ') || 'No address'}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                        building.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {building.is_active ? 'Active' : 'Offline'}
                      </span>
                    </div>

                    <p className="mt-2 text-[10px] uppercase tracking-wide font-semibold text-slate-400">
                      {buildingTypeLabel(building.property_type)}
                    </p>

                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400">Rooms</p>
                        <p className="text-sm font-black text-slate-900">{list.length}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400">Vacant</p>
                        <p className="text-sm font-black text-emerald-600">{vacant}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400">Owner</p>
                        <p className="text-[10px] font-semibold text-slate-600 truncate">
                          {building.landlord?.full_name || building.landlord?.email || 'Place4U'}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {/* -------------------------- building detail ------------------------- */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {statCard('Rooms', buildingRooms.length, 'In this building', DoorOpen, 'text-slate-900')}
            {statCard('Vacant & live', buildingRooms.filter((r) => r.is_active && !r.occupied).length, 'Ready to match', CheckCircle2, 'text-emerald-600')}
            {statCard('Room types', roomTypes.length, 'Product templates', Layers, 'text-blue-600')}
            {statCard('Owner', selectedBuilding.landlord?.full_name?.split(' ')[0] || 'Place4U', selectedBuilding.landlord?.email || 'Platform managed', Users, 'text-slate-900')}
          </section>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openEditBuilding(selectedBuilding)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <Pencil size={14} /> Edit building
            </button>
            <button
              onClick={() => confirmDeleteBuilding(selectedBuilding)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <Trash2 size={14} /> Delete building
            </button>
          </div>

          {/* room types */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Room types</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  The products you rent inside this building. Rooms copy the rent, deposit and capacity of their type.
                </p>
              </div>
              <button
                onClick={() => openCreateRoomType()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Plus size={14} /> Add room type
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {ROOM_TYPE_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => openCreateRoomType(preset)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-[11px] font-semibold text-slate-600 cursor-pointer"
                >
                  <Wand2 size={11} className="text-blue-500" /> {preset.name}
                </button>
              ))}
            </div>

            {roomTypes.length === 0 ? (
              <p className="mt-4 text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3">
                No room types yet. Add one above — the presets are a starting point, every figure stays editable.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-100">
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Rent</th>
                      <th className="py-2 pr-3">Deposit</th>
                      <th className="py-2 pr-3">Occupants</th>
                      <th className="py-2 pr-3">Rooms</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomTypes.map((roomType) => {
                      const count = buildingRooms.filter((r) => r.room_type_id === roomType.id).length
                      return (
                        <tr key={roomType.id} className="border-b border-slate-50 last:border-0">
                          <td className="py-2.5 pr-3">
                            <p className="font-semibold text-slate-900">{roomType.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {roomType.capacity === 1 ? 'Single' : `Sharing · ${roomType.capacity}`}
                              {roomType.ensuite ? ' · Ensuite' : ''}
                              {roomType.furnished ? ' · Furnished' : ''}
                            </p>
                          </td>
                          <td className="py-2.5 pr-3 font-bold text-slate-900">{money(roomType.rent)}</td>
                          <td className="py-2.5 pr-3 text-slate-600">{roomType.deposit != null ? money(roomType.deposit) : '—'}</td>
                          <td className="py-2.5 pr-3 text-slate-600">{roomType.capacity}</td>
                          <td className="py-2.5 pr-3">
                            <span className={`font-bold ${count === 0 ? 'text-amber-600' : 'text-slate-900'}`}>{count}</span>
                          </td>
                          <td className="py-2.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => openEditRoomType(roomType)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                              title="Edit room type"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => confirmDeleteRoomType(roomType)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              title="Delete room type"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* generate rooms */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <h3 className="text-sm font-bold text-slate-900">Generate rooms</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Create the individual lettable rooms for a room type. Labels only need to be unique inside this building.
            </p>

            {roomTypes.length === 0 ? (
              <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Add a room type first — rooms inherit their rent, deposit and capacity from it.
              </p>
            ) : (
              <>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className={labelClass}>Room type</label>
                    <select
                      value={generate.roomTypeId}
                      onChange={(e) => setGenerate((prev) => ({ ...prev, roomTypeId: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">Select a room type…</option>
                      {roomTypes.map((roomType) => (
                        <option key={roomType.id} value={roomType.id}>
                          {roomType.name} — {money(roomType.rent)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Label prefix</label>
                    <input
                      value={generate.prefix}
                      onChange={(e) => setGenerate((prev) => ({ ...prev, prefix: e.target.value }))}
                      className={inputClass}
                      placeholder="Room"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Start at</label>
                    <input
                      type="number"
                      min="1"
                      value={generate.startNumber}
                      onChange={(e) => setGenerate((prev) => ({ ...prev, startNumber: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>How many</label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={generate.count}
                      onChange={(e) => setGenerate((prev) => ({ ...prev, count: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Available from (optional)</label>
                    <input
                      type="date"
                      value={generate.availableFrom}
                      onChange={(e) => setGenerate((prev) => ({ ...prev, availableFrom: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Allowed tenants</label>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {TENANT_ALLOWED_OPTIONS.map((option) => {
                        const active = generate.tenantAllowed.includes(option.value)
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleTenantAllowed(option.value)}
                            aria-pressed={active}
                            className={`px-2.5 py-1.5 rounded-full border text-[11px] font-semibold cursor-pointer transition-colors ${
                              active
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                      {generate.tenantAllowed.length === 0 && (
                        <span className="text-[10px] text-slate-400 self-center">Open to anyone</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-900">{generatePreview.join(' · ')}</span>
                    {selectedRoomType && (
                      <span className="block text-slate-400 mt-0.5">
                        {selectedRoomType.capacity === 1 ? '1 occupant' : `${selectedRoomType.capacity} occupants`} ·{' '}
                        {money(selectedRoomType.rent)}/mo · {tenantAllowedSummary(generate.tenantAllowed)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={runGenerate}
                    disabled={submitting || !generate.roomTypeId}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <DoorOpen size={14} /> {submitting ? 'Generating…' : `Generate ${Number(generate.count) || 1} room(s)`}
                  </button>
                </div>
              </>
            )}
          </section>

          {/* rooms */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Rooms in this building</h3>
              <span className="text-[10px] text-slate-500">{buildingRooms.length} total</span>
            </div>

            {buildingRooms.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3">
                No rooms yet. Generate them above — they appear in Property Management immediately.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-100">
                      <th className="py-2 pr-3">Room</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Rent</th>
                      <th className="py-2 pr-3">Allowed</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 text-right">Live</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildingRooms.map((room) => {
                      const roomType = roomTypes.find((r) => r.id === room.room_type_id)
                      return (
                        <tr key={room.id} className="border-b border-slate-50 last:border-0">
                          <td className="py-2.5 pr-3 font-semibold text-slate-900">
                            {room.unit_label || room.title || 'Room'}
                            <span className="block text-[10px] font-normal text-slate-400">
                              {propertyTypeShortLabel(room.property_type)}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-slate-600">{roomType?.name || 'Unassigned'}</td>
                          <td className="py-2.5 pr-3 font-bold text-slate-900">{money(room.price)}</td>
                          <td className="py-2.5 pr-3 text-slate-600">{tenantAllowedSummary(room.tenant_allowed)}</td>
                          <td className="py-2.5 pr-3">
                            {room.occupied ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Occupied</span>
                            ) : room.is_active ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Vacant</span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Offline</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => toggleRoomActive(room)}
                              className={`p-1.5 rounded cursor-pointer ${
                                room.is_active
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={room.is_active ? 'Take this room offline' : 'Publish this room'}
                            >
                              <Power size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* -------------------------- building modal -------------------------- */}
      {buildingModal && (
        <Modal
          title={buildingModal.mode === 'edit' ? 'Edit building' : 'New building'}
          subtitle="The asset. Rooms are created inside it afterwards."
          onClose={() => setBuildingModal(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setBuildingModal(null)}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="building-form"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-lg cursor-pointer"
              >
                {submitting ? 'Saving…' : buildingModal.mode === 'edit' ? 'Save building' : 'Create building'}
              </button>
            </>
          }
        >
          <form id="building-form" onSubmit={submitBuilding} className="space-y-3">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Building name <span className="text-red-500">*</span></label>
                <input
                  required
                  value={buildingModal.form.name}
                  onChange={(e) => setBuildingField({ name: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. Braamfontein Student Village"
                />
              </div>
              <div>
                <label className={labelClass}>Building type</label>
                <select
                  value={buildingModal.form.property_type}
                  onChange={(e) => setBuildingField({ property_type: e.target.value })}
                  className={inputClass}
                >
                  {BUILDING_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Street address <span className="text-red-500">*</span></label>
              <input
                required
                value={buildingModal.form.address}
                onChange={(e) => setBuildingField({ address: e.target.value })}
                className={inputClass}
                placeholder="e.g. 12 Jorissen Street"
              />
            </div>

            <div className="grid gap-2.5 sm:grid-cols-4">
              <div>
                <label className={labelClass}>Area / Suburb</label>
                <input
                  value={buildingModal.form.area}
                  onChange={(e) => setBuildingField({ area: e.target.value })}
                  className={inputClass}
                  placeholder="Braamfontein"
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  value={buildingModal.form.city}
                  onChange={(e) => setBuildingField({ city: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Province</label>
                <select
                  value={buildingModal.form.province}
                  onChange={(e) => setBuildingField({ province: e.target.value })}
                  className={inputClass}
                >
                  {PROVINCES.map((province) => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Postal code</label>
                <input
                  value={buildingModal.form.postal_code}
                  onChange={(e) => setBuildingField({ postal_code: e.target.value })}
                  className={inputClass}
                  placeholder="2001"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Owner / operator</label>
              <select
                value={buildingModal.form.landlord_id}
                onChange={(e) => setBuildingField({ landlord_id: e.target.value })}
                className={inputClass}
              >
                <option value="">Place4U managed (no landlord account)</option>
                {landlords.map((landlord) => (
                  <option key={landlord.id} value={landlord.id}>
                    {landlord.full_name || landlord.email} ({landlord.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                rows={2}
                value={buildingModal.form.description}
                onChange={(e) => setBuildingField({ description: e.target.value })}
                className={`${inputClass} resize-vertical`}
                placeholder="Shared areas, security, distance to campus or transport…"
              />
            </div>

            <div>
              <label className={labelClass}>Building amenities (comma separated)</label>
              <input
                value={buildingModal.form.amenitiesText}
                onChange={(e) => setBuildingField({ amenitiesText: e.target.value })}
                className={inputClass}
                placeholder="Fibre internet, Backup power, 24/7 security, Laundry"
              />
            </div>

            <div>
              <label className={labelClass}>Image URLs (one per line)</label>
              <textarea
                rows={2}
                value={buildingModal.form.imageUrlsText}
                onChange={(e) => setBuildingField({ imageUrlsText: e.target.value })}
                className={`${inputClass} resize-vertical`}
                placeholder="https://…"
              />
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={buildingModal.form.is_active}
                onChange={(e) => setBuildingField({ is_active: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
              />
              <span className="font-semibold text-slate-700">Active building</span>
            </label>
          </form>
        </Modal>
      )}

      {/* -------------------------- room type modal ------------------------- */}
      {roomTypeModal && (
        <Modal
          title={roomTypeModal.mode === 'edit' ? 'Edit room type' : 'Add room type'}
          subtitle="Every room generated for this type inherits these terms."
          onClose={() => setRoomTypeModal(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setRoomTypeModal(null)}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="room-type-form"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-lg cursor-pointer"
              >
                {submitting ? 'Saving…' : 'Save room type'}
              </button>
            </>
          }
        >
          <form id="room-type-form" onSubmit={submitRoomType} className="space-y-3">
            <div>
              <label className={labelClass}>Name <span className="text-red-500">*</span></label>
              <input
                required
                value={roomTypeModal.form.name}
                onChange={(e) => setRoomTypeField({ name: e.target.value })}
                className={inputClass}
                placeholder="e.g. Single Ensuite"
              />
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Monthly rent (ZAR) <span className="text-red-500">*</span></label>
                <input
                  required
                  type="number"
                  min="0"
                  value={roomTypeModal.form.rent}
                  onChange={(e) => setRoomTypeField({ rent: e.target.value })}
                  className={inputClass}
                  placeholder="4500"
                />
              </div>
              <div>
                <label className={labelClass}>Deposit (ZAR)</label>
                <input
                  type="number"
                  min="0"
                  value={roomTypeModal.form.deposit}
                  onChange={(e) => setRoomTypeField({ deposit: e.target.value })}
                  className={inputClass}
                  placeholder="4500"
                />
              </div>
              <div>
                <label className={labelClass}>Floor size</label>
                <input
                  value={roomTypeModal.form.size}
                  onChange={(e) => setRoomTypeField({ size: e.target.value })}
                  className={inputClass}
                  placeholder="18 m²"
                />
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Occupants</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={roomTypeModal.form.capacity}
                  onChange={(e) => setRoomTypeField({ capacity: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Bedrooms</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={roomTypeModal.form.bedrooms}
                  onChange={(e) => setRoomTypeField({ bedrooms: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Bathrooms</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={roomTypeModal.form.bathrooms}
                  onChange={(e) => setRoomTypeField({ bathrooms: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roomTypeModal.form.ensuite}
                  onChange={(e) => setRoomTypeField({ ensuite: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
                <span className="font-semibold text-slate-700">Ensuite bathroom</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roomTypeModal.form.furnished}
                  onChange={(e) => setRoomTypeField({ furnished: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
                <span className="font-semibold text-slate-700">Furnished</span>
              </label>
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                rows={2}
                value={roomTypeModal.form.description}
                onChange={(e) => setRoomTypeField({ description: e.target.value })}
                className={`${inputClass} resize-vertical`}
                placeholder="What the tenant gets in this room…"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* ---------------------------- confirm modal ------------------------- */}
      {confirmState && (
        <Modal
          title={confirmState.title}
          onClose={() => setConfirmState(null)}
          footer={
            <>
              <button
                onClick={() => setConfirmState(null)}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const action = confirmState.action
                  setConfirmState(null)
                  try {
                    await action()
                  } catch (err) {
                    showToast(`Error: ${err.message}`)
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Delete
              </button>
            </>
          }
        >
          <div className="flex items-start gap-2.5 text-xs text-slate-600">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <p>{confirmState.body}</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
