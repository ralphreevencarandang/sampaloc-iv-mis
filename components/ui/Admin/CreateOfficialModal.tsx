import React from 'react'
import { ModalProps } from './CreateResidentModal'

const CreateOfficialModal = ({ isOpen, onClose }: ModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-xl">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-slate-900">Add New Official</h2>
          <p className="text-slate-600 mt-1">Fill in the official information below</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onClose(); }} className="space-y-4 flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="firstname" className="text-sm font-medium text-slate-700">First Name</label>
              <input id="firstname" type="text" placeholder="Enter first name" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="lastname" className="text-sm font-medium text-slate-700">Last Name</label>
              <input id="lastname" type="text" placeholder="Enter last name" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
              <input id="email" type="email" placeholder="Enter email address" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label htmlFor="position" className="text-sm font-medium text-slate-700">Position</label>
              <select id="position" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700">
                <option>Select Position</option>
                <option>Barangay Captain</option>
                <option>Barangay Kagawad - Health</option>
                <option>Barangay Kagawad - Peace & Order</option>
                <option>Barangay Kagawad - Education</option>
                <option>Barangay Kagawad - Infrastructure</option>
                <option>Barangay Kagawad - Environment</option>
                <option>Barangay Kagawad - Agriculture</option>
                <option>Barangay Kagawad - Finance</option>
                <option>SK Chairperson</option>
                <option>Barangay Secretary</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="termstart" className="text-sm font-medium text-slate-700">Term Start</label>
              <input id="termstart" type="date" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="termend" className="text-sm font-medium text-slate-700">Term End</label>
              <input id="termend" type="date" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100 mt-auto flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Add Official
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateOfficialModal
