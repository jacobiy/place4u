import React, { useState } from 'react'
import { X, MapPin, Home, DollarSign, Calendar, Clock, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { TenantQueries } from '../db/queries'

const CustomApplication = ({ onCancel, property, user, application, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    preferred_areas: application?.preferred_areas?.join(', ') || '',
    preferred_types: application?.preferred_types?.join(', ') || property?.property_type || '',
    min_budget: application?.min_budget || '',
    max_budget: application?.max_budget || property?.price || '',
    move_in_date: application?.move_in_date || '',
    lease_duration_months: application?.lease_duration_months || 12,
    special_requirements: application?.special_requirements || ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Format arrays correctly for Postgres
    const preferredAreasArray = formData.preferred_areas
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    const preferredTypesArray = formData.preferred_types
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    const payload = {
      tenant_id: user?.id,
      preferred_areas: preferredAreasArray.length > 0 ? preferredAreasArray : null,
      preferred_types: preferredTypesArray.length > 0 ? preferredTypesArray : null,
      min_budget: formData.min_budget ? parseFloat(formData.min_budget) : null,
      max_budget: formData.max_budget ? parseFloat(formData.max_budget) : null,
      move_in_date: formData.move_in_date || null,
      lease_duration_months: parseInt(formData.lease_duration_months) || null,
      special_requirements: formData.special_requirements || null,
      status: 'submitted'
    }

    let result;
    if (application?.id) {
      result = await TenantQueries.updateApplication(application.id, payload)
    } else {
      result = await TenantQueries.submitApplication(payload)
    }

    if (result.success) {
      setSuccess(true)
      if (onSuccess) onSuccess(result.data)
      setTimeout(() => {
        onCancel()
      }, 2000)
    } else {
      setError(result.error || "Failed to submit application.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start sm:items-center justify-center z-50 p-4 pt-12 sm:pt-4 backdrop-blur-sm">
      <div className="bg-[#0b0e14] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl custom-scrollbar text-white">
        <div className='sticky top-0 bg-[#0b0e14]/90 backdrop-blur-md p-6 border-b border-white/5 z-10 flex items-center justify-between'>
          <div>
            <h2 className="text-2xl font-bold">{application ? 'Edit Application' : 'Tenant Application'}</h2>
            {property ? (
              <p className="text-sm text-white/40 mt-1">
                Applying directly for <span className="text-blue-400 font-medium">{property.title || 'Property'}</span>
              </p>
            ) : (
              <p className="text-sm text-white/40 mt-1">
                Submit a general application with your housing preferences.
              </p>
            )}
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        {success ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in">
            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center border-2 border-green-500">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-bold">{application ? 'Application Updated!' : 'Application Submitted!'}</h3>
            <p className="text-white/40">Your application has been successfully saved to the database.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3 text-sm">
                <AlertCircle size={18} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Location & Type Preferences */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/40 uppercase tracking-widest text-xs font-bold px-2">
                  <MapPin size={14} />
                  <span>Preferences</span>
                </div>
                <div className="glass rounded-2xl p-5 space-y-4 border border-white/5">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/40 mb-2 block">Preferred Areas (Comma Separated)</label>
                    <input 
                      type="text" name="preferred_areas" value={formData.preferred_areas} onChange={handleChange}
                      placeholder="e.g. Downtown, Suburbs, Northside"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/40 mb-2 block">Preferred Property Types (Comma Separated)</label>
                    <input 
                      type="text" name="preferred_types" value={formData.preferred_types} onChange={handleChange}
                      placeholder="e.g. Apartment, House, Condo"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Budget Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/40 uppercase tracking-widest text-xs font-bold px-2">
                  <DollarSign size={14} />
                  <span>Budget Requirements</span>
                </div>
                <div className="glass rounded-2xl p-5 border border-white/5 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/40 mb-2 block">Minimum Budget</label>
                    <input 
                      type="number" name="min_budget" value={formData.min_budget} onChange={handleChange} placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/40 mb-2 block">Maximum Budget</label>
                    <input 
                      type="number" name="max_budget" value={formData.max_budget} onChange={handleChange} placeholder="50000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Lease Timing Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/40 uppercase tracking-widest text-xs font-bold px-2">
                  <Calendar size={14} />
                  <span>Lease Details</span>
                </div>
                <div className="glass rounded-2xl p-5 border border-white/5 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/40 mb-2 block">Target Move-in Date</label>
                    <input 
                      type="date" name="move_in_date" value={formData.move_in_date} onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/40 mb-2 block">Duration (Months)</label>
                    <input 
                      type="number" name="lease_duration_months" value={formData.lease_duration_months} onChange={handleChange} placeholder="12"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Special Requirements */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/40 uppercase tracking-widest text-xs font-bold px-2">
                  <FileText size={14} />
                  <span>Special Requirements</span>
                </div>
                <div className="glass rounded-2xl p-5 border border-white/5">
                  <textarea 
                    name="special_requirements" value={formData.special_requirements} onChange={handleChange}
                    placeholder="Any specific accessibility needs, guarantor info, or additional context?"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors min-h-[100px] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 rounded-xl text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? 'Saving...' : application ? 'Update Application' : 'Submit Application'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default CustomApplication
