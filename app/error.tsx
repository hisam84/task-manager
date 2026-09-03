"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-[#222222] rounded-xl bg-[#0a0a0a] p-6 space-y-3">
        <h1 className="text-sm font-semibold">Something went wrong</h1>
        <p className="text-xs text-[#888888] font-mono">
          Please try again. If the problem continues, sign out and sign back in.
        </p>
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-lg bg-[#0070f3] text-xs text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
