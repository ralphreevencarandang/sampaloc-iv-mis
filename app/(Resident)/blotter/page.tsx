"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, CalendarDays, FileImage, Loader2, MapPin, Scale, Send, ShieldCheck, User } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useResidentAuth } from "@/components/providers/resident-auth-provider";
import apiClient from "@/lib/axios";
import { createResidentBlotter, type BlotterRecord, type CreateBlotterResult } from "@/server/actions/blotter.actions";
import { residentBlotterSchema, type ResidentBlotterFormInput } from "@/validations/blotter.validation";
import Link from "next/link";

type ResidentProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  contactNumber: string | null;
  street: string;
  houseNumber: string;
  status: string;
};

function fullName(profile: Pick<ResidentProfile, "firstName" | "middleName" | "lastName">) {
  return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function QueryErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-rose-900">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Unable to load data</p>
          <p className="mt-1 text-sm text-rose-800">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
          <Scale className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

async function fetchResidentProfile(residentId: string) {
  const { data } = await apiClient.get<ResidentProfile>(`/residents/${residentId}`);
  return data;
}

async function fetchResidentBlotters(residentId: string) {
  const { data } = await apiClient.get<BlotterRecord[]>(`/residents/${residentId}/blotters`);
  return data;
}

export default function ResidentBlotterPage() {
  const { resident } = useResidentAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const residentId = resident?.id;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ResidentBlotterFormInput>({
    resolver: zodResolver(residentBlotterSchema),
    defaultValues: {
      complainantId: "",
      complainantName: "",
      respondentName: "",
      incident: "",
      location: "",
      date: "",
      blotterImageName: "",
    },
  });

  const profileQuery = useQuery({
    queryKey: ["resident-profile", residentId],
    queryFn: async () => {
      if (!residentId) {
        throw new Error("Resident session is missing.");
      }

      return fetchResidentProfile(residentId);
    },
    enabled: Boolean(residentId),
    staleTime: 5 * 60 * 1000,
  });

  const blottersQuery = useQuery({
    queryKey: ["resident-blotters", residentId],
    queryFn: async () => {
      if (!residentId) {
        throw new Error("Resident session is missing.");
      }

      return fetchResidentBlotters(residentId);
    },
    enabled: Boolean(residentId),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setValue("complainantName", fullName(profileQuery.data));
      setValue("complainantId", profileQuery.data.id);
    }
  }, [profileQuery.data, setValue]);

  const filingMutation = useMutation({
    mutationFn: async (data: ResidentBlotterFormInput) => {
      const submission = new FormData();
      submission.set("respondentName", data.respondentName);
      submission.set("location", data.location);
      submission.set("date", data.date);
      submission.set("incident", data.incident);

      const file = fileInputRef.current?.files?.[0];
      if (file) {
        submission.set("blotterImage", file);
        submission.set("blotterImageName", file.name);
      }

      const result = await createResidentBlotter(submission);
      if (!result.success) {
        throw result;
      }
      return result;
    },
    onSuccess: (result: CreateBlotterResult) => {
      toast.success(result.message || "Blotter filed successfully.");

      reset({
        complainantId: profileQuery.data?.id || "",
        complainantName: profileQuery.data ? fullName(profileQuery.data) : "",
        respondentName: "",
        incident: "",
        location: "",
        date: "",
        blotterImageName: "",
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      void queryClient.invalidateQueries({ queryKey: ["resident-blotters", residentId] });
      void queryClient.invalidateQueries({ queryKey: ["resident-profile", residentId] });
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
         toast.error(error.message);
         setError("root", { type: "server", message: error.message });
         return;
      }

      const result = error as CreateBlotterResult;
      const errorMsg = result.message || "An unexpected error occurred while filing the blotter.";
      toast.error(errorMsg);

      setError("root", {
        type: "server",
        message: errorMsg,
      });

      if (result.fieldErrors) {
        Object.keys(result.fieldErrors).forEach((key) => {
          setError(key as keyof ResidentBlotterFormInput, {
            type: "server",
            message: result.fieldErrors![key],
          });
        });
      }
    },
  });

  const onSubmit = async (data: ResidentBlotterFormInput) => {
    await filingMutation.mutateAsync(data);
  };

  if (!residentId) {
    return (
      <div className="max-container padding-x py-6 sm:py-8 lg:py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900">
          Resident session is missing. Please sign in again.
        </div>
      </div>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <div className="max-container padding-x py-6 sm:py-8 lg:py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-8 w-56 animate-pulse rounded-full bg-slate-200" />
          <div className="h-[320px] animate-pulse rounded-[32px] border border-slate-200 bg-white" />
          <div className="h-[280px] animate-pulse rounded-[32px] border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="max-container padding-x py-6 sm:py-8 lg:py-10">
        <div className="mx-auto max-w-5xl">
          <QueryErrorState
            message={
              profileQuery.error instanceof Error
                ? profileQuery.error.message
                : "Failed to load resident profile."
            }
            onRetry={() => {
              void profileQuery.refetch();
            }}
          />
        </div>
      </div>
    );
  }

  if (!profileQuery.data) {
    return (
      <div className="max-container padding-x py-6 sm:py-8 lg:py-10">
        <div className="mx-auto max-w-5xl">
          <EmptyState
            title="Resident profile unavailable"
            description="We could not load your resident information for blotter filing."
          />
        </div>
      </div>
    );
  }

  const profile = profileQuery.data;
  const complainantName = fullName(profile);

  return (
    <div className="max-container w-full padding-x py-6 sm:py-8 lg:py-10">
      <div className=" space-y-6 sm:space-y-7 lg:space-y-8">
        <div className="max-w-3xl space-y-3">
            
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="  h-5 w-5 " />
              <p className="">Back to home</p>
            </Link>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600">
            Resident Services
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">File a Blotter</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Submit a barangay blotter report using your approved resident account. Your resident
            information is attached automatically to this filing.
          </p>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Complainant Information</h2>
              <p className="text-sm text-slate-600">These details are read-only and come from your account.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoTile label="Resident Name" value={complainantName} icon={User} />
            <InfoTile label="Resident ID" value={profile.id} icon={ShieldCheck} />
            <InfoTile label="Contact Number" value={profile.contactNumber ?? "Not provided"} icon={User} />
            <InfoTile
              label="Address"
              value={`${profile.houseNumber}, ${profile.street}`}
              icon={MapPin}
            />
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Blotter Details</h2>
              <p className="text-sm text-slate-600">Provide the incident details below.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
            {errors.root?.message && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errors.root.message}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="complainantName" className="text-sm font-medium text-slate-700">
                  Complainant Name
                </label>
                <input
                  id="complainantName"
                  readOnly
                  {...register("complainantName")}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="status" className="text-sm font-medium text-slate-700">
                  Initial Status
                </label>
                <input
                  id="status"
                  value="OPEN"
                  readOnly
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="respondentName" className="text-sm font-medium text-slate-700">
                  Respondent Name
                </label>
                <input
                  id="respondentName"
                  type="text"
                  placeholder="Enter respondent name"
                  {...register("respondentName")}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                />
                {errors.respondentName && (
                  <p className="text-xs text-rose-500">{errors.respondentName.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="location" className="text-sm font-medium text-slate-700">
                  Incident Location
                </label>
                <input
                  id="location"
                  type="text"
                  placeholder="Enter incident location"
                  {...register("location")}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                />
                {errors.location && <p className="text-xs text-rose-500">{errors.location.message}</p>}
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label htmlFor="date" className="text-sm font-medium text-slate-700">
                  Date and Time of Incident
                </label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="date"
                    type="datetime-local"
                    {...register("date")}
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                  />
                </div>
                {errors.date && <p className="text-xs text-rose-500">{errors.date.message}</p>}
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label htmlFor="incident" className="text-sm font-medium text-slate-700">
                  Incident Description
                </label>
                <textarea
                  id="incident"
                  rows={6}
                  placeholder="Describe what happened in as much detail as possible."
                  {...register("incident")}
                  className="resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                />
                {errors.incident && <p className="text-xs text-rose-500">{errors.incident.message}</p>}
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label htmlFor="blotterImage" className="text-sm font-medium text-slate-700">
                  Evidence Image (Optional)
                </label>
                <div className="relative">
                  <FileImage className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="blotterImage"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700"
                  />
                </div>
                {errors.blotterImageName && (
                  <p className="text-xs text-rose-500">{errors.blotterImageName.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
              <button
                type="submit"
                disabled={filingMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {filingMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Blotter
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Your Recent Filings</h2>
              <p className="text-sm text-slate-600">Submitted blotter records tied to your resident account.</p>
            </div>
          </div>

          <div className="mt-5">
            {blottersQuery.isLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
                Loading blotter records...
              </div>
            ) : blottersQuery.isError ? (
              <QueryErrorState
                message={
                  blottersQuery.error instanceof Error
                    ? blottersQuery.error.message
                    : "Failed to load blotter records."
                }
                onRetry={() => {
                  void blottersQuery.refetch();
                }}
              />
            ) : blottersQuery.data && blottersQuery.data.length > 0 ? (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <th className="px-4 py-4 sm:px-5">Incident</th>
                        <th className="px-4 py-4 sm:px-5">Respondent</th>
                        <th className="px-4 py-4 sm:px-5">Location</th>
                        <th className="px-4 py-4 sm:px-5">Status</th>
                        <th className="px-4 py-4 sm:px-5">Filed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blottersQuery.data.map((record) => (
                        <tr key={record.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-4 text-sm font-medium text-slate-900 sm:px-5">{record.incident}</td>
                          <td className="px-4 py-4 text-sm text-slate-600 sm:px-5">{record.respondentName}</td>
                          <td className="px-4 py-4 text-sm text-slate-600 sm:px-5">{record.location}</td>
                          <td className="px-4 py-4 text-sm sm:px-5">
                            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 sm:px-5">{formatDateTime(record.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No blotter filings yet"
                description="Your submitted blotter records will appear here after your first filing."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
