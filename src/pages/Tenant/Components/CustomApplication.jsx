import React from 'react';
import { X } from 'lucide-react'

const CustomApplication = ({onCancel}) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-300 custom-scrollbar">
        <div className='sticky top-0 bg-white p-4 z-10'>
          <div className='flex items-center justify-end'>
            <X className="text-gray-600 hover:text-gray-800 hover:scale-110 transition-transform cursor-pointer" onClick={onCancel} size={25}/>
          </div>
          <div className='flex items-center justify-center mt-2'>
            <h2 className="text-2xl font-bold text-black">Custom Application</h2>
          </div>
        </div>
        
        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Location Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Location</h3>
            <div className="grid grid-cols-2 space-y-3 gap-2">
                <input type='text' placeholder='Province'
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4f7ef8] focus:border-[#4f7ef8] transition-all text-gray-800"/>
                <input type='text' placeholder='City'
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4f7ef8] focus:border-[#4f7ef8] transition-all text-gray-800"/>
                <input type='text' placeholder='Surbub/ District'
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4f7ef8] focus:border-[#4f7ef8] transition-all text-gray-800"/>
            </div>
          </div>

          {/* Property Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Property</h3>
            <input placeholder='Type'
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4f7ef8] focus:border-[#4f7ef8] transition-all text-gray-800"/>
          </div>
          {/* Budget Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Budget</h3>
            <div className="grid grid-cols-2 gap-2">
                <input placeholder='Minimum' type='number'
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4f7ef8] focus:border-[#4f7ef8] transition-all text-gray-800"/>
                <input placeholder='Maximum' type='number'
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4f7ef8] focus:border-[#4f7ef8] transition-all text-gray-800"/>
            </div>
            </div>

          {/* Submit Button */}
          <div className=" flex items-center justify-end pt-4">
            <button className="bg-[#4f7ef8] hover:bg-[#3d6be0] text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-300 cursor-pointer">
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomApplication