"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  FileImage,
  FileText,
  Loader2,
  Send,
  Upload,
  User,
} from "lucide-react";

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

type DocumentTypeId =
  | "clearance"
  | "indigency"
  | "residency"
  | "cedula"
  | "barangay-id"
  | "job-seeker";

type EditableFieldKey =
  | "purpose"
  | "yearsOfResidency"
  | "placeOfBirth"
  | "emergencyContactPerson"
  | "emergencyContactAddress"
  | "emergencyContactNumber";

type DocumentDefinition = {
  id: DocumentTypeId;
  label: string;
  description: string;
  feeLabel: string;
  readOnlyFields: Array<{
    key: string;
    label: string;
    getValue: (profile: RequestResidentProfile) => string;
  }>;
  editableFields: Array<{
    key: EditableFieldKey;
    label: string;
    placeholder: string;
    type?: "text" | "tel" | "textarea" | "number";
  }>;
};

type FormValues = Record<EditableFieldKey, string>;
type FormErrors = Partial<Record<EditableFieldKey, string>>;

type SubmittedRequest = {
  id: string;
  documentType: string;
  submittedAt: string;
  amount: string;
  summary: Array<{ label: string; value: string }>;
  referenceDigits: string | null;
  paymentProofName: string | null;
  paymentPreviewUrl: string | null;
};

const documentDefinitions: DocumentDefinition[] = [
  {
    id: "clearance",
    label: "Barangay Clearance",
    description: "For employment, permit processing, travel, and other official transactions.",
    feeLabel: "PHP 75.00",
    readOnlyFields: [
      { key: "name", label: "Name", getValue: getFullName },
      { key: "citizenship", label: "Citizenship", getValue: (profile) => profile.citizenship },
      { key: "address", label: "Address", getValue: getFullAddress },
      { key: "age", label: "Age", getValue: (profile) => `${getAge(profile.birthDate)}` },
      { key: "civilStatus", label: "Civil Status", getValue: (profile) => profile.civilStatus },
    ],
    editableFields: [
      { key: "purpose", label: "Purpose", placeholder: "State the purpose of your request.", type: "textarea" },
      { key: "yearsOfResidency", label: "Year of Residency", placeholder: "Enter total years in the barangay", type: "number" },
    ],
  },
  {
    id: "indigency",
    label: "Certificate of Indigency",
    description: "For medical, burial, educational, and social assistance requirements.",
    feeLabel: "PHP 50.00",
    readOnlyFields: [
      { key: "name", label: "Name", getValue: getFullName },
      { key: "citizenship", label: "Citizenship", getValue: (profile) => profile.citizenship },
      { key: "address", label: "Address", getValue: getFullAddress },
      { key: "age", label: "Age", getValue: (profile) => `${getAge(profile.birthDate)}` },
      { key: "civilStatus", label: "Civil Status", getValue: (profile) => profile.civilStatus },
    ],
    editableFields: [
      { key: "purpose", label: "Purpose", placeholder: "Describe the assistance or requirement.", type: "textarea" },
      { key: "yearsOfResidency", label: "Year of Residency", placeholder: "Enter total years in the barangay", type: "number" },
    ],
  },
  {
    id: "residency",
    label: "Certificate of Residency",
    description: "Proof of residence and length of stay within Barangay Sampaloc IV.",
    feeLabel: "PHP 50.00",
    readOnlyFields: [
      { key: "name", label: "Name", getValue: getFullName },
      { key: "citizenship", label: "Citizenship", getValue: (profile) => profile.citizenship },
      { key: "address", label: "Address", getValue: getFullAddress },
      { key: "age", label: "Age", getValue: (profile) => `${getAge(profile.birthDate)}` },
      { key: "civilStatus", label: "Civil Status", getValue: (profile) => profile.civilStatus },
    ],
    editableFields: [
      { key: "purpose", label: "Purpose", placeholder: "Explain how the residency certificate will be used.", type: "textarea" },
      { key: "yearsOfResidency", label: "Year of Residency", placeholder: "Enter total years in the barangay", type: "number" },
    ],
  },
  {
    id: "cedula",
    label: "Cedula",
    description: "Community tax certificate request with resident details attached.",
    feeLabel: "PHP 90.00",
    readOnlyFields: [
      { key: "name", label: "Name", getValue: getFullName },
      { key: "citizenship", label: "Citizenship", getValue: (profile) => profile.citizenship },
      { key: "birthdate", label: "Birthdate", getValue: (profile) => formatDate(profile.birthDate) },
      { key: "address", label: "Address", getValue: getFullAddress },
      { key: "civilStatus", label: "Civil Status", getValue: (profile) => profile.civilStatus },
    ],
    editableFields: [{ key: "placeOfBirth", label: "Place of Birth", placeholder: "Enter place of birth" }],
  },
  {
    id: "barangay-id",
    label: "Barangay ID",
    description: "Barangay identification request with contact and emergency details.",
    feeLabel: "PHP 150.00",
    readOnlyFields: [
      { key: "name", label: "Name", getValue: getFullName },
      { key: "civilStatus", label: "Civil Status", getValue: (profile) => profile.civilStatus },
      { key: "address", label: "Address", getValue: getFullAddress },
      { key: "birthdate", label: "Birthdate", getValue: (profile) => formatDate(profile.birthDate) },
      { key: "place-of-birth-note", label: "Place of Birth", getValue: () => "To be provided below" },
      { key: "contactNumber", label: "Contact Number", getValue: (profile) => profile.contactNumber ?? "Not provided" },
      { key: "precinctNumber", label: "Voters Precinct No.", getValue: (profile) => profile.precinctNumber ?? "Not provided" },
    ],
    editableFields: [
      { key: "placeOfBirth", label: "Place of Birth", placeholder: "Enter place of birth" },
      { key: "emergencyContactPerson", label: "Emergency Contact Person", placeholder: "Full name" },
      { key: "emergencyContactAddress", label: "Emergency Contact Address", placeholder: "Complete address" },
      { key: "emergencyContactNumber", label: "Emergency Contact Number", placeholder: "09XXXXXXXXX", type: "tel" },
    ],
  },
  {
    id: "job-seeker",
    label: "Job Seeker",
    description: "Certificate for first-time job application requirements.",
    feeLabel: "Free of charge",
    readOnlyFields: [
      { key: "completeName", label: "Complete Name", getValue: getFullName },
      { key: "address", label: "Address", getValue: getFullAddress },
      { key: "age", label: "Age", getValue: (profile) => `${getAge(profile.birthDate)}` },
      { key: "birthdate", label: "Birthdate", getValue: (profile) => formatDate(profile.birthDate) },
      { key: "citizenship", label: "Citizenship", getValue: (profile) => profile.citizenship },
      { key: "civilStatus", label: "Civil Status", getValue: (profile) => profile.civilStatus },
    ],
    editableFields: [
      { key: "yearsOfResidency", label: "Years of Residency", placeholder: "Enter total years in the barangay", type: "number" },
    ],
  },
];

const initialFormValues: FormValues = {
  purpose: "",
  yearsOfResidency: "",
  placeOfBirth: "",
  emergencyContactPerson: "",
  emergencyContactAddress: "",
  emergencyContactNumber: "",
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

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `request-${Date.now()}`;
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

function GCashQrCard() {
  return (
    <div className="flex flex-col items-center rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <svg viewBox="0 0 120 120" className="h-48 w-48 rounded-[28px] border border-slate-200 bg-white p-4">
        <rect width="120" height="120" fill="white" />
        <g fill="#111827">
          <rect x="8" y="8" width="28" height="28" rx="2" />
          <rect x="14" y="14" width="16" height="16" fill="white" />
          <rect x="84" y="8" width="28" height="28" rx="2" />
          <rect x="90" y="14" width="16" height="16" fill="white" />
          <rect x="8" y="84" width="28" height="28" rx="2" />
          <rect x="14" y="90" width="16" height="16" fill="white" />
          <rect x="48" y="8" width="8" height="8" />
          <rect x="60" y="8" width="8" height="8" />
          <rect x="48" y="20" width="8" height="8" />
          <rect x="60" y="20" width="8" height="8" />
          <rect x="44" y="40" width="8" height="8" />
          <rect x="56" y="40" width="8" height="8" />
          <rect x="68" y="40" width="8" height="8" />
          <rect x="80" y="40" width="8" height="8" />
          <rect x="40" y="52" width="8" height="8" />
          <rect x="52" y="52" width="8" height="8" />
          <rect x="76" y="52" width="8" height="8" />
          <rect x="92" y="52" width="8" height="8" />
          <rect x="44" y="64" width="8" height="8" />
          <rect x="68" y="64" width="8" height="8" />
          <rect x="80" y="64" width="8" height="8" />
          <rect x="92" y="64" width="8" height="8" />
          <rect x="44" y="76" width="8" height="8" />
          <rect x="56" y="76" width="8" height="8" />
          <rect x="68" y="76" width="8" height="8" />
          <rect x="80" y="76" width="8" height="8" />
          <rect x="92" y="76" width="8" height="8" />
          <rect x="48" y="88" width="8" height="8" />
          <rect x="60" y="88" width="8" height="8" />
          <rect x="72" y="88" width="8" height="8" />
          <rect x="84" y="88" width="8" height="8" />
          <rect x="96" y="88" width="8" height="8" />
          <rect x="48" y="100" width="8" height="8" />
          <rect x="72" y="100" width="8" height="8" />
          <rect x="96" y="100" width="8" height="8" />
        </g>
      </svg>
      <p className="mt-4 text-sm font-semibold text-slate-900">Sampaloc IV GCash</p>
      <p className="mt-1 text-center text-xs text-slate-500">UI-only QR placeholder for payment proof submission.</p>
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
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [selectedDocumentId, setSelectedDocumentId] = useState<DocumentTypeId>("clearance");
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentReferenceDigits, setPaymentReferenceDigits] = useState("");
  const [paymentReferenceError, setPaymentReferenceError] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofError, setPaymentProofError] = useState("");
  const [paymentPreviewUrl, setPaymentPreviewUrl] = useState<string | null>(null);
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedRequest | null>(null);
  const [requestHistory, setRequestHistory] = useState<SubmittedRequest[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBootLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedDocument = useMemo(
    () => documentDefinitions.find((item) => item.id === selectedDocumentId) ?? documentDefinitions[0],
    [selectedDocumentId]
  );

  const profileFields = useMemo(() => {
    if (!residentProfile) {
      return [];
    }

    return selectedDocument.readOnlyFields.map((field) => ({
      key: field.key,
      label: field.label,
      value: field.getValue(residentProfile),
    }));
  }, [residentProfile, selectedDocument]);

  const requestSummary = useMemo(() => {
    if (!residentProfile) {
      return [];
    }

    const summary: Array<{ label: string; value: string }> = [
      { label: "Resident", value: getFullName(residentProfile) },
      { label: "Address", value: getFullAddress(residentProfile) },
    ];

    selectedDocument.editableFields.forEach((field) => {
      const value = formValues[field.key].trim();
      if (value) {
        summary.push({ label: field.label, value });
      }
    });

    return summary;
  }, [formValues, residentProfile, selectedDocument]);

  if (isBootLoading) {
    return <LoadingShell />;
  }

  return (
    <div className="max-container w-full padding-x py-6 sm:py-8 lg:py-10">
      <div className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600">Resident Services</p>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Document Request</h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">
            Request barangay documents in one form, review your auto-filled profile, then continue to the GCash payment step.
          </p>
        </div>

        {initialError ? (
          <PlaceholderState
            title="Unable to load resident information"
            description={initialError}
            tone="rose"
          />
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
                  <p className="text-sm text-slate-600">The form below updates based on the selected request type.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {documentDefinitions.map((document) => {
                  const isSelected = document.id === selectedDocumentId;

                  return (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => {
                        setSelectedDocumentId(document.id);
                        setFormValues(initialFormValues);
                        setFormErrors({});
                        setSubmittedRequest(null);
                        setPaymentSaved(false);
                        setPaymentReferenceDigits("");
                        setPaymentReferenceError("");
                        setPaymentProofError("");
                        setPaymentProofFile(null);
                        setPaymentPreviewUrl(null);
                      }}
                      className={cn(
                        "rounded-[24px] border p-4 text-left transition-all",
                        isSelected
                          ? "border-primary-500 bg-primary-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50"
                      )}
                    >
                      <p className="text-base font-semibold text-slate-900">{document.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{document.description}</p>
                      <p className="mt-4 text-sm font-semibold text-slate-900">{document.feeLabel}</p>
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
                  <p className="text-sm text-slate-600">Auto-populated and read-only. These fields are merged directly into the request form.</p>
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
                  <p className="text-sm text-slate-600">Complete only the fields required by the selected document type.</p>
                </div>
              </div>

              <form
                className="mt-6 space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  setIsSubmitting(true);

                  const nextErrors: FormErrors = {};

                  selectedDocument.editableFields.forEach((field) => {
                    if (!formValues[field.key].trim()) {
                      nextErrors[field.key] = `${field.label} is required.`;
                    }
                  });

                  setFormErrors(nextErrors);

                  if (Object.keys(nextErrors).length > 0) {
                    setIsSubmitting(false);
                    return;
                  }

                  window.setTimeout(() => {
                    const nextRequest: SubmittedRequest = {
                      id: generateId(),
                      documentType: selectedDocument.label,
                      submittedAt: new Date().toISOString(),
                      amount: selectedDocument.feeLabel,
                      summary: requestSummary,
                      referenceDigits: null,
                      paymentProofName: null,
                      paymentPreviewUrl: null,
                    };

                    setSubmittedRequest(nextRequest);
                    setPaymentSaved(false);
                    setPaymentReferenceDigits("");
                    setPaymentReferenceError("");
                    setPaymentProofError("");
                    setPaymentProofFile(null);
                    setPaymentPreviewUrl(null);
                    setIsSubmitting(false);
                  }, 600);
                }}
              >
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Selected Document</p>
                      <h3 className="mt-2 text-xl font-bold text-slate-900">{selectedDocument.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{selectedDocument.description}</p>
                    </div>
                    <div className="rounded-2xl border border-primary-200 bg-white px-4 py-3 text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fee</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{selectedDocument.feeLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  {selectedDocument.editableFields.map((field) =>
                    field.type === "textarea" ? (
                      <TextAreaField
                        key={field.key}
                        label={field.label}
                        value={formValues[field.key]}
                        onChange={(value) => {
                          setFormValues((current) => ({ ...current, [field.key]: value }));
                          setFormErrors((current) => ({ ...current, [field.key]: undefined }));
                        }}
                        placeholder={field.placeholder}
                        error={formErrors[field.key]}
                      />
                    ) : (
                      <div key={field.key} className={field.key === "emergencyContactAddress" ? "md:col-span-2" : ""}>
                        <TextField
                          label={field.label}
                          value={formValues[field.key]}
                          onChange={(value) => {
                            setFormValues((current) => ({ ...current, [field.key]: value }));
                            setFormErrors((current) => ({ ...current, [field.key]: undefined }));
                          }}
                          placeholder={field.placeholder}
                          error={formErrors[field.key]}
                          type={field.type === "tel" || field.type === "number" ? field.type : "text"}
                        />
                      </div>
                    )
                  )}

                  <div>
                    <label className="text-sm font-medium text-slate-700">Resident Email</label>
                    <input
                      disabled
                      readOnly
                      value={residentProfile.email}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Form Status</label>
                    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {submittedRequest ? "Ready for payment upload" : "Waiting for submission"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Preparing payment step...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Continue to Payment
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {submittedRequest ? (
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">GCash Payment</h2>
                    <p className="text-sm text-slate-600">After request submission, upload your payment proof and enter the last 4 digits of the reference number.</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
                  <GCashQrCard />

                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Document</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{submittedRequest.documentType}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount Due</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{submittedRequest.amount}</p>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-semibold text-slate-900">Upload proof of payment</p>
                      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-8 text-center transition-colors hover:border-primary-400 hover:bg-primary-50/30">
                        <Upload className="h-6 w-6 text-primary-700" />
                        <p className="mt-3 text-sm font-medium text-slate-900">Choose a payment screenshot</p>
                        <p className="mt-1 text-xs text-slate-500">PNG, JPG, WEBP, or GIF with local preview</p>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="sr-only"
                          onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            const file = event.target.files?.[0] ?? null;
                            setPaymentProofError("");

                            if (!file) {
                              return;
                            }

                            if (!file.type.startsWith("image/")) {
                              setPaymentProofFile(null);
                              setPaymentPreviewUrl(null);
                              setPaymentProofError("Please upload an image file for proof of payment.");
                              return;
                            }

                            setPaymentProofFile(file);
                            setPaymentPreviewUrl(URL.createObjectURL(file));
                          }}
                        />
                      </label>

                      {paymentProofError ? (
                        <p className="mt-3 text-xs text-rose-500">{paymentProofError}</p>
                      ) : null}

                      {paymentPreviewUrl ? (
                        <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <FileImage className="h-4 w-4 text-primary-700" />
                            <span>{paymentProofFile?.name}</span>
                          </div>
                          <Image
                            src={paymentPreviewUrl}
                            alt="Proof of payment preview"
                            width={1200}
                            height={900}
                            unoptimized
                            className="mt-4 max-h-72 w-full rounded-2xl object-cover"
                          />
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Last 4 Digits of Reference Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        inputMode="numeric"
                        maxLength={4}
                        value={paymentReferenceDigits}
                        onChange={(event) => {
                          setPaymentReferenceDigits(event.target.value.replace(/\D/g, "").slice(0, 4));
                          setPaymentReferenceError("");
                        }}
                        placeholder="1234"
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                      />
                      {paymentReferenceError ? (
                        <p className="mt-2 text-xs text-rose-500">{paymentReferenceError}</p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        let blocked = false;

                        if (!paymentProofFile) {
                          setPaymentProofError("Proof of payment is required.");
                          blocked = true;
                        }

                        if (!/^\d{4}$/.test(paymentReferenceDigits)) {
                          setPaymentReferenceError("Enter exactly 4 digits.");
                          blocked = true;
                        }

                        if (blocked) {
                          return;
                        }

                        const paidRequest: SubmittedRequest = {
                          ...submittedRequest,
                          referenceDigits: paymentReferenceDigits,
                          paymentProofName: paymentProofFile?.name ?? null,
                          paymentPreviewUrl,
                        };

                        setSubmittedRequest(paidRequest);
                        setRequestHistory((current) => [paidRequest, ...current.filter((item) => item.id !== paidRequest.id)]);
                        setPaymentSaved(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      <Upload className="h-4 w-4" />
                      Save Payment Details
                    </button>

                    {paymentSaved ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Payment details captured locally. No backend submission has been made yet.
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Request Preview Log</h2>
                  <p className="text-sm text-slate-600">This section stays local to the page and acts as the UI-only request history placeholder.</p>
                </div>
              </div>

              <div className="mt-5">
                {requestHistory.length === 0 ? (
                  <div className="flex min-h-[220px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                    <div className="max-w-md">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                        <FileText className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-slate-900">No requests yet</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Your first document request will appear here after you complete the payment details step.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requestHistory.map((request) => (
                      <article key={request.id} className="rounded-[24px] border border-slate-200 bg-slate-50/50 p-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">{request.documentType}</h3>
                            <p className="mt-2 text-sm text-slate-500">Created {formatDateTime(request.submittedAt)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                            {request.amount}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Details</p>
                            <dl className="mt-3 space-y-3 text-sm">
                              {request.summary.map((item) => (
                                <div key={`${request.id}-${item.label}`} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                  <dt className="font-medium text-slate-500">{item.label}</dt>
                                  <dd className="text-slate-900 sm:max-w-[60%] sm:text-right">{item.value}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>

                          <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference Number</p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">
                                {request.referenceDigits ? `**** ${request.referenceDigits}` : "Awaiting input"}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proof of Payment</p>
                              {request.paymentPreviewUrl ? (
                                <div className="mt-3">
                                  <Image
                                    src={request.paymentPreviewUrl}
                                    alt="Uploaded payment proof"
                                    width={1200}
                                    height={900}
                                    unoptimized
                                    className="h-36 w-full rounded-2xl object-cover"
                                  />
                                  <p className="mt-2 text-sm text-slate-600">{request.paymentProofName}</p>
                                </div>
                              ) : (
                                <p className="mt-2 text-sm text-slate-500">No upload attached</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
