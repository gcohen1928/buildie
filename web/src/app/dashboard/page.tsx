"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ChatInput from '@/components/Dashboard/ChatInput';
import CommitHistoryTable, { Commit } from '@/components/Dashboard/CommitHistoryTable';
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Button } from "@/components/ui/button"; // For pagination buttons

// Type for project data fetched from API
interface ProjectData {
  id: string;
  name: string;
  html_url: string;
  description?: string;
}

// Type for commit data fetched from the new API endpoint
// Matches the CommitRead schema from the backend (FastAPI handles datetime to string conversion)
interface ApiCommit {
  id: string; // Corresponds to DB commit record UUID
  commit_sha: string;
  message?: string | null;
  author_name?: string | null;
  commit_timestamp: string; // FastAPI will serialize datetime to ISO string
  // Add other fields if your CommitHistoryTable expects them and map accordingly
}

// New type for the API response for commits
interface ApiCommitResponse {
  commits: ApiCommit[];
  total_commits: number;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(true);
  const [commitsError, setCommitsError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [commitsPerPage] = useState(10); // Or make this configurable
  const [totalCommits, setTotalCommits] = useState(0);

  // State for managing the generation view
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchProjectDetails = useCallback(async (currentProjectId: string) => {
    setIsLoadingProject(true);
    setProjectError(null);
    setProject(null); // Clear previous project details
    console.log(`Fetching project data for ID: ${currentProjectId}`);
    try {
      const res = await fetch(`http://localhost:8000/projects/${currentProjectId}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || `Failed to fetch project: ${res.statusText}`);
      }
      const data: ProjectData = await res.json();
      console.log("Project data fetched:", data);
      setProject(data);
      return data; // Return project data for chaining
    } catch (err: any) {
      console.error("Error fetching project details:", err);
      setProjectError(err.message || "An unknown error occurred while fetching project details.");
      setProject(null);
      throw err; // Re-throw to stop further processing in the main useEffect
    } finally {
      setIsLoadingProject(false);
    }
  }, []);


  const fetchProjectCommits = useCallback(async (currentProjectId: string, page: number) => {
    setIsLoadingCommits(true);
    setCommitsError(null);
    // Don't clear commits here, allow showing old commits while loading new page if preferred,
    // or clear them: setCommits([]); 
    console.log(`Fetching commits for project ID: ${currentProjectId}, page: ${page}`);
    
    const skip = (page - 1) * commitsPerPage;
    const limit = commitsPerPage;

    try {
      const res = await fetch(`http://localhost:8000/projects/${currentProjectId}/commits?skip=${skip}&limit=${limit}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || `Failed to fetch commits: ${res.statusText}`);
      }
      const commitDataResponse: ApiCommitResponse = await res.json();
      console.log("Commits data fetched:", commitDataResponse);

      const formattedCommits: Commit[] = commitDataResponse.commits.map(apiCommit => ({
        id: apiCommit.id,
        message: apiCommit.message || "No commit message",
        author: apiCommit.author_name || "Unknown Author",
        avatarUrl: `https://avatars.githubusercontent.com/u/1?s=40&v=4`, // Placeholder avatar
        date: new Date(apiCommit.commit_timestamp).toLocaleDateString(),
        sha: apiCommit.commit_sha.substring(0, 7),
        verified: false, // Placeholder
      }));
      setCommits(formattedCommits);
      setTotalCommits(commitDataResponse.total_commits);
    } catch (err: any) {
      console.error("Error fetching commits:", err);
      setCommitsError(err.message || "An unknown error occurred while fetching commits.");
      setCommits([]); // Clear commits on error
      setTotalCommits(0);
    } finally {
      setIsLoadingCommits(false);
    }
  }, [commitsPerPage]); // Added commitsPerPage dependency

  useEffect(() => {
    if (projectId) {
      // Reset states for new project ID
      setIsGenerating(false); // Ensure we are not in generation mode when project changes
      setCurrentPage(1); // Reset to first page for new project
      setCommits([]);
      setTotalCommits(0);
      
      fetchProjectDetails(projectId)
        .then((fetchedProject) => {
          if (fetchedProject) { // Only fetch commits if project details were successful
            fetchProjectCommits(fetchedProject.id, 1); // Fetch first page of commits
          }
        })
        .catch(() => {
          // Errors are handled within fetchProjectDetails,
          // just preventing unhandled promise rejection here
          setCommits([]);
          setTotalCommits(0);
          setIsLoadingCommits(false); // Ensure loading state is cleared
        });
    } else {
      console.log("No project ID in URL.");
      setProject(null);
      setCommits([]);
      setTotalCommits(0);
      setIsLoadingProject(false);
      setIsLoadingCommits(false);
      setProjectError(null);
      setCommitsError(null);
    }
  }, [projectId, fetchProjectDetails, fetchProjectCommits]); // fetchProjectCommits added

  // Effect for handling page changes
  useEffect(() => {
    if (projectId && project && !isGenerating) { // Only fetch if not generating
      fetchProjectCommits(projectId, currentPage);
    }
    // Intentionally not adding `project` to dependencies to avoid re-fetch if project object reference changes but ID remains same.
    // `projectId` and `currentPage` are the main drivers for re-fetching commits.
  }, [projectId, currentPage, fetchProjectCommits, project, isGenerating]); // Added project and isGenerating

  const handleNextPage = () => {
    if (currentPage * commitsPerPage < totalCommits) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prevPage => prevPage - 1);
    }
  };
  
  const handleSendMessage = (message: string) => {
    console.log("Message submitted to dashboard:", message);
    setIsGenerating(true);
    // TODO: Here you would typically make an API call to your backend
    // to start the LLM generation process with the given message.
    // For now, we just switch the view.
  };
  
  const isLoading = isLoadingProject || (project && isLoadingCommits);
  const totalPages = Math.ceil(totalCommits / commitsPerPage);

  // Placeholder for the new Generation In Progress View
  const GenerationInProgressView = () => (
    <div className="w-full max-w-4xl lg:max-w-6xl p-6 md:p-8 bg-slate-800/50 backdrop-blur-md rounded-lg shadow-2xl mt-16 mb-16 animate-fadeIn ring-1 ring-purple-500/30">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left sidebar (chat-like) */}
        <div className="w-full md:w-1/3 p-4 border border-slate-700 rounded-lg bg-slate-800/70">
          <h3 className="text-xl font-semibold text-slate-100 mb-4">Agent Interaction</h3>
          <div className="text-sm text-slate-300 mb-2">Your prompt:</div>
          <div className="p-2 mb-4 bg-slate-700 rounded text-slate-200 text-sm">
            "Create a tweet about the new feature X." {/* Placeholder for actual prompt */}
          </div>
          <div className="text-sm text-slate-300 mb-2">Chat History:</div>
          <div className="h-48 md:h-64 bg-slate-900/50 rounded p-2 overflow-y-auto text-xs text-slate-400">
            {/* Chat messages will go here */}
            <p>&gt; User: Create a tweet...</p>
            <p>&gt; Agent: Understood. Analyzing context...</p>
          </div>
        </div>

        {/* Main content area (LLM stream + tweet preview) */}
        <div className="w-full md:w-2/3 p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-100">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                Buildie is Working...
              </span>
            </h2>
            <svg className="animate-spin h-8 w-8 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>

          {/* LLM Stream of Thought */}
          <div className="mb-8 p-4 bg-slate-700/50 rounded-lg h-40 md:h-48 overflow-y-auto ring-1 ring-slate-600">
            <p className="text-sm text-slate-300 font-mono">[LOG] Initializing agent...</p>
            <p className="text-sm text-slate-300 font-mono mt-1">&gt; Analyzing commit data for project: {project?.name || 'current project'}...</p>
            <p className="text-sm text-slate-300 font-mono mt-1">&gt; Identifying key changes and messages...</p>
            <p className="text-sm text-slate-300 font-mono mt-1">&gt; Drafting tweet content based on findings...</p>
            <p className="text-sm text-slate-300 font-mono mt-1">&gt; Applying tone and style guidelines...</p>
            <p className="text-sm text-slate-300 font-mono mt-1">[LOG] Content generation in progress...</p>
          </div>

          {/* Tweet Preview (X-like) - Placeholder */}
          <h3 className="text-xl font-semibold text-slate-200 mb-3">Generated Post Preview</h3>
          <div className="p-4 border border-slate-600 rounded-lg bg-black shadow-lg"> {/* Mimic X dark theme more closely */}
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Skeleton className="h-10 w-10 rounded-full bg-slate-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-1">
                  <span className="font-semibold text-slate-100">Your Name</span> {/* Replace with actual user data */}
                  <span className="text-sm text-slate-500">@username</span>
                  <span className="text-sm text-slate-500">· Now</span>
                </div>
                <div className="mt-2 text-slate-200 whitespace-pre-wrap">
                  Excited to announce the launch of our new feature on {project?.name || 'the project'}! We've been working hard to bring you X, Y, and Z improvements. Check it out! 🚀
                  <br /><br />
                  #buildinpublic #{project?.name?.replace(/\\s+/g, '').toLowerCase() || 'dev'} #innovation
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <div className="flex space-x-5 text-slate-500">
                    {/* Icons should ideally be SVGs for better control */}
                    <button aria-label="Comment" className="hover:text-sky-500">💬 12</button>
                    <button aria-label="Retweet" className="hover:text-green-500">🔁 34</button>
                    <button aria-label="Like" className="hover:text-pink-500">❤️ 105</button>
                    <button aria-label="Share" className="hover:text-sky-500">🔗</button>
                  </div>
                  <Button className="bg-sky-500 hover:bg-sky-600 rounded-full px-4 py-1.5 text-sm font-bold text-white">Post</Button>
                </div>
              </div>
            </div>
          </div>
          
          <Button onClick={() => setIsGenerating(false)} className="mt-10 w-full md:w-auto" variant="outline">
            Cancel & Return to Dashboard
          </Button>
        </div>
      </div>
      
      {/* Commit history could be a collapsible section here or a tab */}
      {project && (
        <div className="mt-8 pt-6 border-t border-slate-700">
          <h4 className="text-lg font-semibold text-slate-200 mb-3">Recent Project Activity (Condensed)</h4>
          {isLoadingCommits && Array.from({ length: 3 }).map((_, i) => <Skeleton key={`condensed-commit-skeleton-${i}`} className="h-6 w-full mt-2 mb-1 rounded bg-slate-700/50" />)}
          {!isLoadingCommits && commits.slice(0, 3).map(commit => (
            <div key={commit.id} className="text-xs text-slate-400 p-2 bg-slate-700/30 rounded mb-1">
              <strong>{commit.sha}</strong>: {commit.message.substring(0, 60)}... by {commit.author} on {commit.date}
            </div>
          ))}
          {!isLoadingCommits && commits.length === 0 && <p className="text-xs text-slate-500">No recent commits to display here.</p>}
        </div>
      )}
    </div>
  );

  // Basic fadeIn animation definition (ensure your tailwind.config.js or global CSS has this)
  // For Tailwind, in tailwind.config.js:
  // theme: { extend: { keyframes: { fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } } }, animation: { fadeIn: 'fadeIn 0.5s ease-out' } } }

  return (
    <div className="min-h-screen text-foreground font-sans flex flex-col items-center pt-12 md:pt-16 p-4 md:p-6 
                    bg-black 
                    bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"
    >
      {isGenerating ? (
        <GenerationInProgressView />
      ) : (
        <>
          <header className="mt-12 md:mt-20 mb-10 md:mb-16 text-center w-full max-w-4xl">
            {/* Project Name Display */}
            {isLoadingProject && !project && (
              <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
            )}
            {!isLoadingProject && !project && !projectError && !projectId && (
                 <h1 className="text-4xl md:text-5xl font-bold text-slate-50 mb-3">
                    Welcome to Buildie! 
                 </h1>
            )}
            {!isLoadingProject && projectError && (
              <p className="text-red-500 text-lg">Error: {projectError}</p>
            )}
            
            <h1 className="text-5xl md:text-6xl font-bold text-slate-50 mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                Buildie
              </span>
            </h1>
            
            {project && (
              <div className="flex items-center justify-center space-x-2 text-slate-400 mt-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                <a href={project.html_url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-slate-300 transition-colors">
                  {project.html_url.replace('https://github.com/', '')}
                </a>
              </div>
            )}
            {!project && !isLoadingProject && !projectError && !projectId && (
              <p className="text-lg text-slate-400 mt-3">Build in public, on autopilot.</p>
            )}
          </header>

          {/* Chat Input Section - More centered and prominent */}
          <div className="w-full max-w-2xl lg:max-w-3xl mb-12 md:mb-16">
            <ChatInput onSendMessage={handleSendMessage} /> {/* Pass the handler */}
          </div>

          {/* Commit History Section */}
          {project && (
            <div className="w-full max-w-4xl lg:max-w-5xl">
              <h2 className="text-2xl md:text-3xl font-semibold text-slate-100 mb-6 pb-3 border-b border-slate-700">
                Project Activity for {project.name}
              </h2>
              {isLoadingCommits && 
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={`commit-skeleton-${i}`} className="h-12 w-full rounded bg-slate-700/50" />)}
                </div>
              }
              {!isLoadingCommits && commitsError && <p className="text-red-500">Error loading commits: {commitsError}</p>}
              {!isLoadingCommits && !commitsError && commits.length === 0 && totalCommits === 0 && <p className="text-slate-400">No commit activity found for this project.</p>}
              {!isLoadingCommits && !commitsError && (commits.length > 0 || totalCommits > 0) && (
                <>
                  <CommitHistoryTable commits={commits} />
                  {totalCommits > 0 && (
                    <div className="flex justify-between items-center mt-6">
                      <Button 
                        onClick={handlePreviousPage} 
                        disabled={currentPage <= 1 || isLoadingCommits}
                        variant="outline"
                      >
                        Previous
                      </Button>
                      <span className="text-slate-400">
                        Page {currentPage} of {totalPages} (Total: {totalCommits} commits)
                      </span>
                      <Button 
                        onClick={handleNextPage} 
                        disabled={currentPage >= totalPages || isLoadingCommits}
                        variant="outline"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {!project && !isLoadingProject && !projectError && projectId && ( // Show loading specific to project or error
             <div className="text-center text-slate-400">
                {isLoadingProject ? <p>Loading project details...</p> : <p>Could not load project.</p>}
             </div>
          )}
          {!project && !isLoadingProject && !projectError && !projectId && (
            <div className="text-center text-slate-400">
                <p>No project selected. </p>
                <p className="mt-2">Try selecting one or <a href="/projects" className="text-sky-500 hover:underline">view your projects</a>.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
} 