"use client"; // Required for useRouter and other client-side hooks

import Link from 'next/link';
import LandingPageChatInput from '@/components/LandingPage/LandingPageChatInput'; // Updated import
import { Button } from "@/components/ui/button";
import { Github, Zap, BarChartBig, BotMessageSquare } from "lucide-react";


export default function HomePage() {
  return (
    <div className="min-h-screen text-foreground font-sans flex flex-col items-center pt-16 md:pt-24 p-4 md:p-8 
                    bg-black 
                    bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
      

      
      <header className="mt-12 md:mt-20 mb-10 md:mb-16 text-center w-full max-w-4xl">
        <h1 className="text-4xl md:text-6xl font-bold text-slate-50 mb-4">
          Welcome to{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
            Buildie
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-300 mt-3 max-w-2xl mx-auto">
          Autopilot for building in public. Automatically generate content, and post on your socials with 1 click.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button asChild size="lg" className="bg-sky-600 hover:bg-sky-700 text-white px-8 py-3 text-base">
                <Link href="/signup">Get Started for Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white px-8 py-3 text-base">
                <Link href="https://github.com/your-org/buildie-docs-or-repo" target="_blank"> 
                    <Github className="w-4 h-4 mr-2" />
                    View on GitHub
                </Link>
            </Button>
        </div>
      </header>

      {/* Chat Input Section - More centered and prominent */}
      <div className="w-full max-w-2xl lg:max-w-3xl mb-12 md:mb-20">
        <p className="text-center text-slate-400 mb-3 text-sm">Try interacting with Buildie below (actions will prompt sign-up):</p>
        <LandingPageChatInput />
      </div>

      {/* Feature Highlight Section (Replaces Commit History) */}
      <div className="w-full max-w-5xl lg:max-w-6xl text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-semibold text-slate-100 mb-10 pb-3">
          Supercharge Your Workflow
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 hover:border-sky-500 transition-colors">
            <Zap className="w-10 h-10 text-sky-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-100 mb-2">Automated Updates</h3>
            <p className="text-slate-400 text-sm">
              Connect your repo and let Buildie automatically draft updates from your commit history.
            </p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 hover:border-sky-500 transition-colors">
            <BotMessageSquare className="w-10 h-10 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-100 mb-2">AI Content Generation</h3>
            <p className="text-slate-400 text-sm">
              Generate tweets, blog posts, and summaries with simple commands.
            </p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 hover:border-sky-500 transition-colors">
            <BarChartBig className="w-10 h-10 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-100 mb-2">Engagement Insights</h3>
            <p className="text-slate-400 text-sm">
              (Coming Soon) Understand your audience and track your project's reach.
            </p>
          </div>
        </div>
      </div>

      <footer className="w-full max-w-4xl text-center py-8 mt-auto">
        <p className="text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} Buildie. All rights reserved. {' '}
          <Link href="/privacy" className="hover:text-slate-300 hover:underline">Privacy Policy</Link> | {' '}
          <Link href="/terms" className="hover:text-slate-300 hover:underline">Terms of Service</Link>
        </p>
      </footer>
    </div>
  );
}
