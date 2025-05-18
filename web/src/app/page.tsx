import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-5xl font-bold">
            Welcome to Build-in-Public Autopilot
          </h1>
          <p className="text-xl mt-4 text-slate-300">
            Automate your build-in-public journey.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/login">
            Get Started / Login
          </Link>
        </Button>
      </div>
    </main>
  );
}
