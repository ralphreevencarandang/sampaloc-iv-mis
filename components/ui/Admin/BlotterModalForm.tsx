"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X, Eye } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

import { createBlotter, updateBlotter, getResidentsForDropdown, type CreateBlotterResult, type BlotterRecord } from "@/server/actions/blotter.actions";
import { getOfficials } from "@/server/actions/official.actions";
import { blotterSchema, type BlotterFormInput } from "@/validations/blotter.validation";

export interface BlotterModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: BlotterRecord | null;
}

function RequiredMark() {
  return <span aria-hidden="true" className="ml-1 text-red-500">*</span>;
}

const BlotterModalForm = ({ isOpen, onClose, initialData }: BlotterModalFormProps) => {
  const queryClient = useQueryClient();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isEditMode = !!initialData;

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
    watch,
    setError,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<BlotterFormInput>({
    resolver: zodResolver(blotterSchema),
    defaultValues: {
      status: "OPEN",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setValue("complainantId", initialData.complainantId || "");
        setValue("complainantName", initialData.complainant);
        setValue("respondentName", initialData.respondentName);
        setValue("location", initialData.location);
        setValue("incident", initialData.incident);
        setValue("status", initialData.status === "Open" ? "OPEN" : "RESOLVED");
        
        if (initialData.handledById) {
          setValue("handledById", initialData.handledById);
        } else {
          setValue("handledById", "");
        }
        
        if (initialData.date) {
          const isoDate = new Date(initialData.date).toISOString().slice(0, 16);
          setValue("date", isoDate);
        }

        if (initialData.blotterImage) {
          setImagePreview(initialData.blotterImage);
          setValue("blotterImageName", initialData.blotterImage, { shouldValidate: true });
        } else {
          setImagePreview(null);
          setValue("blotterImageName", "");
        }
        setImageFile(null);
      } else {
        reset({
          status: "OPEN",
        });
        setImagePreview(null);
        setImageFile(null);
      }
    }
  }, [isOpen, initialData, setValue, reset]);

  useEffect(() => {
    return () => {
      // Clear object URLs when unmounting or changing preview
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = isEditMode && initialData
        ? await updateBlotter(initialData.id, formData)
        : await createBlotter(formData);

      if (!result.success) {
        throw result;
      }
      return result;
    },
    onSuccess: (result: CreateBlotterResult) => {
      toast.success(result.message || (isEditMode ? "Blotter updated successfully." : "Blotter created successfully."));
      queryClient.invalidateQueries({ queryKey: ["blotters"] });
      handleClose();
    },
    onError: (error: unknown) => {
      const result = error as CreateBlotterResult;
      const errorMsg = result.message || "An unexpected error occurred.";
      toast.error(errorMsg);
      
      setError("root", { type: "server", message: errorMsg });

      if (result.fieldErrors) {
        Object.keys(result.fieldErrors).forEach((key) => {
          setError(key as keyof BlotterFormInput, {
            type: "server",
            message: result.fieldErrors![key],
          });
        });
      }
    },
  });

  const onSubmit = (data: BlotterFormInput) => {
    const formData = new FormData();
    if (data.complainantId) formData.append("complainantId", data.complainantId);
    formData.append("complainantName", data.complainantName);
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
      formData.append("blotterImageName", imageFile.name);
    } else {
      // If we don't have a new file but we have a predefined existing image
      formData.append("blotterImageName", data.blotterImageName || "");
    }

    mutation.mutate(formData);
  };

  const handleClose = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageFile(null);
    reset({ status: "OPEN" });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    onClose();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setImageFile(file);
      setValue("blotterImageName", file.name, { shouldValidate: true });
      clearErrors("blotterImageName");

      setImagePreview((current) => {
        if (current && current.startsWith("blob:")) {
          URL.revokeObjectURL(current);
        }
        return URL.createObjectURL(file);
      });
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageFile(null);
    setValue("blotterImageName", "", { shouldValidate: true });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-xl">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100 z-10 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isEditMode ? "Edit Blotter" : "Add New Blotter"}
            </h2>
            <p className="text-slate-600 mt-1">
              {isEditMode ? "Modify the blotter report details below" : "Fill in the blotter report information below"}
            </p>
          </div>
          <button 
            type="button" 
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 flex-1 p-6">
          {errors.root?.message && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
              {errors.root.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="complainantName" className="text-sm font-medium text-slate-700">
                Complainant Name<RequiredMark />
              </label>
              <input
                id="complainantName"
                type="text"
                placeholder="Complainant Name"
                {...register("complainantName")}
                disabled={!!watch("complainantId")}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 placeholder-slate-400 text-slate-700 disabled:bg-slate-50 disabled:opacity-75"
              />
              {errors.complainantName && (
                <span className="text-red-500 text-xs">{errors.complainantName.message}</span>
              )}
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="complainantId" className="text-sm font-medium text-slate-700">
                Link to Resident (Optional)
              </label>
              <select
                id="complainantId"
                {...register("complainantId")}
                onChange={(e) => {
                  const value = e.target.value;
                  setValue("complainantId", value, { shouldValidate: true });
                  if (value) {
                    const resident = residents?.find(r => r.id === value);
                    if (resident) {
                      setValue("complainantName", resident.fullName, { shouldValidate: true });
                    }
                  }
                }}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 text-slate-700 disabled:bg-slate-50 disabled:opacity-75"
              >
                <option value="">None (Manual Entry)</option>
                {residents?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="respondentName" className="text-sm font-medium text-slate-700">
                Respondent Name<RequiredMark />
              </label>
              <input
                id="respondentName"
                type="text"
                placeholder="Respondent Name"
                {...register("respondentName")}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 placeholder-slate-400"
              />
              {errors.respondentName && (
                <span className="text-red-500 text-xs">{errors.respondentName.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="location" className="text-sm font-medium text-slate-700">
                Location<RequiredMark />
              </label>
              <input
                id="location"
                type="text"
                placeholder="Location"
                {...register("location")}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 placeholder-slate-400"
              />
              {errors.location && (
                <span className="text-red-500 text-xs">{errors.location.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="date" className="text-sm font-medium text-slate-700">
                Date and Time<RequiredMark />
              </label>
              <input
                id="date"
                type="datetime-local"
                {...register("date")}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 text-slate-700"
              />
              {errors.date && (
                <span className="text-red-500 text-xs">{errors.date.message}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="incident" className="text-sm font-medium text-slate-700">
              Incident Description<RequiredMark />
            </label>
            <textarea
              id="incident"
              placeholder="Detailed Incident Description"
              rows={4}
              {...register("incident")}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 placeholder-slate-400"
            />
            {errors.incident && (
              <span className="text-red-500 text-xs">{errors.incident.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="blotterImageName" className="text-sm font-medium text-slate-700">Evidentiary Image (Optional)</label>
            <input type="hidden" {...register("blotterImageName")} />
            <input
              id="blotterImageName"
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-colors"
            />
            {errors.blotterImageName && (
              <span className="text-red-500 text-xs">{errors.blotterImageName.message}</span>
            )}
            
            {imagePreview && (
              <div className="mt-3">
                <label className="text-xs font-medium text-slate-500 mb-2 block">Image Preview:</label>
                <div className="relative inline-block overflow-hidden rounded-lg border border-gray-200 bg-slate-50 shadow-sm group">
                  <Image
                    src={imagePreview}
                    alt="Blotter evidentiary image preview"
                    className="h-32 w-48 object-cover"
                    unoptimized
                    width={192}
                    height={128}
                  />
                  <a
                    href={imagePreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                     <Eye className="w-6 h-6" />
                  </a>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute right-1.5 top-1.5 rounded-full bg-red-600 p-1 text-white opacity-90 transition-all hover:opacity-100 hover:bg-red-700 hover:scale-110"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="status" className="text-sm font-medium text-slate-700">
                Status<RequiredMark />
              </label>
              <select
                id="status"
                {...register("status")}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 text-slate-700"
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
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 text-slate-700 disabled:opacity-75"
              >
                <option value="">No Assignment (Optional)</option>
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

          <div className="flex gap-3 pt-6 border-t border-gray-100 mt-6 sticky bottom-0 bg-white">
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
              className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditMode ? "Save Changes" : "Add Blotter"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlotterModalForm;
