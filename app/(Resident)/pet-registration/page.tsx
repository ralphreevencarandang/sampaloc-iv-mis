"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, CalendarDays, Loader2, MapPin, PawPrint, Send, ShieldCheck, User } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useResidentAuth } from "@/components/providers/resident-auth-provider";
import apiClient from "@/lib/axios";
import { createResidentPet, type PetMutationResult } from "@/server/actions/pet.action";
import { residentPetSchema, type ResidentPetFormInput } from "@/validations/pet.validation";
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

type ResidentPetRecord = {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  color: string | null;
  vaccinationDate: string | null;
  createdAt: string;
};

function fullName(profile: Pick<ResidentProfile, "firstName" | "middleName" | "lastName">) {
  return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
          <PawPrint className="h-6 w-6" />
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

async function fetchResidentPets(residentId: string) {
  const { data } = await apiClient.get<ResidentPetRecord[]>(`/residents/${residentId}/pets`);
  return data;
}

export default function ResidentPetRegistrationPage() {
  const { resident } = useResidentAuth();
  const queryClient = useQueryClient();
  const residentId = resident?.id;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ResidentPetFormInput>({
    resolver: zodResolver(residentPetSchema),
    defaultValues: {
      ownerName: "",
      name: "",
      type: "",
      breed: "",
      color: "",
      vaccinationDate: "",
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

  const petsQuery = useQuery({
    queryKey: ["resident-pets", residentId],
    queryFn: async () => {
      if (!residentId) {
        throw new Error("Resident session is missing.");
      }

      return fetchResidentPets(residentId);
    },
    enabled: Boolean(residentId),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setValue("ownerName", fullName(profileQuery.data));
    }
  }, [profileQuery.data, setValue]);

  const registrationMutation = useMutation({
    mutationFn: async (data: ResidentPetFormInput) => {
      const submission = new FormData();
      submission.set("name", data.name);
      submission.set("type", data.type);
      if (data.breed) submission.set("breed", data.breed);
      if (data.color) submission.set("color", data.color);
      if (data.vaccinationDate) submission.set("vaccinationDate", data.vaccinationDate);

      const result = await createResidentPet(submission);
      if (!result.success) {
        throw result;
      }
      return result;
    },
    onSuccess: (result: PetMutationResult) => {
      toast.success(result.message || "Pet registered successfully.");

      reset({
        ownerName: profileQuery.data ? fullName(profileQuery.data) : "",
        name: "",
        type: "",
        breed: "",
        color: "",
        vaccinationDate: "",
      });

      void queryClient.invalidateQueries({ queryKey: ["resident-pets", residentId] });
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
         toast.error(error.message);
         setError("root", { type: "server", message: error.message });
         return;
      }

      const result = error as PetMutationResult;
      const errorMsg = result.message || "An unexpected error occurred while registering the pet.";
      toast.error(errorMsg);

      setError("root", {
        type: "server",
        message: errorMsg,
      });

      if (result.fieldErrors) {
        Object.keys(result.fieldErrors).forEach((key) => {
          setError(key as keyof ResidentPetFormInput, {
            type: "server",
            message: result.fieldErrors![key],
          });
        });
      }
    },
  });

  const onSubmit = async (data: ResidentPetFormInput) => {
    await registrationMutation.mutateAsync(data);
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
            description="We could not load your resident information for pet registration."
          />
        </div>
      </div>
    );
  }

  const profile = profileQuery.data;
  const ownerName = fullName(profile);

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
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Pet Registration</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Register your pet with the barangay. Your resident information is attached automatically to this registration.
          </p>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Owner Information</h2>
              <p className="text-sm text-slate-600">These details are read-only and come from your account.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoTile label="Resident Name" value={ownerName} icon={User} />
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
              <PawPrint className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Pet Details</h2>
              <p className="text-sm text-slate-600">Provide your pet's details below.</p>
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
                <label htmlFor="ownerName" className="text-sm font-medium text-slate-700">
                  Owner Name
                </label>
                <input
                  id="ownerName"
                  readOnly
                  {...register("ownerName")}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Pet Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter pet name"
                  {...register("name")}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                />
                {errors.name && (
                  <p className="text-xs text-rose-500">{errors.name.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="type" className="text-sm font-medium text-slate-700">
                  Pet Type <span className="text-rose-500">*</span>
                </label>
                <input
                  id="type"
                  type="text"
                  placeholder="e.g. Dog, Cat, Bird"
                  {...register("type")}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                />
                {errors.type && <p className="text-xs text-rose-500">{errors.type.message}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="breed" className="text-sm font-medium text-slate-700">
                  Breed (Optional)
                </label>
                <input
                  id="breed"
                  type="text"
                  placeholder="e.g. Beagle, Persian"
                  {...register("breed")}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                />
                {errors.breed && <p className="text-xs text-rose-500">{errors.breed.message}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="color" className="text-sm font-medium text-slate-700">
                  Color (Optional)
                </label>
                <input
                  id="color"
                  type="text"
                  placeholder="e.g. Brown, White"
                  {...register("color")}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                />
                {errors.color && <p className="text-xs text-rose-500">{errors.color.message}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="vaccinationDate" className="text-sm font-medium text-slate-700">
                  Vaccination Date (Optional)
                </label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="vaccinationDate"
                    type="date"
                    {...register("vaccinationDate")}
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                  />
                </div>
                {errors.vaccinationDate && <p className="text-xs text-rose-500">{errors.vaccinationDate.message}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
              <button
                type="submit"
                disabled={registrationMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {registrationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Register Pet
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <PawPrint className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Your Registered Pets</h2>
              <p className="text-sm text-slate-600">Registered pet records tied to your resident account.</p>
            </div>
          </div>

          <div className="mt-5">
            {petsQuery.isLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
                Loading pet records...
              </div>
            ) : petsQuery.isError ? (
              <QueryErrorState
                message={
                  petsQuery.error instanceof Error
                    ? petsQuery.error.message
                    : "Failed to load pet records."
                }
                onRetry={() => {
                  void petsQuery.refetch();
                }}
              />
            ) : petsQuery.data && petsQuery.data.length > 0 ? (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <th className="px-4 py-4 sm:px-5">Pet Name</th>
                        <th className="px-4 py-4 sm:px-5">Type</th>
                        <th className="px-4 py-4 sm:px-5">Breed</th>
                        <th className="px-4 py-4 sm:px-5">Color</th>
                        <th className="px-4 py-4 sm:px-5">Vaccination Date</th>
                        <th className="px-4 py-4 sm:px-5">Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {petsQuery.data.map((record) => (
                        <tr key={record.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-4 text-sm font-medium text-slate-900 sm:px-5">{record.name}</td>
                          <td className="px-4 py-4 text-sm text-slate-600 sm:px-5">{record.type}</td>
                          <td className="px-4 py-4 text-sm text-slate-600 sm:px-5">{record.breed || "-"}</td>
                          <td className="px-4 py-4 text-sm text-slate-600 sm:px-5">{record.color || "-"}</td>
                          <td className="px-4 py-4 text-sm text-slate-600 sm:px-5">
                            {record.vaccinationDate ? formatDate(record.vaccinationDate) : "None"}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 sm:px-5">{formatDateTime(record.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No pets registered yet"
                description="Your registered pet records will appear here after your first registration."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}