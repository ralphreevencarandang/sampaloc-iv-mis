"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  FileText,
  Home,
  Mail,
  MapPin,
  PawPrint,
  Phone,
  ShieldCheck,
  SquareUser,
  Users,
  User,
  WalletCards,
} from "lucide-react";
import { useResidentAuth } from "@/components/providers/resident-auth-provider";
import apiClient from "@/lib/axios";

type ResidentStatus = "PENDING" | "APPROVED" | "DECLINED";
type RequestStatus = "PENDING" | "APPROVED" | "RELEASED";
type BlotterStatus = "OPEN" | "RESOLVED";

type ResidentProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: string;
  gender: string;
  civilStatus: string;
  street: string;
  houseNumber: string;
  contactNumber: string | null;
  occupation: string | null;
  citizenship: string;
  isVoter: boolean;
  precinctNumber: string | null;
  isArchived: boolean;
  validIDImage: string | null;
  status: ResidentStatus;
  createdAt: string;
};

type DocumentRequestRecord = {
  id: string;
  type: string;
  purpose: string;
  status: RequestStatus;
  requestedAt: string;
  releasedAt: string | null;
  approvedByName: string | null;
};

type BlotterRecord = {
  id: string;
  incident: string;
  location: string;
  respondentName: string;
  status: BlotterStatus;
  date: string;
  createdAt: string;
};

type PetRecord = {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  color: string | null;
  vaccinationDate: string | null;
  createdAt: string;
};

type TabKey = "documents" | "blotter" | "pets";

const tabConfig: Array<{
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "documents", label: "Documents", icon: FileText },
  { key: "blotter", label: "Blotter", icon: WalletCards },
  { key: "pets", label: "Pets", icon: PawPrint },
];

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not provided";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not provided";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAge(birthDate: string) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
}

function fullName(profile: Pick<ResidentProfile, "firstName" | "middleName" | "lastName">) {
  return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ");
}

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "emerald" | "amber" | "rose" | "primary";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "rose"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : tone === "primary"
            ? "border-primary-200 bg-primary-50 text-primary-700"
            : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}

function InfoTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
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
    <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function TableShell({
  columns,
  children,
}: {
  columns: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              {columns.split("|").map((column) => (
                <th key={column} className="px-5 py-4">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

async function fetchResidentProfile(residentId: string) {
  const { data } = await apiClient.get<ResidentProfile>(`/residents/${residentId}`);
  return data;
}

async function fetchResidentDocuments(residentId: string) {
  const { data } = await apiClient.get<DocumentRequestRecord[]>(`/residents/${residentId}/documents`);
  return data;
}

async function fetchResidentBlotters(residentId: string) {
  const { data } = await apiClient.get<BlotterRecord[]>(`/residents/${residentId}/blotters`);
  return data;
}

async function fetchResidentPets(residentId: string) {
  const { data } = await apiClient.get<PetRecord[]>(`/residents/${residentId}/pets`);
  return data;
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

function ResidentSummary({
  resident,
}: {
  resident: ResidentProfile;
}) {
  const displayName = fullName(resident);

  return (
    <aside className="space-y-6 lg:sticky lg:top-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-sky-600 px-6 py-8 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold backdrop-blur">
              {resident.firstName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/75">Resident Profile</p>
              <h1 className="mt-1 text-2xl font-bold">{displayName}</h1>
              <p className="mt-1 text-sm text-white/85">{resident.email}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="flex flex-wrap gap-2">
            <Badge tone="primary">
              <SquareUser className="h-3.5 w-3.5" />
              Resident ID
            </Badge>
            <Badge tone={resident.status === "APPROVED" ? "emerald" : resident.status === "DECLINED" ? "rose" : "amber"}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {resident.status}
            </Badge>
            <Badge tone={resident.isVoter ? "emerald" : "slate"}>
              <Users className="h-3.5 w-3.5" />
              {resident.isVoter ? "Registered voter" : "Non-voter"}
            </Badge>
          </div>

          <div className="grid gap-3 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Age</span>
              <span className="font-semibold text-slate-900">{formatAge(resident.birthDate)} years old</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Registered</span>
              <span className="font-semibold text-slate-900">{formatDate(resident.createdAt)}</span>
            </div>
           
          </div>
        </div>
      </section>

      <SectionCard title="Contact" icon={Mail}>
        <div className="grid gap-3">
          <InfoTile label="Email address" value={resident.email} icon={Mail} />
          <InfoTile
            label="Contact number"
            value={resident.contactNumber ?? "Not provided"}
            icon={Phone}
          />
        </div>
      </SectionCard>

      <SectionCard title="Address" icon={MapPin}>
        <div className="grid gap-3">
          <InfoTile label="House number" value={resident.houseNumber} icon={Home} />
          <InfoTile label="Street" value={resident.street} icon={MapPin} />
          <InfoTile
            label="Complete address"
            value={`${resident.houseNumber}, ${resident.street}`}
            icon={MapPin}
          />
        </div>
      </SectionCard>

      <SectionCard title="Voting Details" icon={ShieldCheck}>
        <div className="grid gap-3">
          <InfoTile label="Eligible to vote" value={resident.isVoter ? "Yes" : "No"} icon={ShieldCheck} />
          <InfoTile
            label="Precinct number"
            value={resident.precinctNumber ?? "Not provided"}
            icon={CalendarDays}
          />
        </div>
      </SectionCard>

      <SectionCard title="Valid ID" icon={WalletCards}>
        {resident.validIDImage ? (
          <a
            href={resident.validIDImage}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
          >
            <Image
              src={resident.validIDImage}
              alt={`Valid ID of ${displayName}`}
              width={1200}
              height={800}
              className="h-56 w-full object-cover"
            />
          </a>
        ) : (
          <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center">
            <div>
              <WalletCards className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">No valid ID uploaded</p>
            </div>
          </div>
        )}
      </SectionCard>
    </aside>
  );
}

function ResidentProfileContent({
  resident,
}: {
  resident: ResidentProfile;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <InfoTile label="Resident ID" value={resident.id} icon={SquareUser} />
      <InfoTile label="First name" value={resident.firstName} icon={User} />
      <InfoTile label="Middle name" value={resident.middleName ?? "Not provided"} icon={User} />
      <InfoTile label="Last name" value={resident.lastName} icon={User} />
      <InfoTile label="Date of birth" value={formatDate(resident.birthDate)} icon={CalendarDays} />
      <InfoTile label="Age" value={`${formatAge(resident.birthDate)} years old`} icon={CalendarDays} />
      <InfoTile label="Gender" value={resident.gender} icon={User} />
      <InfoTile label="Civil status" value={resident.civilStatus} icon={Users} />
      <InfoTile label="Citizenship" value={resident.citizenship} icon={ShieldCheck} />
      <InfoTile label="Occupation" value={resident.occupation ?? "Not provided"} icon={WalletCards} />
      <InfoTile label="Account status" value={resident.status} icon={ShieldCheck} />
      <InfoTile label="Registered on" value={formatDate(resident.createdAt)} icon={CalendarDays} />
    </div>
  );
}

export default function MyAccountPage() {
  const { resident } = useResidentAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("documents");

  const residentId = resident?.id;

  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
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

  const documentsQuery = useQuery({
    queryKey: ["resident-documents", residentId],
    queryFn: async () => {
      if (!residentId) {
        throw new Error("Resident session is missing.");
      }

      return fetchResidentDocuments(residentId);
    },
    enabled: Boolean(residentId && activeTab === "documents"),
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
    enabled: Boolean(residentId && activeTab === "blotter"),
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
    enabled: Boolean(residentId && activeTab === "pets"),
    staleTime: 5 * 60 * 1000,
  });

  if (!residentId) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900">
        Resident session is missing. Please sign in again.
      </div>
    );
  }

  if (isProfileLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-44 animate-pulse rounded-full bg-slate-200" />
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="h-[860px] animate-pulse rounded-[32px] border border-slate-200 bg-white" />
          <div className="space-y-6">
            <div className="h-[360px] animate-pulse rounded-[32px] border border-slate-200 bg-white" />
            <div className="h-[420px] animate-pulse rounded-[32px] border border-slate-200 bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (isProfileError) {
    return (
      <QueryErrorState
        message={profileError instanceof Error ? profileError.message : "Failed to load resident profile."}
        onRetry={() => {
          void refetchProfile();
        }}
      />
    );
  }

  if (!profile) {
    return (
      <EmptyState
        title="Resident profile unavailable"
        description="The resident profile could not be loaded from the server."
      />
    );
  }

  const displayName = fullName(profile);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <Home className="h-4 w-4" />
          Back to home
        </Link>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600">
            My Account
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{displayName}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Read-only resident profile with your barangay transaction history.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <ResidentSummary resident={profile} />

        <div className="space-y-6">
          <SectionCard title="Personal Details" icon={User}>
            <ResidentProfileContent resident={profile} />
          </SectionCard>

          <SectionCard title="Transactions" icon={FileText}>
            <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              {tabConfig.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.key;
                const count =
                  tab.key === "documents"
                    ? documentsQuery.data?.length
                    : tab.key === "blotter"
                      ? blottersQuery.data?.length
                      : petsQuery.data?.length;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-white text-primary-700 shadow-sm"
                        : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                    }`}
                  >
                    <TabIcon className="h-4 w-4" />
                    {tab.label}
                    {typeof count === "number" ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              {activeTab === "documents" ? (
                documentsQuery.isLoading ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
                    Loading documents...
                  </div>
                ) : documentsQuery.isError ? (
                  <QueryErrorState
                    message={
                      documentsQuery.error instanceof Error
                        ? documentsQuery.error.message
                        : "Failed to load document requests."
                    }
                    onRetry={() => {
                      void documentsQuery.refetch();
                    }}
                  />
                ) : documentsQuery.data && documentsQuery.data.length > 0 ? (
                  <TableShell columns="Document Type|Purpose|Status|Requested|Released|Approved By">
                    {documentsQuery.data.map((record) => (
                      <tr key={record.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-5 py-4 text-sm font-medium text-slate-900">{record.type}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{record.purpose}</td>
                        <td className="px-5 py-4 text-sm">
                          <Badge tone={record.status === "APPROVED" || record.status === "RELEASED" ? "emerald" : "amber"}>
                            {record.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{formatDateTime(record.requestedAt)}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{formatDateTime(record.releasedAt)}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{record.approvedByName ?? "Pending"}</td>
                      </tr>
                    ))}
                  </TableShell>
                ) : (
                  <EmptyState
                    title="No document requests yet"
                    description="Your document request history will appear here once you submit a request."
                  />
                )
              ) : activeTab === "blotter" ? (
                blottersQuery.isLoading ? (
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
                  <TableShell columns="Incident|Location|Respondent|Status|Date Filed">
                    {blottersQuery.data.map((record) => (
                      <tr key={record.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-5 py-4 text-sm font-medium text-slate-900">{record.incident}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{record.location}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{record.respondentName}</td>
                        <td className="px-5 py-4 text-sm">
                          <Badge tone={record.status === "RESOLVED" ? "emerald" : "amber"}>
                            {record.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{formatDateTime(record.date)}</td>
                      </tr>
                    ))}
                  </TableShell>
                ) : (
                  <EmptyState
                    title="No blotter records yet"
                    description="Filed blotter records will appear here once they are created."
                  />
                )
              ) : petsQuery.isLoading ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
                  Loading pet registrations...
                </div>
              ) : petsQuery.isError ? (
                <QueryErrorState
                  message={
                    petsQuery.error instanceof Error
                      ? petsQuery.error.message
                      : "Failed to load pet registrations."
                  }
                  onRetry={() => {
                    void petsQuery.refetch();
                  }}
                />
              ) : petsQuery.data && petsQuery.data.length > 0 ? (
                <TableShell columns="Pet Name|Type|Breed|Color|Vaccinated">
                  {petsQuery.data.map((record) => (
                    <tr key={record.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-5 py-4 text-sm font-medium text-slate-900">{record.name}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{record.type}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{record.breed ?? "Not provided"}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{record.color ?? "Not provided"}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{formatDate(record.vaccinationDate)}</td>
                    </tr>
                  ))}
                </TableShell>
              ) : (
                <EmptyState
                  title="No pet registrations yet"
                  description="Your registered pets will appear here once they are saved in the system."
                />
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
