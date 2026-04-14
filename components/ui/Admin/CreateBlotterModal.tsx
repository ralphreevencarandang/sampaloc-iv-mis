import React from 'react'
import { ModalProps } from './CreateResidentModal'

const CreateBlotterModal = ({ isOpen, onClose }: ModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
     <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-xl">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-slate-900">Add New Blotter</h2>
          <p className="text-slate-600 mt-1">Fill in the blotter report information below</p>
        </div>

                <form onSubmit={(e) => { e.preventDefault(); onClose(); }} className="space-y-4 flex-1 p-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700">
              <option>Select Complainant</option>
              <option>Juan Dela Cruz</option>
              <option>Maria Santos</option>
              <option>Pedro Reyes</option>
              <option>Ana Garcia</option>
            </select>
            <input type="text" placeholder="Respondent Name" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            <input type="text" placeholder="Location" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            <input type="datetime-local" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
          </div>

          <textarea placeholder="Incident Description" rows={4} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700">
              <option>Select Status</option>
              <option>Open</option>
              <option>Resolved</option>
            </select>
            <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700">
              <option>Assign To Official (Optional)</option>
              <option>Juan Dela Cruz - Barangay Captain</option>
              <option>Maria Santos - Kagawad Health</option>
            </select>
          </div>

          <div className="flex gap-3 py-4 border-t border-gray-100">
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
              Add Blotter
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateBlotterModal