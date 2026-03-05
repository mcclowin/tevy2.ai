"use client";

import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8">
      <div className="glass rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold mb-2">
            <span className="gradient-text">tevy2</span>
            <span className="text-[var(--muted)]">.ai</span>
          </div>
          <p className="text-[var(--muted)] text-sm">Log in to your marketing dashboard</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-[var(--muted)] mb-1 block">Email</label>
            <input
              className="input-field"
              type="email"
              placeholder="you@business.com"
            />
          </div>

          <button className="btn-primary w-full">
            Send magic link →
          </button>

          <p className="text-center text-sm text-[var(--muted)]">
            We&apos;ll send you a login link. No password needed.
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)] text-center">
          <p className="text-sm text-[var(--muted)]">
            Don&apos;t have an account?{" "}
            <Link href="/setup" className="text-[var(--accent-light)] hover:underline">
              Get started free
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-6">
        <span className="powered-badge">
          <span style={{ fontSize: "14px" }}>🐾</span> Powered by OpenClaw
        </span>
      </div>
    </div>
  );
}
