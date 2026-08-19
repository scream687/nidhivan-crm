import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-neutral-400 mb-6">Page not found</p>
        <Link
          href="/"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors inline-block"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
