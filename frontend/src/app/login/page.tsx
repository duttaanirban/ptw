"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";

type LoginResponse = {
  token: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("requester@ptw.local");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const data = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      localStorage.setItem("ptw_token", data.token);

      if (data.user) {
        localStorage.setItem(
          "ptw_user",
          JSON.stringify(data.user)
        );
      }

      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-11 w-11 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
              PTW
            </div>

            <div>
              <h1 className="text-white font-semibold text-lg">
                Permit to Work
              </h1>
              <p className="text-slate-400 text-sm">
                Safety control center
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white">
            Welcome back
          </h2>

          <p className="text-slate-400 mt-2">
            Sign in to manage permits and approvals.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        >
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <div className="mt-6 border-t border-slate-800 pt-5">
            <p className="text-xs text-slate-500">
              Demo password: Password123!
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}