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
    if (projectId && project) { // Only fetch if we have a valid project
      fetchProjectCommits(projectId, currentPage);
    }
    // Intentionally not adding `project` to dependencies to avoid re-fetch if project object reference changes but ID remains same.
    // `projectId` and `currentPage` are the main drivers for re-fetching commits.
  }, [projectId, currentPage, fetchProjectCommits]); // fetchProjectCommits added

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
  
  const isLoading = isLoadingProject || (project && isLoadingCommits);
  const totalPages = Math.ceil(totalCommits / commitsPerPage);

  return (
    <div className="min-h-screen text-foreground font-sans flex flex-col items-center pt-16 md:pt-24 p-4 md:p-8 
                    bg-black 
                    bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"
    >
      {/* 
        Ensure your global styles or ThemeProvider sets the base dark theme correctly.
        For example, your <html> tag should have class="dark".
        The bg-black provides a true black base, and the radial gradient adds the Lovable-like effect.
      */}
      
      <header className="mt-20 mb-10 md:mb-16 text-center w-full max-w-4xl">
        {/* Project Name Display */}
        {isLoading && !project && (
          <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
        )}
        {!isLoading && project && (
          <h1 className="text-4xl md:text-5xl font-bold text-slate-50 mb-3">
            {project.name}
          </h1>
        )}
        {!isLoading && !project && !projectError && !projectId && (
             <h1 className="text-4xl md:text-5xl font-bold text-slate-50 mb-3">
                Welcome to Buildie! 
             </h1>
        )}
        {!isLoading && projectError && (
          <p className="text-red-500 text-lg">Error: {projectError}</p>
        )}
        
        <h1 className="text-4xl md:text-5xl font-bold text-slate-50">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
            Buildie
          </span>
        </h1>
        <p className="text-lg text-slate-400 mt-3">
          {project ? `Managing: ${project.html_url}` : "Build in public, on autopilot."}
        </p>
      </header>

      {/* Chat Input Section - More centered and prominent */}
      <div className="w-full max-w-2xl lg:max-w-3xl mb-12 md:mb-16">
        <ChatInput />
      </div>

      {/* Commit History Section */}
      {project && (
        <div className="w-full max-w-4xl lg:max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-100 mb-6 pb-3 border-b border-slate-700">
            Project Activity for {project.name}
          </h2>
          {isLoadingCommits && <p className="text-slate-400">Loading commits...</p>}
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
      {!project && !isLoadingProject && !projectError && (
        <div className="text-center text-slate-400">
            <p>No project selected or loaded. </p>
            <p className="mt-2">Try creating a <a href="/projects/new" className="text-sky-500 hover:underline">new project</a>.</p>
        </div>
      )}
    </div>
  );
} 