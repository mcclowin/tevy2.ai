"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendMagicLink, getUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in (validate token with backend)
  useEffect(() => {
    getUser().then((user) => {
      if (user) router.push("/dashboard");
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    if (needsCode && !inviteCode.trim()) return;

    try {
      setError(null);
      setLoading(true);
      const result = await sendMagicLink(email, needsCode ? inviteCode.trim() : undefined);

      if (result.invite_code_required) {
        setNeedsCode(true);
        setLoading(false);
        return;
      }

      // Dev bypass: instant login, redirect to dashboard
      if (result.dev_bypass) {
        router.push("/dashboard");
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8">
      <div className="glass rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <img src="/logo-wizard.jpg" alt="tevy2" className="w-16 h-16 rounded-xl mx-auto mb-4" />
          <div className="text-2xl font-bold mb-2">
            <span className="gradient-text">tevy2</span>
            <span className="text-[var(--muted)]">.ai</span>
          </div>
          <p className="text-[var(--muted)] text-sm">Log in to your marketing dashboard</p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs bg-[var(--accent)]/20 text-[var(--accent-light)] border border-[var(--accent)]/30">
            Closed Beta
          </span>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="text-lg font-semibold mb-2">Check your email</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              We sent a magic link to <strong>{email}</strong>
            </p>
            <p className="text-xs text-[var(--muted)]">
              Click the link in the email to log in.
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-sm text-[var(--accent-light)] hover:underline mt-4"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-[var(--muted)] mb-1 block">Email</label>
              <input
                className="input-field"
                type="email"
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {needsCode && (
              <div>
                <label className="text-sm text-[var(--muted)] mb-1 block">Invite code</label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="Enter your invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-[var(--muted)] mt-1">
                  tevy2 is in closed beta. You need an invite code to sign up.
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={!email || !email.includes("@") || loading || (needsCode && !inviteCode.trim())}
            >
              {loading ? "Sending..." : "Send magic link →"}
            </button>

            <p className="text-center text-sm text-[var(--muted)]">
              We&apos;ll send you a login link. No password needed.
            </p>
          </form>
        )}

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
