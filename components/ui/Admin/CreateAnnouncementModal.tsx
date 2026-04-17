'use client'

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Upload, X } from "lucide-react";
import { MAX_VALID_ID_IMAGE_SIZE_BYTES, validateValidIdImageFile } from "@/lib/valid-id-image";
import { createAnnouncementAction } from "@/server/actions/announcement.actions";
import { type AnnouncementRecord } from "@/server/announcements/announcements";
import { type OfficialRecord } from "@/server/officials/officials";
import {
  announcementSchema,
  type AnnouncementFormInput,
} from "@/validations/announcement.validation";
import { ModalProps } from "./CreateResidentModal";

type CreateAnnouncementModalProps = ModalProps & {
  onAnnouncementCreated: (announcement: AnnouncementRecord) => void;
};

type OfficialsApiError = {
  message?: string;
};

const defaultValues: AnnouncementFormInput = {
  title: "",
  content: "",
  createdById: "",
  imageName: "",
};

async function fetchOfficials(): Promise<OfficialRecord[]> {
  const response = await fetch("/api/officials", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as OfficialsApiError | null;
    throw new Error(error?.message ?? "Failed to fetch officials.");
  }

  return (await response.json()) as OfficialRecord[];
}

const CreateAnnouncementModal = ({
  isOpen,
  onClose,
  onAnnouncementCreated,
}: CreateAnnouncementModalProps) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<AnnouncementFormInput>({
    resolver: zodResolver(announcementSchema),
    defaultValues,
  });

  const {
    data: officials = [],
    isLoading: isLoadingOfficials,
    isError: isOfficialsError,
    error: officialsError,
  } = useQuery<OfficialRecord[]>({
    queryKey: ["officials"],
    queryFn: fetchOfficials,
    enabled: isOpen,
  });

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const createAnnouncementMutation = useMutation({
    mutationFn: createAnnouncementAction,
    onSuccess: (result) => {
      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            setError(field as keyof AnnouncementFormInput, {
              type: "server",
              message,
            });
          });
        } else {
          setError("root", {
            type: "server",
            message: result.message,
          });
        }
        return;
      }

      if (result.announcement) {
        onAnnouncementCreated(result.announcement);
      }

      handleClose();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "";

      if (/body.?size.?limit|payload|request entity too large|413|too large/i.test(message)) {
        setError("imageName", {
          type: "server",
          message: `Announcement image size must be ${Math.floor(
            MAX_VALID_ID_IMAGE_SIZE_BYTES / (1024 * 1024)
          )}MB or less.`,
        });
        return;
      }

      setError("root", {
        type: "server",
        message: "An unexpected error occurred while creating the announcement.",
      });
    },
  });

  const handleClose = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview(null);
    setSelectedImage(null);
    reset(defaultValues);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    onClose();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateValidIdImageFile(file);

    if (validationError) {
      setSelectedImage(null);
      setValue("imageName", "", { shouldValidate: true });
      setError("imageName", {
        type: "manual",
        message: validationError.replace("Valid ID", "Announcement image"),
      });
      return;
    }

    clearErrors("imageName");
    setValue("imageName", file.name, { shouldValidate: true });
    setSelectedImage(file);

    setImagePreview((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return URL.createObjectURL(file);
    });
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview(null);
    setSelectedImage(null);
    setValue("imageName", "", { shouldValidate: true });
    clearErrors("imageName");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: AnnouncementFormInput) => {
    const submission = new FormData();
    submission.set("title", data.title);
    submission.set("content", data.content);
    submission.set("createdById", data.createdById);

    if (selectedImage) {
      submission.set("image", selectedImage);
    }

    await createAnnouncementMutation.mutateAsync(submission);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 border-b border-gray-100 bg-white p-6">
          <h2 className="text-2xl font-bold text-slate-900">Add New Announcement</h2>
          <p className="mt-1 text-slate-600">Create a new barangay announcement</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 space-y-4 p-6">
          {errors.root?.message && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errors.root.message}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="createdById" className="text-sm font-medium text-slate-700">
              Created By
            </label>
            <select
              id="createdById"
              {...register("createdById")}
              disabled={isLoadingOfficials || isOfficialsError}
              className="rounded-lg border border-gray-200 px-4 py-2 text-slate-700 focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                {isLoadingOfficials ? "Loading officials..." : "Select Official"}
              </option>
              {officials.map((official) => (
                <option key={official.id} value={official.id}>
                  {official.name} - {official.position}
                </option>
              ))}
            </select>
            {errors.createdById && (
              <p className="text-sm text-red-500">{errors.createdById.message}</p>
            )}
            {isOfficialsError && (
              <p className="text-sm text-red-500">
                {officialsError instanceof Error
                  ? officialsError.message
                  : "Failed to load officials."}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="title" className="text-sm font-medium text-slate-700">
              Announcement Title
            </label>
            <input
              id="title"
              type="text"
              placeholder="Enter announcement title"
              {...register("title")}
              className="rounded-lg border border-gray-200 px-4 py-2 focus:border-primary-500 focus:outline-none"
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="content" className="text-sm font-medium text-slate-700">
              Content
            </label>
            <textarea
              id="content"
              rows={5}
              placeholder="Enter announcement content"
              {...register("content")}
              className="resize-none rounded-lg border border-gray-200 px-4 py-2 focus:border-primary-500 focus:outline-none"
            />
            {errors.content && <p className="text-sm text-red-500">{errors.content.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="image" className="text-sm font-medium text-slate-700">
              Upload Image (Optional)
            </label>
            <input type="hidden" {...register("imageName")} />
            <div className="relative">
              <input
                id="image"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
              <label
                htmlFor="image"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 px-4 py-3 transition-all hover:border-primary-500 hover:bg-primary-50"
              >
                <Upload className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">
                  {selectedImage ? selectedImage.name : "Click to upload image"}
                </span>
              </label>
            </div>
            {errors.imageName && <p className="text-sm text-red-500">{errors.imageName.message}</p>}
          </div>

          {imagePreview && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Image Preview</label>
              <div className="relative inline-block overflow-hidden rounded-lg bg-slate-50">
                <Image
                  src={imagePreview}
                  alt="Announcement preview"
                  width={640}
                  height={360}
                  unoptimized
                  className="max-h-48 w-auto"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute right-2 top-2 rounded-full bg-red-600 p-1 text-white transition-colors hover:bg-red-700"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="sticky bottom-0 mt-auto flex gap-3 border-t border-gray-100 bg-white pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAnnouncementMutation.isPending}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createAnnouncementMutation.isPending ? "Posting..." : "Post Announcement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAnnouncementModal;
