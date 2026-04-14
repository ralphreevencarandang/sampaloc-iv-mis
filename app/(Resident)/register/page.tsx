"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const page = () => {
  const [formData, setFormData] = useState({
    // Account Details
    email: "",
    password: "",
    confirmPassword: "",

    // Personal Details
    firstName: "",
    lastName: "",
    middleName: "",
    birthDate: "",
    gender: "",
    civilStatus: "",

    // Contact & Address
    address: "",
    contactNumber: "",
    occupation: "",
    citizenship: "",


    validIDImage: null as File | null,
    validIDImagePreview: "",

    // Profile Image
    profileImage: null as File | null,
    profileImagePreview: "",

    // Terms
    agreeToTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);



  const civilStatuses = ["Single", "Married", "Widowed", "Divorced", "Separated"];
  const genders = ["Male", "Female", "Other"];

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({
          ...errors,
          profileImage: "Image size must be less than 5MB",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors({
          ...errors,
          profileImage: "Please select a valid image file",
        });
        return;
      }

      setFormData({
        ...formData,
        profileImage: file,
        profileImagePreview: URL.createObjectURL(file),
      });

      setErrors({
        ...errors,
        profileImage: "",
      });
    }
  };

  const handleIDImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({
          ...errors,
          validIDImage: "Image size must be less than 5MB",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors({
          ...errors,
          validIDImage: "Please select a valid image file",
        });
        return;
      }

      setFormData({
        ...formData,
        validIDImage: file,
        validIDImagePreview: URL.createObjectURL(file),
      });

      setErrors({
        ...errors,
        validIDImage: "",
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Personal details
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!formData.birthDate) {
      newErrors.birthDate = "Birth date is required";
    }
    if (!formData.gender) {
      newErrors.gender = "Gender is required";
    }
    if (!formData.civilStatus) {
      newErrors.civilStatus = "Civil status is required";
    }

    // Contact & Address
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }
    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required";
    }
    if (!formData.citizenship.trim()) {
      newErrors.citizenship = "Citizenship is required";
    }


    if (!formData.validIDImage) {
      newErrors.validIDImage = "Valid ID image is required";
    }

    // Profile Image
    if (!formData.profileImage) {
      newErrors.profileImage = "Profile image is required";
    }

    // Terms
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Create FormData for multipart form submission
      const formDataToSend = new FormData();

      // Add all text fields
      formDataToSend.append("email", formData.email);
      formDataToSend.append("password", formData.password);
      formDataToSend.append("firstName", formData.firstName);
      formDataToSend.append("lastName", formData.lastName);
      formDataToSend.append("middleName", formData.middleName);
      formDataToSend.append("birthDate", formData.birthDate);
      formDataToSend.append("gender", formData.gender);
      formDataToSend.append("civilStatus", formData.civilStatus);
      formDataToSend.append("address", formData.address);
      formDataToSend.append("contactNumber", formData.contactNumber);
      formDataToSend.append("occupation", formData.occupation);
      formDataToSend.append("citizenship", formData.citizenship);


      // Add valid ID image
      if (formData.validIDImage) {
        formDataToSend.append("validIDImage", formData.validIDImage);
      }

      // Add profile image
      if (formData.profileImage) {
        formDataToSend.append("profileImage", formData.profileImage);
      }

      // TODO: Replace with your actual API endpoint
      // const response = await fetch("/api/auth/register", {
      //   method: "POST",
      //   body: formDataToSend,
      // });

      // if (!response.ok) {
      //   throw new Error("Registration failed");
      // }

      console.log("Form submitted with data:", formData);
      setSuccess(true);

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          email: "",
          password: "",
          confirmPassword: "",
          firstName: "",
          lastName: "",
          middleName: "",
          birthDate: "",
          gender: "",
          civilStatus: "",
          address: "",
          contactNumber: "",
          occupation: "",
          citizenship: "",
    
          validIDImage: null,
          validIDImagePreview: "",
          profileImage: null,
          profileImagePreview: "",
          agreeToTerms: false,
        });
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Registration error:", error);
      setErrors({
        submit: "Registration failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-lg border border-green-200">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">✓</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">
            Registration Successful!
          </h2>
          <p className="text-gray-600 mb-6">
            Your account has been created. Please proceed to login.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 max-container padding-x">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              MSI
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Barangay Registration
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Create your resident account to access barangay services
          </p>
        </div>

        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Account Details Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
              Account Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="juan.delacruz@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.confirmPassword ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.firstName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Juan"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Middle Name
                </label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Santos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.lastName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Dela Cruz"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Birth Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.birthDate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.birthDate && (
                  <p className="mt-1 text-sm text-red-500">{errors.birthDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.gender ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Select Gender</option>
                  {genders.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-500">{errors.gender}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Civil Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="civilStatus"
                  value={formData.civilStatus}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                  <p className="mt-1 text-sm text-red-500">
                    {errors.civilStatus}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contact & Address Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
              Contact & Address
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.address ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter your complete address"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-500">{errors.address}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.contactNumber ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="+63 9XX XXX XXXX"
                />
                {errors.contactNumber && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.contactNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Occupation <span className="italic text-xs font-light">(if not applicable put N/A)</span>
                </label>
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Teacher, Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Citizenship <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="citizenship"
                  value={formData.citizenship}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.citizenship ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Filipino"
                />
                {errors.citizenship && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.citizenship}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Valid ID Section */}
          <div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Valid ID <span className="text-red-500">*</span>
                </label>
                <label className="relative block w-full">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIDImageChange}
                    className="sr-only"
                  />
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                      errors.validIDImage
                        ? "border-red-400 bg-red-50"
                        : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <svg
                      className="mx-auto h-8 w-8 mb-1 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="text-xs font-medium text-gray-600">
                      Click or drag image
                    </p>
                  </div>
                </label>
                {errors.validIDImage && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.validIDImage}
                  </p>
                )}
              </div>
            </div>

            {formData.validIDImagePreview && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Valid ID Preview:
                </p>
                <div className="max-w-md">
                  <img
                    src={formData.validIDImagePreview}
                    alt="Valid ID Preview"
                    className="w-full h-auto rounded-lg border border-gray-300 shadow-md"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Profile Image Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
              Profile Image
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Profile Photo <span className="text-red-500">*</span>
                </label>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    errors.profileImage
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="text-gray-500">
                    <svg
                      className="mx-auto h-12 w-12 mb-2"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-6-6h6m0 0v6m0-6l-9 9M6 42h36"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="text-sm font-medium">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs mt-1">PNG, JPG, GIF up to 5MB</p>
                  </div>
                </div>
                {errors.profileImage && (
                  <p className="mt-2 text-sm text-red-500">{errors.profileImage}</p>
                )}
              </div>

              {formData.profileImagePreview && (
                <div className="flex flex-col items-center justify-center">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Preview:
                  </p>
                  <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-300 shadow-md">
                    <img
                      src={formData.profileImagePreview}
                      alt="Profile Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleInputChange}
                className={`mt-1 h-4 w-4 rounded focus:ring-2 focus:ring-blue-500 ${
                  errors.agreeToTerms
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              <span className="ml-3 text-sm text-gray-600">
                 I agree to the{" "}
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Terms and Conditions
                </a>{" "}
                and{" "}
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Privacy Policy
                </a>
                <span className="text-red-500">*</span>
              </span>
            </label>
            {errors.agreeToTerms && (
              <p className="mt-2 text-sm text-red-500">{errors.agreeToTerms}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
            <button
              type="reset"
              className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Clear Form
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign In Here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
};

export default page;