"use client";

import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { registerResidentAction } from "@/server/actions/auth.actions";
import {
  MAX_VALID_ID_IMAGE_SIZE_BYTES,
  validateValidIdImageFile,
} from "@/lib/valid-id-image";
import {
  getZodFieldErrors,
  residentRegistrationSchema,
  type ResidentRegistrationInput,
} from "@/validations/resident.validation";

type RegisterFormState = Omit<ResidentRegistrationInput, "validIDImageName"> & {
  validIDImage: File | null;
  validIDImagePreview: string;
  validIDImageName: string;
};

const initialFormState: RegisterFormState = {
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  middleName: "",
  birthDate: "",
  gender: "",
  civilStatus: "",
  street: "",
  houseNumber: "",
  contactNumber: "",
  occupation: "",
  citizenship: "",
  validIDImageName: "",
  validIDImage: null,
  validIDImagePreview: "",
};

const civilStatuses = ["Single", "Married", "Widowed", "Divorced", "Separated"];
const genders = ["Male", "Female", "Other"];

function getSubmissionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (/body.?size.?limit|payload|request entity too large|413|too large/i.test(message)) {
    return {
      submit: "The selected image is too large to upload. Choose an image up to 5MB.",
      validIDImageName: "Valid ID image size must be 5MB or less.",
    };
  }

  return {
    submit: "Registration failed. Please try again.",
  };
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterFormState>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    return () => {
      if (formData.validIDImagePreview) {
        URL.revokeObjectURL(formData.validIDImagePreview);
      }
    };
  }, [formData.validIDImagePreview]);

  const registerMutation = useMutation({
    mutationFn: registerResidentAction,
    onSuccess: (result) => {
      if (!result) {
        setSuccessMessage("");
        setErrors({
          submit: "Registration failed. Please try again.",
        });
        return;
      }

      if (!result.success) {
        setErrors(result.fieldErrors ?? {});
        setSuccessMessage("");

        if (!result.fieldErrors) {
          setErrors({ submit: result.message });
        }

        return;
      }

      setErrors({});
      setSuccessMessage(result.message);
      setFormData({ ...initialFormState });
    },
    onError: (error) => {
      setSuccessMessage("");
      setErrors(getSubmissionErrorMessage(error));
    },
  });

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    if (errors[name] || errors.submit) {
      setErrors((current) => ({
        ...current,
        [name]: "",
        submit: "",
      }));
    }
  };

  const handleIDImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const nextErrors = { ...errors };
    const imageValidationError = validateValidIdImageFile(file);

    if (imageValidationError) {
      nextErrors.validIDImageName = imageValidationError;
      setErrors(nextErrors);
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setErrors((current) => ({
      ...current,
      validIDImageName: "",
      submit: "",
    }));

    setFormData((current) => {
      if (current.validIDImagePreview) {
        URL.revokeObjectURL(current.validIDImagePreview);
      }

      return {
        ...current,
        validIDImage: file,
        validIDImageName: file.name,
        validIDImagePreview: previewUrl,
      };
    });
  };

  const validateForm = () => {
    const parsed = residentRegistrationSchema.safeParse({
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      firstName: formData.firstName,
      lastName: formData.lastName,
      middleName: formData.middleName,
      birthDate: formData.birthDate,
      gender: formData.gender,
      civilStatus: formData.civilStatus,
      street: formData.street,
      houseNumber: formData.houseNumber,
      contactNumber: formData.contactNumber,
      occupation: formData.occupation,
      citizenship: formData.citizenship,
      validIDImageName: formData.validIDImageName,
    });

    if (parsed.success) {
      setErrors({});
      return true;
    }

    setErrors(getZodFieldErrors(parsed.error));
    return false;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    if (!formData.validIDImage) {
      setErrors((current) => ({
        ...current,
        validIDImageName: "Valid ID image is required.",
      }));
      return;
    }

    const submission = new FormData();

    submission.set("email", formData.email);
    submission.set("password", formData.password);
    submission.set("confirmPassword", formData.confirmPassword);
    submission.set("firstName", formData.firstName);
    submission.set("lastName", formData.lastName);
    submission.set("middleName", formData.middleName);
    submission.set("birthDate", formData.birthDate);
    submission.set("gender", formData.gender);
    submission.set("civilStatus", formData.civilStatus);
    submission.set("street", formData.street);
    submission.set("houseNumber", formData.houseNumber);
    submission.set("contactNumber", formData.contactNumber);
    submission.set("occupation", formData.occupation);
    submission.set("citizenship", formData.citizenship);
    submission.set("validIDImage", formData.validIDImage);

    await registerMutation.mutateAsync(submission);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 max-container padding-x">
      <div className="mx-auto max-w-4xl rounded-xl border border-gray-100 bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
              MSI
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Barangay Registration</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create your resident account to access barangay services
          </p>
        </div>

        {errors.submit && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errors.submit}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {successMessage} You can now proceed to{" "}
            <Link href="/login" className="font-semibold underline">
              login
            </Link>
            .
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <section>
            <h2 className="mb-4 border-b-2 border-blue-600 pb-2 text-lg font-semibold text-gray-900">
              Account Details
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="juan.delacruz@example.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="********"
                />
                {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.confirmPassword ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="********"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 border-b-2 border-blue-600 pb-2 text-lg font-semibold text-gray-900">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.firstName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.lastName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Birth Date</label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.birthDate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.birthDate && <p className="mt-1 text-sm text-red-500">{errors.birthDate}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.gender ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Select Gender</option>
                  {genders.map((gender) => (
                    <option key={gender} value={gender}>
                      {gender}
                    </option>
                  ))}
                </select>
                {errors.gender && <p className="mt-1 text-sm text-red-500">{errors.gender}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Civil Status</label>
                <select
                  name="civilStatus"
                  value={formData.civilStatus}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.civilStatus ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Select Status</option>
                  {civilStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                {errors.civilStatus && (
                  <p className="mt-1 text-sm text-red-500">{errors.civilStatus}</p>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 border-b-2 border-blue-600 pb-2 text-lg font-semibold text-gray-900">
              Contact & Address
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Street</label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.street ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.street && <p className="mt-1 text-sm text-red-500">{errors.street}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">House Number</label>
                <input
                  type="text"
                  name="houseNumber"
                  value={formData.houseNumber}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.houseNumber ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.houseNumber && (
                  <p className="mt-1 text-sm text-red-500">{errors.houseNumber}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Contact Number</label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.contactNumber ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="+63 9XX XXX XXXX"
                />
                {errors.contactNumber && (
                  <p className="mt-1 text-sm text-red-500">{errors.contactNumber}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Occupation</label>
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Teacher, Engineer"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Citizenship</label>
                <input
                  type="text"
                  name="citizenship"
                  value={formData.citizenship}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.citizenship ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Filipino"
                />
                {errors.citizenship && (
                  <p className="mt-1 text-sm text-red-500">{errors.citizenship}</p>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 border-b-2 border-blue-600 pb-2 text-lg font-semibold text-gray-900">
              Identity Verification
            </h2>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Upload Valid ID</label>
              <label className="relative block w-full">
                <input type="file" accept="image/*" onChange={handleIDImageChange} className="sr-only" />
                <div
                  className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                    errors.validIDImageName
                      ? "border-red-400 bg-red-50"
                      : "cursor-pointer border-gray-300 bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-600">
                    Click to select an image file for your valid ID
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    JPG, PNG, or WebP up to {Math.floor(MAX_VALID_ID_IMAGE_SIZE_BYTES / (1024 * 1024))}
                    MB
                  </p>
                </div>
              </label>
              {errors.validIDImageName && (
                <p className="mt-1 text-sm text-red-500">{errors.validIDImageName}</p>
              )}
            </div>

            {formData.validIDImagePreview && (
              <div className="mt-6 rounded-lg bg-blue-50 p-4">
                <p className="mb-3 text-sm font-medium text-gray-700">Valid ID Preview:</p>
                <div className="max-w-md">
                  <Image
                    src={formData.validIDImagePreview}
                    alt="Valid ID preview"
                    width={640}
                    height={400}
                    unoptimized
                    className="h-auto w-full rounded-lg border border-gray-300 shadow-md"
                  />
                </div>
              </div>
            )}
          </section>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {registerMutation.isPending ? "Creating Account..." : "Create Account"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (formData.validIDImagePreview) {
                  URL.revokeObjectURL(formData.validIDImagePreview);
                }
                setFormData({ ...initialFormState });
                setErrors({});
                setSuccessMessage("");
              }}
              className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Clear Form
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign In Here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
