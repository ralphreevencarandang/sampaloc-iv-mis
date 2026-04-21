"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, useWatch, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X, ShieldAlert } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

import { createVawc, updateVawc, type CreateVawcResult, type VawcRecordType } from "@/server/actions/vawc.actions";
import { vawcSchema, type VawcFormInput } from "@/validations/vawc.validation";

export interface VawcModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: VawcRecordType | null;
}

function RequiredMark() {
  return <span aria-hidden="true" className="ml-1 text-red-500">*</span>;
}

const SECTION_HEADING = "text-lg font-bold text-slate-800 pb-2 border-b border-slate-200 mt-6 mb-4 flex items-center gap-2";
const CREATE_DEFAULTS: Partial<VawcFormInput> = {
  victimName: "",
  victimAge: undefined,
  victimSex: "",
  victimCivilStatus: "",
  victimAddress: "",
  victimContactNumber: "",
  isMinor: false,
  guardianName: "",
  respondentName: "",
  respondentAge: undefined,
  respondentSex: "",
  respondentAddress: "",
  respondentContactNumber: "",
  respondentOccupation: "",
  relationshipToVictim: undefined,
  abuseType: undefined,
  narrative: "",
  incidentDate: "",
  incidentLocation: "",
  status: "REPORTED",
  vawcImageName: "",
};

const FIELD_LABELS: Partial<Record<keyof VawcFormInput, string>> = {
  victimName: "Victim name",
  victimAge: "Victim age",
  victimSex: "Victim sex",
  victimCivilStatus: "Victim civil status",
  victimAddress: "Victim address",
  victimContactNumber: "Victim contact number",
  isMinor: "Victim is a minor",
  guardianName: "Guardian name",
  respondentName: "Respondent name",
  respondentAge: "Respondent age",
  respondentSex: "Respondent sex",
  respondentAddress: "Respondent address",
  respondentContactNumber: "Respondent contact number",
  respondentOccupation: "Respondent occupation",
  relationshipToVictim: "Relationship to victim",
  abuseType: "Type of abuse",
  narrative: "Narrative summary",
  incidentDate: "Incident date and time",
  incidentLocation: "Incident location",
  status: "Case status",
  vawcImageName: "Evidentiary image",
};

const fieldClasses = (hasError: boolean) =>
  `px-4 py-2 border rounded-lg focus:outline-none focus:border-primary-500 placeholder-slate-400 text-slate-700 ${
    hasError ? "border-red-400 bg-red-50" : "border-gray-200"
  }`;

const selectClasses = (hasError: boolean) =>
  `px-4 py-2 bg-white border rounded-lg focus:outline-none focus:border-primary-500 text-slate-700 ${
    hasError ? "border-red-400 bg-red-50" : "border-gray-200"
  }`;

const VawcModalForm = ({ isOpen, onClose, initialData }: VawcModalFormProps) => {
  const queryClient = useQueryClient();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isEditMode = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<VawcFormInput>({
    resolver: zodResolver(vawcSchema as never) as Resolver<VawcFormInput>,
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: CREATE_DEFAULTS,
  });

  const isMinorValue = useWatch({ control, name: "isMinor" });
  const isMinor = isMinorValue === true || String(isMinorValue) === "true";
  const fieldErrorEntries = Object.entries(errors).filter(
    ([key, error]) => key !== "root" && error?.message
  );

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setValue("victimName", initialData.victimName);
        setValue("victimAge", initialData.victimAge);
        setValue("victimSex", initialData.victimSex);
        setValue("victimCivilStatus", initialData.victimCivilStatus);
        setValue("victimAddress", initialData.victimAddress);
        setValue("victimContactNumber", initialData.victimContactNumber || "");
        setValue("isMinor", initialData.isMinor);
        setValue("guardianName", initialData.guardianName || "");

        setValue("respondentName", initialData.respondentName);
        setValue("respondentAge", initialData.respondentAge);
        setValue("respondentSex", initialData.respondentSex);
        setValue("respondentAddress", initialData.respondentAddress);
        setValue("respondentContactNumber", initialData.respondentContactNumber || "");
        setValue("respondentOccupation", initialData.respondentOccupation || "");
        setValue("relationshipToVictim", initialData.relationshipToVictim);

        setValue("abuseType", initialData.abuseType);
        setValue("narrative", initialData.narrative);
        setValue("incidentLocation", initialData.incidentLocation);
        setValue("status", initialData.status);
        
        if (initialData.incidentDate) {
          const isoDate = new Date(initialData.incidentDate).toISOString().slice(0, 16);
          setValue("incidentDate", isoDate);
        }

        if (initialData.vawcImage) {
          queueMicrotask(() => setImagePreview(initialData.vawcImage));
          setValue("vawcImageName", initialData.vawcImage);
        } else {
          queueMicrotask(() => setImagePreview(null));
          setValue("vawcImageName", "");
        }
        queueMicrotask(() => setImageFile(null));
      } else {
        reset(CREATE_DEFAULTS);
        queueMicrotask(() => setImagePreview(null));
        queueMicrotask(() => setImageFile(null));
      }
    }
  }, [isOpen, initialData, setValue, reset]);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = isEditMode && initialData
        ? await updateVawc(initialData.id, formData)
        : await createVawc(formData);

      if (!result.success) throw result;
      return result;
    },
    onSuccess: (result: CreateVawcResult) => {
      toast.success(result.message || (isEditMode ? "VAWC format updated." : "VAWC record filed."));
      queryClient.invalidateQueries({ queryKey: ["vawcs"] });
      handleClose();
    },
    onError: (error: unknown) => {
      const result = error as CreateVawcResult;
      const errorMsg = result.message || "An unexpected error occurred.";
      toast.error(errorMsg);
      setError("root", { type: "server", message: errorMsg });

      if (result.fieldErrors) {
        const fieldErrors = result.fieldErrors as Record<string, string>;

        Object.keys(fieldErrors).forEach((key) => {
          setError(key as keyof VawcFormInput, {
            type: "server",
            message: fieldErrors[key],
          });
        });
      }
    },
  });

  const onSubmit: SubmitHandler<VawcFormInput> = (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== "vawcImageName") {
         formData.append(key, value.toString());
      }
    });

    if (imageFile) {
      formData.append("vawcImage", imageFile);
      formData.append("vawcImageName", imageFile.name);
    } else {
      formData.append("vawcImageName", data.vawcImageName || "");
    }

    mutation.mutate(formData);
  };

  const handleClose = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
    reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setImageFile(file);
      setValue("vawcImageName", file.name, { shouldValidate: true });
      clearErrors("vawcImageName");
      setImagePreview((current) => {
        if (current && current.startsWith("blob:")) URL.revokeObjectURL(current);
        return URL.createObjectURL(file);
      });
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
    setValue("vawcImageName", "", { shouldValidate: true });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-xl">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100 z-10 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-500" />
              {isEditMode ? "Edit VAWC Record" : "File VAWC Case"}
            </h2>
            <p className="text-slate-600 mt-1">
              Ensure accurate documentation per RA 9262 requirements.
            </p>
          </div>
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 p-6 space-y-2">
          {errors.root?.message && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100 font-medium">
              {errors.root.message}
            </div>
          )}
          {fieldErrorEntries.length > 0 && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm mb-4 border border-red-100">
              <p className="font-semibold">Validation failed for the following fields:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {fieldErrorEntries.map(([key, error]) => (
                  <li key={key}>
                    <span className="font-medium">
                      {FIELD_LABELS[key as keyof VawcFormInput] ?? key}:
                    </span>{" "}
                    {error?.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* VICTIM DETAILS */}
          <h3 className={SECTION_HEADING}>Complainant (Victim) Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Full Name<RequiredMark /></label>
              <input type="text" {...register("victimName")} className={fieldClasses(!!errors.victimName)} />
              {errors.victimName && <span className="text-red-500 text-xs">{errors.victimName.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Age<RequiredMark /></label>
              <input type="number" inputMode="numeric" {...register("victimAge")} className={fieldClasses(!!errors.victimAge)} />
              {errors.victimAge && <span className="text-red-500 text-xs">{errors.victimAge.message}</span>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Sex<RequiredMark /></label>
              <select {...register("victimSex")} className={selectClasses(!!errors.victimSex)}>
                <option value="">Select</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
              {errors.victimSex && <span className="text-red-500 text-xs">{errors.victimSex.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Civil Status<RequiredMark /></label>
              <select {...register("victimCivilStatus")} className={selectClasses(!!errors.victimCivilStatus)}>
                <option value="">Select</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </select>
              {errors.victimCivilStatus && <span className="text-red-500 text-xs">{errors.victimCivilStatus.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Contact Number</label>
              <input type="text" {...register("victimContactNumber")} className={fieldClasses(!!errors.victimContactNumber)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Address<RequiredMark /></label>
              <input type="text" {...register("victimAddress")} className={fieldClasses(!!errors.victimAddress)} />
              {errors.victimAddress && <span className="text-red-500 text-xs">{errors.victimAddress.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5 justify-center ">
              <label className="text-sm font-medium text-slate-700">
                Is Minor?<RequiredMark />
              </label>
              <select {...register("isMinor")} className={selectClasses(!!errors.isMinor)}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
              {errors.isMinor && <span className="text-red-500 text-xs">{errors.isMinor.message}</span>}
            </div>
          </div>

          {isMinor && (
            <div className="flex flex-col gap-1.5 mt-4">
              <label className="text-sm font-medium text-slate-700">Guardian Name<RequiredMark /></label>
              <input type="text" {...register("guardianName")} className={fieldClasses(!!errors.guardianName)} />
              {errors.guardianName && <span className="text-red-500 text-xs">{errors.guardianName.message}</span>}
            </div>
          )}

          {/* RESPONDENT DETAILS */}
          <h3 className={SECTION_HEADING}>Respondent Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5 md:col-span-4">
              
              <label className="text-sm font-medium text-slate-700">Full Name<RequiredMark /></label>
              <input type="text" {...register("respondentName")} className={fieldClasses(!!errors.respondentName)} />
              {errors.respondentName && <span className="text-red-500 text-xs">{errors.respondentName.message}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 md:col-span-4 gap-4 mt-4">
              <div className="flex flex-col gap-1.5  ">
                <label className="text-sm font-medium text-slate-700">Age<RequiredMark /></label>
                <input type="number" inputMode="numeric" {...register("respondentAge")} className={fieldClasses(!!errors.respondentAge)} />
                {errors.respondentAge && <span className="text-red-500 text-xs">{errors.respondentAge.message}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Sex<RequiredMark /></label>
              <select {...register("respondentSex")} className={selectClasses(!!errors.respondentSex)}>
                  <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {errors.respondentSex && <span className="text-red-500 text-xs">{errors.respondentSex.message}</span>}
            </div>

            </div>

          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
             <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Address<RequiredMark /></label>
              <input type="text" {...register("respondentAddress")} className={fieldClasses(!!errors.respondentAddress)} />
              {errors.respondentAddress && <span className="text-red-500 text-xs">{errors.respondentAddress.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Contact Number</label>
              <input type="text" {...register("respondentContactNumber")} className={fieldClasses(!!errors.respondentContactNumber)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Relationship to Victim<RequiredMark /></label>
              <select {...register("relationshipToVictim")} className={selectClasses(!!errors.relationshipToVictim)}>
                <option value="">Select Relationship</option>
                <option value="SPOUSE">Spouse</option>
                <option value="FORMER_SPOUSE">Former Spouse</option>
                <option value="LIVE_IN">Live-In Partner</option>
                <option value="DATING">Dating / Boyfriend / Girlfriend</option>
                <option value="FORMER_DATING">Former Dating Partner</option>
                <option value="OTHER">Other Household Member</option>
              </select>
              {errors.relationshipToVictim && <span className="text-red-500 text-xs">{errors.relationshipToVictim.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Occupation</label>
              <input type="text" {...register("respondentOccupation")} className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 placeholder-slate-400 text-slate-700" />
            </div>
          </div>

          {/* INCIDENT DETAILS */}
          <h3 className={SECTION_HEADING}>Incident Log & Evidence</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Type of Abuse<RequiredMark /></label>
              <select {...register("abuseType")} className={selectClasses(!!errors.abuseType)}>
                <option value="">Select Type</option>
                <option value="PHYSICAL">Physical Violence</option>
                <option value="SEXUAL">Sexual Violence</option>
                <option value="PSYCHOLOGICAL">Psychological / Emotional</option>
                <option value="ECONOMIC">Economic Abuse</option>
              </select>
              {errors.abuseType && <span className="text-red-500 text-xs">{errors.abuseType.message}</span>}
            </div>
             <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Date & Time<RequiredMark /></label>
              <input type="datetime-local" {...register("incidentDate")} className={fieldClasses(!!errors.incidentDate)} />
              {errors.incidentDate && <span className="text-red-500 text-xs">{errors.incidentDate.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Location<RequiredMark /></label>
              <input type="text" {...register("incidentLocation")} className={fieldClasses(!!errors.incidentLocation)} />
              {errors.incidentLocation && <span className="text-red-500 text-xs">{errors.incidentLocation.message}</span>}
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 mt-4">
            <label className="text-sm font-medium text-slate-700">Narrative Summary<RequiredMark /></label>
            <textarea rows={4} {...register("narrative")} className={fieldClasses(!!errors.narrative)} />
             {errors.narrative && <span className="text-red-500 text-xs">{errors.narrative.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5 mt-4">
            <label className="text-sm font-medium text-slate-700">Evidentiary Image (Optional)</label>
            <input type="hidden" {...register("vawcImageName")} />
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 placeholder-slate-400 text-slate-700 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:bg-primary-50 file:text-primary-700"
              />
            {errors.vawcImageName && <span className="text-red-500 text-xs">{errors.vawcImageName.message}</span>}
            {imagePreview && (
              <div className="mt-3 relative inline-block overflow-hidden rounded-lg group">
                <Image src={imagePreview} alt="Evidence" width={192} height={128} className="h-32 w-48 object-cover border" unoptimized />
                 <button type="button" onClick={handleRemoveImage} className="absolute right-1.5 top-1.5 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3.5 h-3.5" />
                 </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 mt-4 md:w-1/3">
              <label className="text-sm font-medium text-slate-700">Case Status<RequiredMark /></label>
              <select {...register("status")} className={selectClasses(!!errors.status)}>
                <option value="REPORTED">Reported / Filing Phase</option>
                <option value="SUMMONED">Summoned </option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
              {errors.status && <span className="text-red-500 text-xs">{errors.status.message}</span>}
          </div>

          <div className="flex gap-3 pt-6 border-t  border-gray-200 mt-8 sticky bottom-0 bg-white">
            <button type="button" onClick={handleClose} disabled={mutation.isPending} className="flex-1 px-4 py-2.5 border rounded-lg text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 flex justify-center items-center gap-2">
              {mutation.isPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : isEditMode ? "Save Changes" : "Create Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VawcModalForm;
