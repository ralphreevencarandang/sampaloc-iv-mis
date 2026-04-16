"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { createBlotter, getResidentsForDropdown, type CreateBlotterResult } from "@/server/actions/blotter.actions";
import { getOfficials } from "@/server/actions/official.actions";
import { blotterSchema, type BlotterFormInput } from "@/validations/blotter.validation";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateBlotterModal = ({ isOpen, onClose }: ModalProps) => {
  const queryClient = useQueryClient();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: residents } = useQuery({
    queryKey: ["residentsDropdown"],
    queryFn: getResidentsForDropdown,
    enabled: isOpen,
  });

  const { data: officials } = useQuery({
    queryKey: ["officialsDropdown"],
    queryFn: getOfficials,
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BlotterFormInput>({
    resolver: zodResolver(blotterSchema),
    defaultValues: {
      status: "OPEN",
    },
  });

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createBlotter(formData);
      if (!result.success) {
        throw result;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blotters"] });
      reset();
      setImageFile(null);
      setSubmitError(null);
      onClose();
    },
    onError: (error: any) => {
      const result = error as CreateBlotterResult;
      setSubmitError(result.message || "Something went wrong.");
      if (result.fieldErrors) {
        Object.keys(result.fieldErrors).forEach((key) => {
          setError(key as any, {
            type: "server",
            message: result.fieldErrors![key],
          });
        });
      }
    },
  });

  const onSubmit = (data: BlotterFormInput) => {
    setSubmitError(null);
    const formData = new FormData();
    formData.append("complainantId", data.complainantId);
    formData.append("respondentName", data.respondentName);
    formData.append("location", data.location);
    formData.append("date", data.date);
    formData.append("incident", data.incident);
    formData.append("status", data.status);

    if (data.handledById) {
      formData.append("handledById", data.handledById);
    }

    if (imageFile) {
      formData.append("blotterImage", imageFile);
    }

    mutation.mutate(formData);
  };

  const handleClose = () => {
    reset();
    setImageFile(null);
    setSubmitError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-xl">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100 z-10">
          <h2 className="text-2xl font-bold text-slate-900">Add New Blotter</h2>
          <p className="text-slate-600 mt-1">Fill in the blotter report information below</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 flex-1 p-6">
          {submitError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="complainantId" className="text-sm font-medium text-slate-700">Complainant</label>
              <select
                id="complainantId"
                {...register("complainantId")}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 disabled:opacity-50"
              >
                <option value="">Select Complainant</option>
                {residents?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName}
                  </option>
                ))}
              </select>
              {errors.complainantId && (
                <span className="text-red-500 text-xs">{errors.complainantId.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="respondentName" className="text-sm font-medium text-slate-700">Respondent Name</label>
              <input
                id="respondentName"
                type="text"
                placeholder="Respondent Name"
                {...register("respondentName")}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
              {errors.respondentName && (
                <span className="text-red-500 text-xs">{errors.respondentName.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="location" className="text-sm font-medium text-slate-700">Location</label>
              <input
                id="location"
                type="text"
                placeholder="Location"
                {...register("location")}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
              {errors.location && (
                <span className="text-red-500 text-xs">{errors.location.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="date" className="text-sm font-medium text-slate-700">Date and Time</label>
              <input
                id="date"
                type="datetime-local"
                {...register("date")}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700"
              />
              {errors.date && (
                <span className="text-red-500 text-xs">{errors.date.message}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="incident" className="text-sm font-medium text-slate-700">Incident Description</label>
            <textarea
              id="incident"
              placeholder="Incident Description"
              rows={4}
              {...register("incident")}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
            {errors.incident && (
              <span className="text-red-500 text-xs">{errors.incident.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="blotterImageName" className="text-sm font-medium text-slate-700">Evidentiary Image (Optional)</label>
            <input
              id="blotterImageName"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {errors.blotterImageName && (
              <span className="text-red-500 text-xs">{errors.blotterImageName.message}</span>
            )}
            {imageFile && (
              <span className="text-xs text-slate-500">Selected file: {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="status" className="text-sm font-medium text-slate-700">Status</label>
              <select
                id="status"
                {...register("status")}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700"
              >
                <option value="OPEN">Open</option>
                <option value="RESOLVED">Resolved</option>
              </select>
              {errors.status && (
                <span className="text-red-500 text-xs">{errors.status.message}</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="handledById" className="text-sm font-medium text-slate-700">Assigned Official (Optional)</label>
              <select
                id="handledById"
                {...register("handledById")}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700"
              >
                <option value="">Assign To Official (Optional)</option>
                {officials?.map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.name} - {off.position}
                  </option>
                ))}
              </select>
              {errors.handledById && (
                <span className="text-red-500 text-xs">{errors.handledById.message}</span>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Blotter"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBlotterModal;