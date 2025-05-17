import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-8">
          Welcome to Build-in-Public Autopilot
        </h1>
        <p className="text-xl mb-12 text-slate-300">
          Automate your build-in-public journey.
        </p>
        <Link href="/login">
          <span className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 cursor-pointer">
            Get Started / Login
          </span>
        </Link>
      </div>
    </main>
  );
}
