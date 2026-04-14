
import React from 'react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
}

const CreateResidentModal = ({ isOpen, onClose }: ModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-xl">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-slate-900">Add New Resident</h2>
          <p className="text-slate-600 mt-1">Fill in the resident information below</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onClose(); }} className="space-y-4 flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="firstname" className="text-sm font-medium text-slate-700">First Name</label>
              <input id="firstname" type="text" placeholder="Enter first name" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="middlename" className="text-sm font-medium text-slate-700">Middle Name</label>
              <input id="middlename" type="text" placeholder="Enter middle name" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="lastname" className="text-sm font-medium text-slate-700">Last Name</label>
              <input id="lastname" type="text" placeholder="Enter last name" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
              <input id="email" type="email" placeholder="Enter email address" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="Phonenumber" className="text-sm font-medium text-slate-700">Phonenumber</label>
              <input id="Phonenumber" type="text" placeholder="Enter phone number" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="dob" className="text-sm font-medium text-slate-700">Date of Birth</label>
              <input id="dob" type="date" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="gender" className="text-sm font-medium text-slate-700">Gender</label>
              <select id="gender" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700">
                <option>Select Gender</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="civilstatus" className="text-sm font-medium text-slate-700">Civil Status</label>
              <select id="civilstatus" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700">
                <option>Select Civil Status</option>
                <option>Single</option>
                <option>Married</option>
                <option>Widowed</option>
                <option>Divorced</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="citizenship" className="text-sm font-medium text-slate-700">Citizenship</label>
              <input id="citizenship" type="text" placeholder="Enter citizenship" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="unit" className="text-sm font-medium text-slate-700">Unit/Block</label>
              <input id="unit" type="text" placeholder="Enter unit/block" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="street" className="text-sm font-medium text-slate-700">Street</label>
              <input id="street" type="text" placeholder="Enter street" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <label htmlFor="voter" className="flex items-center gap-3 cursor-pointer">
              <input id="voter" type="checkbox" className="w-4 h-4 accent-blue-600" />
              <span className="text-sm font-medium text-slate-700">Registered Voter</span>
            </label>
          </div>

          <div className="sticky bottom-0 bg-white py-4 border-t border-gray-100 mt-auto flex gap-3">
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
              Add Resident
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateResidentModal