"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-border rounded-xl bg-surface p-6 space-y-3">
        <h1 className="text-sm font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted">
          Please try again. If the problem continues, sign out and sign back in.
        </p>
        <button onClick={reset} className="btn-primary text-sm">
          Try again
        </button>
      </div>
    </div>
  );
}
