"use client";

import { useState, type ComponentPropsWithRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { mobileNationalNumber } from "@/lib/resident-contact";

type InputProps = ComponentPropsWithRef<"input">;

export function PasswordInput({ className = "", ...props }: InputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${className} pr-12`} />
      <button
        type="button"
        aria-label={`${visible ? "Hide" : "Show"} ${props.name === "confirmPassword" ? "confirm password" : "password"}`}
        aria-pressed={visible}
        aria-controls={props.id}
        disabled={props.disabled}
        onClick={() => setVisible(current => !current)}
        className="absolute inset-y-0 right-0 flex min-h-11 w-11 items-center justify-center rounded-lg text-content-muted hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
      >
        {visible ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
      </button>
    </div>
  );
}

export function PhilippineMobileInput({ className = "", value, onChange, ...props }: InputProps) {
  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-content-muted">+63</span>
      <input
        {...props}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        aria-label={props["aria-label"] ?? "Philippine mobile number, +63 followed by 10 digits"}
        value={value ?? ""}
        maxLength={10}
        placeholder="9123456789"
        className={`${className} pl-12`}
        onChange={event => {
          event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10);
          onChange?.(event);
        }}
        onPaste={event => {
          const pasted = mobileNationalNumber(event.clipboardData.getData("text"));
          if (/^9\d{9}$/.test(pasted)) {
            event.preventDefault();
            // Use the native setter so React and RHF receive the same change event.
            const input = event.currentTarget;
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, pasted);
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }}
      />
    </div>
  );
}
