"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "phone" | "otp" | "consent";

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export default function LoginForm({
  startAtConsent,
  demoOtp,
}: {
  startAtConsent: boolean;
  demoOtp: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(startAtConsent ? "consent" : "phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const input =
    "h-12 w-full rounded-xl border border-neutral-300 px-4 text-base outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100";
  const button =
    "h-12 w-full rounded-xl bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 disabled:opacity-50";

  async function run(fn: () => Promise<void>) {
    setError("");
    setLoading(true);
    try {
      await fn();
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const sendCode = () =>
    run(async () => {
      const r = await post("/api/auth/request-otp", { phone });
      if (!r.ok) return setError(r.data.error ?? "Could not send the code");
      setStep("otp");
    });

  const verify = () =>
    run(async () => {
      const r = await post("/api/auth/verify-otp", { phone, code });
      if (!r.ok) return setError(r.data.error ?? "Invalid code");
      if (r.data.consentNeeded) return setStep("consent");
      router.replace(r.data.role === "ACCOUNTS" ? "/dashboard" : "/home");
      router.refresh();
    });

  const consent = () =>
    run(async () => {
      const r = await post("/api/auth/consent", { accepted: true });
      if (!r.ok) return setError(r.data.error ?? "Could not save consent");
      router.replace("/home");
      router.refresh();
    });

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Fee Portal</h1>
          <p className="mt-1 text-base text-neutral-600">Sign in with your phone number</p>
        </div>

        <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">
          Demo mode: no SMS is sent. The OTP is <strong>{demoOtp}</strong>.
        </p>

        {step === "phone" && (
          <div className="space-y-4">
            <label className="block text-base font-medium text-neutral-800" htmlFor="phone">
              Phone number
            </label>
            <input
              id="phone"
              className={input}
              inputMode="numeric"
              maxLength={10}
              placeholder="10 digit number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            />
            <button className={button} disabled={loading || phone.length !== 10} onClick={sendCode}>
              {loading ? "Sending…" : "Send OTP"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <label className="block text-base font-medium text-neutral-800" htmlFor="otp">
              Enter the 6 digit OTP
            </label>
            <input
              id="otp"
              className={input}
              inputMode="numeric"
              maxLength={6}
              placeholder="6 digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <button className={button} disabled={loading || code.length !== 6} onClick={verify}>
              {loading ? "Checking…" : "Verify and continue"}
            </button>
            <button
              className="h-12 w-full text-base text-neutral-600 underline"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError("");
              }}
            >
              Use a different number
            </button>
          </div>
        )}

        {step === "consent" && (
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-base text-neutral-800">
              <input
                type="checkbox"
                className="mt-1 h-6 w-6 shrink-0 accent-indigo-600"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>I am the parent or guardian and consent to processing of my child&rsquo;s data.</span>
            </label>
            <button className={button} disabled={loading || !agreed} onClick={consent}>
              {loading ? "Saving…" : "Continue"}
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}