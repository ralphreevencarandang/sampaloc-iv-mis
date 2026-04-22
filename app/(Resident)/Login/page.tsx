"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useResidentAuth } from "@/components/providers/resident-auth-provider";
import { loginResidentAction } from "@/server/actions/auth.actions";
import { getZodFieldErrors, residentLoginSchema } from "@/validations/auth.validation";
import Image from "next/image";
import logo from '@/public/images/sampaloc-logo.png'

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, signIn } = useResidentAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  const loginMutation = useMutation({
    mutationFn: loginResidentAction,
    onSuccess: (result) => {
      if (!result.success) {
        setErrors(result.fieldErrors ?? { submit: result.message });
        return;
      }

      if (result.resident) {
        signIn(result.resident);
      }

      setErrors({});
      router.push("/");
      router.refresh();
    },
    onError: () => {
      setErrors({
        submit: "An unexpected error occurred while signing in.",
      });
    },
  });

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = residentLoginSchema.safeParse({
      email,
      password,
    });

    if (!parsed.success) {
      setErrors(getZodFieldErrors(parsed.error));
      return;
    }

    setErrors({});
    await loginMutation.mutateAsync(parsed.data);
  };

  return (
    <main className="py-10">
      <div className="max-container min-h-screen flex items-center justify-center bg-gray-50 padding-x py-12">
        <div className="max-w-md w-full space-y-8 rounded-xl border border-gray-100 bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              

              <Image className="w-auto h-auto" src={logo} alt="Logo" width={80} height={80} />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">Barangay Portal</h2>
            <p className="mt-2 text-sm text-gray-600">Please sign in to access your account</p>
          </div>

          {errors.submit && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errors.submit}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4 rounded-md">
              <div>
                <label htmlFor="email-address" className="mb-1 block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  className="relative block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  placeholder="juan.delacruz@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (errors.email || errors.submit) {
                      setErrors((current) => ({ ...current, email: "", submit: "" }));
                    }
                  }}
                />
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="relative block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  placeholder="********"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errors.password || errors.submit) {
                      setErrors((current) => ({ ...current, password: "", submit: "" }));
                    }
                  }}
                />
                {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="group relative flex w-full justify-center rounded-lg border border-transparent bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loginMutation.isPending ? "Signing In..." : "Sign In"}
              </button>
            </div>
          </form>

          <div className="pt-6">
            <div className="mb-3 text-center">
              <p className="text-sm text-gray-600">Don&apos;t have an account?</p>
            </div>
            <Link
              href="/register"
              className="block w-full rounded-lg border-2 border-primary-600 bg-primary-50 px-4 py-3 text-center font-semibold text-primary-600 transition-colors hover:bg-primary-100"
            >
              Create Account
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:underline">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
