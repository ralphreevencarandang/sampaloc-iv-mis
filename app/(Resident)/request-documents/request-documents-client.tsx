"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
  User,
} from "lucide-react";
import {
  createDocumentRequestFormData,
  type DocumentDetailLine,
  type DocumentRequestDraftInput,
  type ResidentDocumentRequestRecord,
} from "@/lib/document-request-utils";
import { documentTypeCatalog, type DocumentTypeDefinition } from "@/lib/document-request-catalog";
import { fetchResidentDocumentRequests } from "@/lib/document-requests-api";
import {
  createResidentDocumentRequestAction,
} from "@/server/actions/document.actions";

export type RequestResidentProfile = {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  birthDate: string;
  civilStatus: string;
  citizenship: string;
  houseNumber: string;
  street: string;
  contactNumber: string | null;
  precinctNumber: string | null;
};

type EditableFieldKey =
  | "purpose"
  | "yearsOfResidency"
  | "placeOfBirth"
  | "emergencyContactPerson"
  | "emergencyContactAddress"
  | "emergencyContactNumber";

type FormValues = Record<EditableFieldKey, string>;
type FormErrors = Partial<Record<EditableFieldKey | "submit", string>>;

type SubmittedRequest = {
  id: string;
  documentType: string;
  submittedAt: string;
  amount: string;
  summary: DocumentDetailLine[];
  status: string;
};

const initialFormValues: FormValues = {
  purpose: "",
  yearsOfResidency: "",
  placeOfBirth: "",
  emergencyContactPerson: "",
  emergencyContactAddress: "",
  emergencyContactNumber: "",
};

const profileFieldMap: Record<
  DocumentTypeDefinition["id"],
  Array<{ key: string; label: string; getValue: (profile: RequestResidentProfile) => string }>
> = {
  clearance: [
    { key: "name", label: "Name", getValue: getFullName },
    { key: "citizenship", label: "Citizenship", getValue: (profile) => profile.citizenship },
    { key: "address", label: "Address", getValue: getFullAddress },
    { key: "age", label: "Age", getValue: (profile) => `${getAge(profile.birthDate)}` },
    { key: "civilStatus", label: "Civil Status", getValue: (profile) => profile.civilStatus },
  ],
  indigency: [
    { key: "name", label: "Name", getValue: getFullName },
    { key: "citizenship", label: "Citizenship", getValue: (profile) => profile.citizenship },
    { key: "address", label: "Address", getValue: getFullAddress },
    { key: "age", label: "Age", getValue: (profile) => `${getAge(profile.birthDate)}` },
    { key: "civilStatus", label: "Civil Status", getValue: (profile) => profile.civilStatus },
  ],
  residency: [
    { key: "name", label: "Name", getValue: getFullName },
    { key: "citizenship", label: "Citizenship", getValue: (profile) => profile.citizenship },
    { key: "address", label: "Address", getValue: getFullAddress },
    { key: "age", label: "Age", getValue: (profile) => `${getAge(profile.birthDate)}` },
    { key: "civilStatus", label: "Civil Status", getValue: (profile) => profile.civilStatus },
  ],
  cedula: [
    { key: "name", label: "Name", getValue: getFullName },
    { key: "citizenship", label: "Citizenship", getValue: (profile) => profile.citizenship },
    { key: "birthdate", label: "Birthdate", getValue: (profile) => formatDate(profile.birthDate) },
    { key: "address", label: "Address", getValue: getFullAddress },
    { key: "civilStatus", label: "Civil Status", getValue: (profile) => profile.civilStatus },
  ],
  "barangay-id": [
    { key: "name", label: "Name", getValue: getFullName },
    { key: "civilStatus", label: "Civil Status", getValue: (profile) => profile.civilStatus },
    { key: "address", label: "Address", getValue: getFullAddress },
    { key: "birthdate", label: "Birthdate", getValue: (profile) => formatDate(profile.birthDate) },
    { key: "contactNumber", label: "Contact Number", getValue: (profile) => profile.contactNumber ?? "Not provided" },
    {
      key: "precinctNumber",
      label: "Voters Precinct No.",
      getValue: (profile) => profile.precinctNumber ?? "Not provided",
    },
  ],
  "first-time-job-seeker": [
    { key: "completeName", label: "Complete Name", getValue: getFullName },
    { key: "address", label: "Address", getValue: getFullAddress },
    { key: "age", label: "Age", getValue: (profile) => `${getAge(profile.birthDate)}` },
    { key: "birthdate", label: "Birthdate", getValue: (profile) => formatDate(profile.birthDate) },
    { key: "citizenship", label: "Citizenship", getValue: (profile) => profile.citizenship },
    { key: "civilStatus", label: "Civil Status", getValue: (profile) => profile.civilStatus },
  ],
};

function getFullName(profile: RequestResidentProfile) {
  return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ");
}

function getFullAddress(profile: RequestResidentProfile) {
  return [profile.houseNumber, profile.street].filter(Boolean).join(", ");
}

function getAge(birthDate: string) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return Math.max(age, 0);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function mapRequestRecord(record: ResidentDocumentRequestRecord): SubmittedRequest {
  return {
    id: record.id,
    documentType: record.type,
    submittedAt: record.submittedAt,
    amount: formatCurrency(record.amount),
    summary: record.detailLines,
    status: record.status,
  };
}

function LoadingShell() {
  return (
    <div className="max-container w-full padding-x py-6 sm:py-8 lg:py-10">
      <div className="space-y-6">
        <div className="h-8 w-56 animate-pulse rounded-full bg-slate-200" />
        <div className="h-[220px] animate-pulse rounded-[32px] border border-slate-200 bg-white" />
        <div className="h-[420px] animate-pulse rounded-[32px] border border-slate-200 bg-white" />
      </div>
    </div>
  );
}

function PlaceholderState({
  title,
  description,
  tone = "slate",
}: {
  title: string;
  description: string;
  tone?: "slate" | "rose";
}) {
  const classes =
    tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-dashed border-slate-300 bg-slate-50 text-slate-900";

  return (
    <div className={`rounded-[28px] border px-6 py-8 ${classes}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        value={value}
        disabled
        readOnly
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
      />
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

function RequestStatusBadge({ status }: { status: string }) {
  const toneClass =
    status === "APPROVED" || status === "GENERATED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "REVIEW"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}
    >
      {status}
    </span>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  type?: "text" | "tel" | "number";
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">
        {label} <span className="text-rose-500">*</span>
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
      />
      {error ? <p className="mt-2 text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
}) {
  return (
    <div className="md:col-span-2">
      <label className="text-sm font-medium text-slate-700">
        {label} <span className="text-rose-500">*</span>
      </label>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
      />
      {error ? <p className="mt-2 text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}

export default function RequestDocumentsClient({
  residentProfile,
  initialError,
}: {
  residentProfile: RequestResidentProfile | null;
  initialError?: string;
}) {
  const queryClient = useQueryClient();
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [selectedDocumentId, setSelectedDocumentId] = useState<DocumentTypeDefinition["id"]>("clearance");
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [quantity, setQuantity] = useState<number>(1);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBootLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedDocument = useMemo(
    () => documentTypeCatalog.find((item) => item.id === selectedDocumentId) ?? documentTypeCatalog[0],
    [selectedDocumentId]
  );

  const profileFields = useMemo(() => {
    if (!residentProfile) {
      return [];
    }

    return profileFieldMap[selectedDocument.id].map((field) => ({
      key: field.key,
      label: field.label,
      value: field.getValue(residentProfile),
    }));
  }, [residentProfile, selectedDocument.id]);

  const requestHistoryQuery = useQuery({
    queryKey: ["resident-document-requests", residentProfile?.id],
    queryFn: async () => {
      if (!residentProfile?.id) {
        throw new Error("Resident session is missing.");
      }

      return fetchResidentDocumentRequests();
    },
    enabled: Boolean(residentProfile?.id),
    staleTime: 60 * 1000,
  });

  const requestHistory = useMemo(
    () => (requestHistoryQuery.data ?? []).map(mapRequestRecord),
    [requestHistoryQuery.data]
  );

  const createRequestMutation = useMutation({
    mutationFn: async (formData: FormData) => createResidentDocumentRequestAction(formData),
    onSuccess: async (result) => {
      if (!result.success) {
        const nextErrors: FormErrors = {};

        Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) => {
          if (field in initialFormValues) {
            nextErrors[field as EditableFieldKey] = message;
          } else if (field === "submit") {
            nextErrors.submit = message;
          }
        });

        setFormErrors(nextErrors);
        setSubmissionError(result.message);
        setSubmissionMessage("");
        return;
      }

      if (!result.request) {
        setSubmissionError("The request was created, but the response payload was incomplete.");
        return;
      }

      const nextResidentRecord = result.request;

      setFormErrors({});
      setSubmissionError("");
      setSubmissionMessage(result.message);
      setFormValues(initialFormValues);
      setQuantity(1);

      queryClient.setQueryData<ResidentDocumentRequestRecord[]>(
        ["resident-document-requests", residentProfile?.id],
        (current = []) => [
          nextResidentRecord,
          ...current.filter((item) => item.id !== nextResidentRecord.id),
        ]
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["documents", "user"] }),
        queryClient.invalidateQueries({ queryKey: ["documents", "all"] }),
        queryClient.invalidateQueries({ queryKey: ["resident-documents", residentProfile?.id] }),
        queryClient.invalidateQueries({ queryKey: ["resident-document-requests", residentProfile?.id] }),
      ]);
    },
    onError: (error) => {
      setSubmissionMessage("");
      setSubmissionError(
        error instanceof Error ? error.message : "An unexpected error occurred while creating your request."
      );
    },
  });


  if (isBootLoading) {
    return <LoadingShell />;
  }

  const handleDocumentTypeChange = (nextDocumentId: DocumentTypeDefinition["id"]) => {
    setSelectedDocumentId(nextDocumentId);
    setFormValues(initialFormValues);
    setFormErrors({});
    setQuantity(1);
    setSubmissionMessage("");
    setSubmissionError("");
  };

  const handleRequestSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmissionMessage("");
    setSubmissionError("");

    const nextErrors: FormErrors = {};

    selectedDocument.fields.forEach((field) => {
      const value = formValues[field.name as EditableFieldKey];
      if (field.required && !value.trim()) {
        nextErrors[field.name as EditableFieldKey] = `${field.label} is required.`;
      }
    });

    if (["clearance", "indigency", "residency"].includes(selectedDocument.id) && !formValues.purpose.trim()) {
      nextErrors.purpose = "Purpose is required.";
    }

    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const payload: DocumentRequestDraftInput = {
      documentType: selectedDocument.id,
      requestedCopies: quantity.toString(),
      ...formValues,
    };

    const formData = createDocumentRequestFormData(payload);

    await createRequestMutation.mutateAsync(formData);
  };

  return (
    <div className="max-container w-full padding-x py-6 sm:py-8 lg:py-10">
      <div className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600">Resident Services</p>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Document Request</h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">
            Complete the form to submit your document request.
          </p>
        </div>

        {initialError ? (
          <PlaceholderState title="Unable to load resident information" description={initialError} tone="rose" />
        ) : null}

        {!initialError && !residentProfile ? (
          <PlaceholderState
            title="Resident profile unavailable"
            description="Your session is active, but the resident profile needed for document requests could not be found."
          />
        ) : null}

        {residentProfile ? (
          <>
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Choose a Document</h2>
                  <p className="text-sm text-slate-600">The request fields and payload are filtered by document type.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {documentTypeCatalog.map((document) => {
                  const isSelected = document.id === selectedDocumentId;

                  return (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => handleDocumentTypeChange(document.id)}
                      className={cn(
                        "rounded-3xl border p-4 text-left transition-all",
                        isSelected
                          ? "border-primary-500 bg-primary-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50"
                      )}
                    >
                      <p className="text-base font-semibold text-slate-900">{document.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{document.description}</p>
                      <p className="mt-4 text-sm font-semibold text-slate-900">
                        {document.fee === 0 ? "Free of charge" : formatCurrency(document.fee)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Resident Profile</h2>
                  <p className="text-sm text-slate-600">
                    Auto-populated and locked. These fields are merged into the unified request form.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {profileFields.map((field) => (
                  <ReadOnlyField key={field.key} label={field.label} value={field.value} />
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Request Details</h2>
                  <p className="text-sm text-slate-600">
                    The server action receives only the fields relevant to the selected document type.
                  </p>
                </div>
              </div>

              <form className="mt-6 space-y-6" onSubmit={handleRequestSubmit}>
                {submissionMessage ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{submissionMessage}</span>
                    </div>
                  </div>
                ) : null}

                {submissionError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {submissionError}
                  </div>
                ) : null}

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Selected Document</p>
                      <h3 className="mt-2 text-xl font-bold text-slate-900">{selectedDocument.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{selectedDocument.description}</p>
                    </div>
                    <div className="rounded-2xl border border-primary-200 bg-white px-4 py-3 text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Fee</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {selectedDocument.fee * quantity === 0 ? "Free" : formatCurrency(selectedDocument.fee * quantity)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  {["clearance", "indigency", "residency"].includes(selectedDocument.id) ? (
                    <TextAreaField
                      label="Purpose"
                      value={formValues.purpose}
                      onChange={(value) => {
                        setFormValues((current) => ({ ...current, purpose: value }));
                        setFormErrors((current) => ({ ...current, purpose: undefined, submit: undefined }));
                      }}
                      placeholder="State the purpose of your request."
                      error={formErrors.purpose}
                    />
                  ) : null}

                  {selectedDocument.fields.map((field) => (
                    <div key={field.name} className={field.name === "emergencyContactAddress" ? "md:col-span-2" : ""}>
                      <TextField
                        label={field.label}
                        value={formValues[field.name as EditableFieldKey]}
                        onChange={(value) => {
                          setFormValues((current) => ({ ...current, [field.name]: value }));
                          setFormErrors((current) => ({
                            ...current,
                            [field.name]: undefined,
                            submit: undefined,
                          }));
                        }}
                        placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                        error={formErrors[field.name as EditableFieldKey]}
                        type={field.type === "tel" || field.type === "number" ? field.type : "text"}
                      />
                    </div>
                  ))}

                  <div>
                    <label className="text-sm font-medium text-slate-700">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) {
                          setQuantity(val);
                        } else if (e.target.value === "") {
                          // Allow temporary empty state while typing, or default to 1 on blur
                          setQuantity(e.target.value as unknown as number);
                        }
                      }}
                      onBlur={() => {
                        if (!quantity || quantity < 1) {
                          setQuantity(1);
                        }
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600 outline-none transition-colors focus:border-primary-500"
                    />
                  </div>
                 
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                  <button
                    type="submit"
                    disabled={createRequestMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {createRequestMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating request...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>



            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Request Preview Log</h2>
                  <p className="text-sm text-slate-600">
                    Your submitted document requests are fetched from the server and refreshed after each new submission.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                {requestHistoryQuery.isLoading ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
                    Loading request history...
                  </div>
                ) : requestHistoryQuery.isError ? (
                  <PlaceholderState
                    title="Unable to load request history"
                    description={
                      requestHistoryQuery.error instanceof Error
                        ? requestHistoryQuery.error.message
                        : "The request history could not be loaded right now."
                    }
                    tone="rose"
                  />
                ) : requestHistory.length === 0 ? (
                  <div className="flex min-h-55 items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                    <div className="max-w-md">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                        <FileText className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-slate-900">No requests yet</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Your document request history will appear here once requests are submitted.
                      </p>
                    </div>
                  </div>
                ) : (
                  <TableShell columns="Document|Created|Amount|Status|Details">
                    {requestHistory.map((request) => (
                      <tr key={request.id} className="border-b border-slate-100 align-top last:border-b-0">
                        <td className="px-5 py-4">
                          <div className="min-w-45">
                            <p className="text-sm font-semibold text-slate-900">{request.documentType}</p>
                            <p className="mt-1 text-xs text-slate-500">Preview log entry</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          <div className="min-w-40">{formatDateTime(request.submittedAt)}</div>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-900">
                          <div className="min-w-27.5">{request.amount}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="min-w-30">
                            <RequestStatusBadge status={request.status} />
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="min-w-55">
                            <dl className="space-y-3 text-sm">
                              {request.summary.map((item) => (
                                <div
                                  key={`${request.id}-${item.label}`}
                                  className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                                >
                                  <dt className="font-medium text-slate-500">{item.label}</dt>
                                  <dd className="text-slate-900 sm:max-w-[60%] sm:text-right">{item.value}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </TableShell>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
