"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { createOfficial, updateOfficial } from "@/server/actions/official.actions";
import { MAX_VALID_ID_IMAGE_SIZE_BYTES, validateValidIdImageFile } from "@/lib/valid-id-image";
import type { OfficialRecord } from "@/server/officials/officials";
import { officialSchema, type OfficialFormInput } from "@/validations/official.validation";

type OfficialModalFormProps = {
  isOpen: boolean;
  onClose: () => void;
  initialData?: OfficialRecord | null;
};

function RequiredMark() {
  return <span aria-hidden="true" className="ml-1 text-red-500">*</span>;
}

const positionOptions = [
  "Punong Barangay",
  "Barangay Kagawad",
  "Barangay Secretary",
  "Barangay Treasurer",
  "SK Chairperson",
  "SK Kagawad",
];

const defaultValues: OfficialFormInput = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  status: "Active",
  position: "",
  officialProfileName: "",
  termStart: "",
  termEnd: "",
};

const OfficialModalForm = ({
  isOpen,
  onClose,
  initialData,
}: OfficialModalFormProps) => {
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const isEditMode = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<OfficialFormInput>({
    resolver: zodResolver(officialSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setValue("firstName", initialData.firstName);
        setValue("middleName", initialData.middleName ?? "");
        setValue("lastName", initialData.lastName);
        setValue("email", initialData.email);
        setValue("status", initialData.status);
        setValue("position", initialData.position);
        setValue("termStart", initialData.termStart ? new Date(initialData.termStart).toISOString().slice(0, 10) : "");
        setValue("termEnd", initialData.termEnd ? new Date(initialData.termEnd).toISOString().slice(0, 10) : "");
        
        if (initialData.officialProfile) {
          setProfilePreview(initialData.officialProfile);
          setValue("officialProfileName", initialData.officialProfile, { shouldValidate: true });
        } else {
          setProfilePreview(null);
          setValue("officialProfileName", "");
        }
        setSelectedProfile(null);
      } else {
        reset(defaultValues);
        setProfilePreview(null);
        setSelectedProfile(null);
      }
    }
  }, [isOpen, initialData, setValue, reset]);

  useEffect(() => {
    return () => {
      // Only revoke object URLs, not the external initialData URLs!
      if (profilePreview && profilePreview.startsWith("blob:")) {
        URL.revokeObjectURL(profilePreview);
      }
    };
  }, [profilePreview]);

  const mutation = useMutation({
    mutationFn: (formData: FormData) => 
      isEditMode && initialData
        ? updateOfficial(initialData.id, formData)
        : createOfficial(formData),
    onSuccess: (result) => {
      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            setError(field as keyof OfficialFormInput, {
              type: "server",
              message,
            });
          });
        } else {
          setError("root", {
            type: "server",
            message: result.message,
          });
          toast.error(result.message);
        }
        return;
      }

      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ["officials"] });
      handleClose();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "";

      if (/body.?size.?limit|payload|request entity too large|413|too large/i.test(message)) {
        setError("officialProfileName", {
          type: "server",
          message: `Official profile image size must be ${Math.floor(
            MAX_VALID_ID_IMAGE_SIZE_BYTES / (1024 * 1024)
          )}MB or less.`,
        });
        return;
      }

      const fallbackMsg = "An unexpected error occurred while saving the official.";
      setError("root", {
        type: "server",
        message: fallbackMsg,
      });
      toast.error(fallbackMsg);
    },
  });

  const onSubmit = async (data: OfficialFormInput) => {
    const submission = new FormData();

    submission.set("firstName", data.firstName);
    submission.set("middleName", data.middleName ?? "");
    submission.set("lastName", data.lastName);
    submission.set("email", data.email);
    submission.set("status", data.status);
    submission.set("position", data.position);
    submission.set("termStart", data.termStart);
    submission.set("termEnd", data.termEnd ?? "");

    // If user uploaded a new profile
    if (selectedProfile) {
      submission.set("officialProfile", selectedProfile);
      submission.set("officialProfileName", selectedProfile.name);
    } else {
      // If no new profile, but we have a preview (from initialData), pass the original name/identifier
      submission.set("officialProfileName", data.officialProfileName || "");
    }

    await mutation.mutateAsync(submission);
  };

  const handleClose = () => {
    if (profilePreview && profilePreview.startsWith("blob:")) {
      URL.revokeObjectURL(profilePreview);
    }
    setProfilePreview(null);
    setSelectedProfile(null);
    reset(defaultValues);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    onClose();
  };

  const handleProfileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateValidIdImageFile(file);

    if (validationError) {
      setSelectedProfile(null);
      // Reset back to initialData image if there was one, or clear
      const fallbackUrl = initialData?.officialProfile || "";
      setValue("officialProfileName", fallbackUrl, { shouldValidate: true });
      setError("officialProfileName", {
        type: "manual",
        message: validationError.replace("Valid ID", "Official profile image"),
      });
      return;
    }

    clearErrors("officialProfileName");
    setValue("officialProfileName", file.name, { shouldValidate: true });
    setSelectedProfile(file);

    setProfilePreview((current) => {
      if (current && current.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(file);
    });
  };

  const handleRemoveProfile = () => {
    if (profilePreview && profilePreview.startsWith("blob:")) {
      URL.revokeObjectURL(profilePreview);
    }

    setProfilePreview(null);
    setSelectedProfile(null);
    setValue("officialProfileName", "", { shouldValidate: true });
    clearErrors("officialProfileName");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 border-b border-gray-100 bg-white p-6 z-10">
          <h2 className="text-2xl font-bold text-slate-900">
            {isEditMode ? "Edit Official" : "Add New Official"}
          </h2>
          <p className="mt-1 text-slate-600">
            {isEditMode ? "Modify the official's information" : "Fill in the official information below"}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 space-y-4 p-6">
          {errors.root?.message && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errors.root.message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                First Name<RequiredMark />
              </label>
              <input
                id="firstName"
                type="text"
                placeholder="Enter first name"
                {...register("firstName")}
                className="rounded-lg border border-gray-200 px-4 py-2 focus:border-primary-500 focus:outline-none"
              />
              {errors.firstName && <p className="text-sm text-red-500">{errors.firstName.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="middleName" className="text-sm font-medium text-slate-700">
                Middle Name <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </label>
              <input
                id="middleName"
                type="text"
                placeholder="Enter middle name"
                {...register("middleName")}
                className="rounded-lg border border-gray-200 px-4 py-2 focus:border-primary-500 focus:outline-none"
              />
              {errors.middleName && <p className="text-sm text-red-500">{errors.middleName.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                Last Name<RequiredMark />
              </label>
              <input
                id="lastName"
                type="text"
                placeholder="Enter last name"
                {...register("lastName")}
                className="rounded-lg border border-gray-200 px-4 py-2 focus:border-primary-500 focus:outline-none"
              />
              {errors.lastName && <p className="text-sm text-red-500">{errors.lastName.message}</p>}
            </div>

            <div className="flex flex-col gap-2 md:col-span-3">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email<RequiredMark />
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter email address"
                disabled={isEditMode}
                {...register("email")}
                className={`rounded-lg border px-4 py-2 focus:border-primary-500 focus:outline-none ${isEditMode ? "bg-slate-50 border-gray-100 text-slate-500 cursor-not-allowed" : "border-gray-200"}`}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-2 md:col-span-3">
              <label htmlFor="officialProfile" className="text-sm font-medium text-slate-700">
                Official Profile Image
              </label>
              <input type="hidden" {...register("officialProfileName")} />
              <input
                id="officialProfile"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProfileChange}
                className="hidden"
              />
              <label
                htmlFor="officialProfile"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 px-4 py-3 transition-all hover:border-primary-500 hover:bg-primary-50"
              >
                <Upload className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">
                  {selectedProfile ? selectedProfile.name : "Click to upload a new profile image"}
                </span>
              </label>
              {errors.officialProfileName && (
                <p className="text-sm text-red-500">{errors.officialProfileName.message}</p>
              )}
            </div>

            {profilePreview && (
              <div className="flex flex-col gap-2 md:col-span-3">
                <label className="text-sm font-medium text-slate-700">Profile Preview</label>
                <div className="relative inline-block overflow-hidden rounded-lg bg-slate-50">
                  <Image
                    src={profilePreview}
                    alt="Official profile preview"
                    width={240}
                    height={240}
                    unoptimized
                    className="h-40 w-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveProfile}
                    className="absolute right-2 top-2 rounded-full bg-red-600 p-1 text-white transition-colors hover:bg-red-700"
                    title="Remove profile image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 md:col-span-3">
              <label htmlFor="status" className="text-sm font-medium text-slate-700">
                Status<RequiredMark />
              </label>
              <select
                id="status"
                {...register("status")}
                className="rounded-lg border border-gray-200 px-4 py-2 text-slate-700 focus:border-primary-500 focus:outline-none"
              >
                <option value="">Select Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
            </div>
            
            <div className="flex flex-col gap-2 md:col-span-3">
              <label htmlFor="position" className="text-sm font-medium text-slate-700">
                Position<RequiredMark />
              </label>
              <select
                id="position"
                {...register("position")}
                className="rounded-lg border border-gray-200 px-4 py-2 text-slate-700 focus:border-primary-500 focus:outline-none"
              >
                <option value="">Select Position</option>
                {positionOptions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
              {errors.position && <p className="text-sm text-red-500">{errors.position.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="termStart" className="text-sm font-medium text-slate-700">
                Term Start<RequiredMark />
              </label>
              <input
                id="termStart"
                type="date"
                {...register("termStart")}
                className="rounded-lg border border-gray-200 px-4 py-2 focus:border-primary-500 focus:outline-none"
              />
              {errors.termStart && <p className="text-sm text-red-500">{errors.termStart.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="termEnd" className="text-sm font-medium text-slate-700">
                Term End
              </label>
              <input
                id="termEnd"
                type="date"
                {...register("termEnd")}
                className="rounded-lg border border-gray-200 px-4 py-2 focus:border-primary-500 focus:outline-none"
              />
              {errors.termEnd && <p className="text-sm text-red-500">{errors.termEnd.message}</p>}
            </div>
          </div>

          <div className="sticky bottom-0 mt-auto flex gap-3 border-t border-gray-100 bg-white pt-4 pb-2 z-10">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending 
                ? (isEditMode ? "Saving..." : "Adding...") 
                : (isEditMode ? "Save Official" : "Add Official")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfficialModalForm;
