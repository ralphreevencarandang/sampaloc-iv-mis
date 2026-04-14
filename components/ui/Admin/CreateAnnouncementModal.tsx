import React, { useState } from 'react'
import { ModalProps } from './CreateResidentModal'
import { X, Upload } from 'lucide-react'

const CreateAnnouncementModal = ({ isOpen, onClose }: ModalProps) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')

  if (!isOpen) return null

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setFileName('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setImagePreview(null)
    setFileName('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-xl">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-slate-900">Add New Announcement</h2>
          <p className="text-slate-600 mt-1">Create a new barangay announcement</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 p-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="createdby" className="text-sm font-medium text-slate-700">Created By (Official)</label>
            <select id="createdby" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700">
              <option>Select Official</option>
              <option>Juan Dela Cruz - Barangay Captain</option>
              <option>Maria Santos - Kagawad Health</option>
              <option>Pedro Reyes - Kagawad Peace & Order</option>
              <option>Ana Garcia - Kagawad Education</option>
              <option>Luis Mendoza - Kagawad Infrastructure</option>
              <option>Rosa Lim - Kagawad Environment</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="createdby" className="text-sm font-medium text-slate-700">Status</label>
            <select id="createdby" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700">
              <option>Active</option>
              <option>Inactive</option>
           
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="title" className="text-sm font-medium text-slate-700">Announcement Title</label>
            <input id="title" type="text" placeholder="Enter announcement title" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="content" className="text-sm font-medium text-slate-700">Content</label>
            <textarea id="content" placeholder="Enter announcement content" rows={4} className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          {/* Image Upload */}
          <div className="flex flex-col gap-2">
            <label htmlFor="image" className="text-sm font-medium text-slate-700">Upload Image (Optional)</label>
            <div className="relative">
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <label htmlFor="image" className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">
                  {fileName ? `${fileName}` : 'Click to upload image'}
                </span>
              </label>
            </div>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Image Preview</label>
              <div className="relative inline-block bg-slate-50 rounded-lg overflow-hidden">
                <img src={imagePreview} alt="Preview" className="max-h-40 w-auto" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="sticky bottom-0 bg-white p-4 border-t border-gray-100 mt-auto flex gap-3">
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
              Post Announcement
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateAnnouncementModal
