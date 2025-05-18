"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ChatInput from '@/components/Dashboard/ChatInput';
import CommitHistoryTable, { Commit } from '@/components/Dashboard/CommitHistoryTable';
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Button } from "@/components/ui/button"; // For pagination buttons
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, ArrowRight, Globe, Settings2, SearchCode, PenTool, AlertTriangle, Sparkles, Zap, Bot, Wand2, CheckCircle2 } from "lucide-react"; // Changed PowerPlug to Zap
import React from 'react'; // Ensure React is imported for JSX types
import { motion } from 'framer-motion'; // Import motion

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

// Props for GenerationInProgressView
interface GenerationInProgressViewProps {
  currentPrompt: string;
  llmStream: string[];
  isLlmProcessingComplete: boolean;
  generationError: string | null;
  currentProgressIcon: React.ReactNode | null;
  currentProgressText: string;
  generatedContent: string[] | null;
  editableTweetText: string;
  setEditableTweetText: (text: string) => void;
  onUseContent: () => void;
  onDoneOrCancel: () => void;
}

// Define GenerationInProgressView outside DashboardPage and wrap with React.memo
const GenerationInProgressView = React.memo<GenerationInProgressViewProps>((
  { 
    currentPrompt, 
    llmStream, 
    isLlmProcessingComplete, 
    generationError, 
    currentProgressIcon, 
    currentProgressText, 
    generatedContent,
    editableTweetText,
    setEditableTweetText,
    onUseContent,
    onDoneOrCancel
  }
) => {
  console.log("%%% GenerationInProgressView render %%%");
  return (
    <div className="w-full max-w-4xl lg:max-w-6xl p-6 md:p-8 bg-slate-800/50 backdrop-blur-md rounded-lg shadow-2xl mt-16 mb-16 animate-fadeIn ring-1 ring-purple-500/30">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left sidebar (Agent Interaction) */}
        <div className="w-full md:w-1/3 p-4 border border-slate-700 rounded-lg bg-slate-800/70">
          <h3 className="text-xl font-semibold text-slate-100 mb-4">Agent Interaction</h3>
          <div className="text-sm text-slate-300 mb-2">Your prompt:</div>
          <div className="p-3 mb-4 bg-slate-700 rounded text-slate-200 text-sm whitespace-pre-wrap break-words ring-1 ring-slate-600">
            {currentPrompt}
          </div>
          <div className="text-sm text-slate-300 mt-4 mb-2">Agent Log:</div>
          <div className="h-48 overflow-y-auto p-3 bg-slate-900/70 rounded ring-1 ring-slate-700 text-xs text-slate-400 space-y-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900/70">
            {llmStream.map((log, index) => (
              <div key={index} className="whitespace-pre-wrap break-words">{log}</div>
            ))}
            {llmStream.length === 0 && (
              <div className="text-slate-500 italic">Log will appear here...</div>
            )}
          </div>
        </div>

        {/* Main content area (Progress) */}
        <div className="w-full md:w-2/3 p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-100">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                {isLlmProcessingComplete ? (generationError ? "Generation Failed" : "Content Ready!") : "Buildie is Working..."}
              </span>
            </h2>
            {/* Icon next to title based on state */}
            {!isLlmProcessingComplete && currentProgressIcon ? (
              <div className="animate-pulse">{currentProgressIcon}</div>
            ) : isLlmProcessingComplete && generationError ? (
              <AlertTriangle className="h-8 w-8 text-red-500" />
            ) : isLlmProcessingComplete && !generationError ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : null}
          </div>

          {/* Main Progress Indicator */}
          {!isLlmProcessingComplete && (
            <motion.div
              className="flex flex-col items-center justify-center mb-8 p-4 bg-slate-700/30 rounded-lg h-40 md:h-48 ring-1 ring-slate-600"
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
            >
              {currentProgressIcon && (
                <motion.div
                  className="mb-3"
                  animate={{
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {currentProgressIcon}
                </motion.div>
              )}
              <motion.p
                className="text-lg text-slate-300 font-medium"
                animate={{
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2.2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {currentProgressText}
              </motion.p>
            </motion.div>
          )}
          
          {/* Generated Post Preview (X-like) - Re-integrating */}
          {isLlmProcessingComplete && (
            <motion.div 
              className="mt-8 animate-fadeIn" // Added animate-fadeIn from Framer Motion if preferred
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-semibold text-slate-100 mb-4">Generated Post Preview</h3>
              {generationError ? (
                <div className="p-4 border border-red-500/50 bg-red-500/10 rounded-lg text-red-400"><AlertTriangle className="inline h-5 w-5 mr-2" />Error: {generationError}</div>
              ) : generatedContent && generatedContent.length > 0 ? (
                <div className="p-4 border border-slate-600 rounded-lg bg-black shadow-lg">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {/* Placeholder for user avatar - ideally from auth context */}
                      <Skeleton className="h-10 w-10 rounded-full bg-slate-700" /> 
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-1 mb-2">
                        <span className="font-semibold text-slate-100">Your Name</span> {/* Replace with actual user data */}
                        <span className="text-sm text-slate-500">@username</span>
                        <span className="text-sm text-slate-500">· Now</span>
                      </div>
                      {/* Displaying tweet thread in a single editable Textarea */}
                      <Textarea
                        value={editableTweetText} 
                        onChange={(e) => {
                          setEditableTweetText(e.target.value);
                        }}
                        className="w-full bg-slate-800 border-slate-700 text-slate-200 text-sm font-mono resize-none focus:ring-purple-500 p-3 rounded min-h-[150px] h-auto"
                        placeholder="Edit generated content..."
                      />
                      <div className="mt-4 flex justify-between items-center">
                        <div className="flex space-x-5 text-slate-500">
                          <button aria-label="Comment" className="hover:text-sky-500 flex items-center space-x-1"><Paperclip size={14}/><span>0</span></button> 
                          <button aria-label="Retweet" className="hover:text-green-500 flex items-center space-x-1"><ArrowRight size={14}/><span>0</span></button> 
                          <button aria-label="Like" className="hover:text-pink-500 flex items-center space-x-1"><Globe size={14}/><span>0</span></button> 
                          <button aria-label="Share" className="hover:text-sky-500"><Paperclip size={14}/></button> 
                        </div>
                        <Button 
                          className="bg-sky-500 hover:bg-sky-600 rounded-full px-4 py-1.5 text-sm font-bold text-white"
                          onClick={onUseContent} 
                        >
                          Use This Content
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-slate-700 bg-slate-800/30 rounded-lg text-slate-400 italic">No content generated or an issue occurred.</div>
              )}
            </motion.div>
          )}

          <Button
            onClick={onDoneOrCancel}
            className="mt-10 w-full md:w-auto"
            variant="outline"
          >
            {isLlmProcessingComplete ? "Done / New Prompt" : "Cancel & Return to Dashboard"}
          </Button>
        </div>
      </div>
    </div>
  );
});
GenerationInProgressView.displayName = 'GenerationInProgressView'; // Good practice for debugging

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const startGeneratingFromUrl = searchParams.get("startGenerating");

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
  const [currentPrompt, setCurrentPrompt] = useState(""); // To store the user's current prompt
  const [llmStream, setLlmStream] = useState<string[]>([]); // To store LLM thought process (now for sidebar log)
  const [generatedContent, setGeneratedContent] = useState<string[] | null>(null); // To store final generated content (now string[] for tweets)
  const [generationError, setGenerationError] = useState<string | null>(null); // For API errors
  const [isLlmProcessingComplete, setIsLlmProcessingComplete] = useState(false); // To know when to show final content
  
  // New state for editable text in the tweet preview Textarea
  const [editableTweetText, setEditableTweetText] = useState<string>("");

  // New state for main progress display
  const [currentProgressText, setCurrentProgressText] = useState<string>("");
  const [currentProgressIcon, setCurrentProgressIcon] = useState<React.ReactNode | null>(null); // Changed to React.ReactNode

  // State to ensure auto-start from URL only happens once
  const [hasAutoStartedFromUrl, setHasAutoStartedFromUrl] = useState(false);

  // Define handlers before useEffects that might use them
  const handleSendMessage = useCallback(async (message: string) => {
    if (!projectId) {
      console.error("No project ID available to send message.");
      setGenerationError("Project ID is missing. Cannot generate content.");
      setCurrentProgressText("Error: Project ID missing");
      setCurrentProgressIcon(<AlertTriangle className="h-6 w-6 text-red-500" />);
      return;
    }

    console.log("Message submitted to dashboard:", message, "for project:", projectId);
    setIsGenerating(true);
    console.log("%%%%% handleSendMessage: Set isGenerating to true %%%%%");
    setCurrentPrompt(message);
    setLlmStream(["Agent session started..."]);
    setGeneratedContent(null);
    setGenerationError(null);
    setIsLlmProcessingComplete(false);

    const setProgress = (text: string, icon: React.ReactNode) => {
      setCurrentProgressText(text);
      setCurrentProgressIcon(icon);
      setLlmStream(prev => [...prev, text]);
    };

    try {
      setProgress("Initializing Agent...", <Settings2 className="h-6 w-6 text-purple-400 animate-spin-slow" />);
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const requestBody = {
        project_id: projectId,
        commits: [], 
        user_prompt: message,
      };

      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress("Connecting to Buildie Service...", <Zap className="h-6 w-6 text-purple-400 animate-pulse" />);
      setLlmStream(prev => [...prev, `📞 Calling generation service at ${apiUrl}/api/generate/demo`]);

      const response = await fetch(`${apiUrl}/api/generate/demo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      await new Promise(resolve => setTimeout(resolve, 500));
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown API error" }));
        setProgress("API Error Occurred", <AlertTriangle className="h-6 w-6 text-red-500" />);
        throw new Error(errorData.detail || `API Error: ${response.status} ${response.statusText}`);
      }
      
      setProgress("Processing Agent Response...", <Wand2 className="h-6 w-6 text-purple-400 animate-pulse" />); 
      const result = await response.json();
      setLlmStream(prev => [...prev, "✅ Agent responded! Formatting content..."]);
      
      if (result.tweet_thread && Array.isArray(result.tweet_thread)) {
        setGeneratedContent(result.tweet_thread);
        setEditableTweetText(result.tweet_thread.join("\n\n---\n\n"));
      } else {
        const errorMsg = "Error: Received unexpected content format from agent.";
        setGeneratedContent([errorMsg]);
        setEditableTweetText(errorMsg);
        console.warn("Unexpected tweet_thread format:", result);
      }
      setIsLlmProcessingComplete(true);
      setCurrentProgressText("Content Ready!");
      setCurrentProgressIcon(<CheckCircle2 className="h-6 w-6 text-green-500" />); 

    } catch (error: any) {
      console.error("Error calling generation API:", error);
      setGenerationError(error.message || "Failed to generate content.");
      setCurrentProgressText("Generation Failed");
      setCurrentProgressIcon(<AlertTriangle className="h-6 w-6 text-red-500" />);
      const errorMsg = `Error: ${error.message || "Failed to generate content."}`;
      setGeneratedContent([errorMsg]);
      setEditableTweetText(errorMsg);
      setIsLlmProcessingComplete(true); 
    }
  }, [projectId]); // projectId is a dependency for handleSendMessage

  const handleUseContent = useCallback(() => {
    const updatedContentArray = editableTweetText.split("\n\n---\n\n");
    setGeneratedContent(updatedContentArray);
    console.log("Using content (array):", updatedContentArray);
    console.log("Original editable text:", editableTweetText);
  }, [editableTweetText]);

  const handleDoneOrCancelGeneration = useCallback(() => {
    setIsGenerating(false);
    setLlmStream([]);
    setGeneratedContent(null);
    setCurrentPrompt("");
    setGenerationError(null); 
    setIsLlmProcessingComplete(false);
    setCurrentProgressText(""); 
    setCurrentProgressIcon(null); 
    setEditableTweetText("");
  }, []);

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

  // Effect 1: Handles projectId changes, loads project data, and resets states for new project
  useEffect(() => {
    if (projectId) {
      console.log(`New/changed projectId detected: ${projectId}. Resetting states.`);
      // Reset states that should change when projectId changes
      setIsGenerating(false); // Stop any ongoing generation for a previous project
      setCurrentPage(1);
      setCommits([]);
      setTotalCommits(0);
      setProject(null); // Clear previous project details before fetching new ones
      setProjectError(null);
      setCommitsError(null);
      setHasAutoStartedFromUrl(false); // Allow auto-start for the new project if params are present
      setIsLlmProcessingComplete(false);
      setCurrentPrompt("");
      setLlmStream([]);
      setGeneratedContent(null);
      setEditableTweetText("");

      fetchProjectDetails(projectId)
        .then((fetchedProject) => {
          if (fetchedProject) { // fetchProjectDetails now returns the project or throws
            fetchProjectCommits(fetchedProject.id, 1);
          } 
          // Auto-start logic is moved to a separate effect
        })
        .catch((err) => {
          // Errors are handled within fetchProjectDetails or fetchProjectCommits
          // Ensure loading states are false if things go wrong early
          setIsLoadingProject(false);
          setIsLoadingCommits(false);
          // projectError will be set by fetchProjectDetails
        });
    } else {
      // Cleanup if projectId becomes null (e.g., navigating away or invalid URL)
      console.log("No projectId in URL or projectId cleared.");
      setProject(null);
      setCommits([]);
      setTotalCommits(0);
      setIsLoadingProject(false);
      setIsLoadingCommits(false);
      setProjectError(null);
      setCommitsError(null);
      setIsGenerating(false);
      setHasAutoStartedFromUrl(false);
      setCurrentPrompt("");
      // etc. clear other relevant states
    }
  }, [projectId, fetchProjectDetails, fetchProjectCommits]); // Dependencies for project loading

  // Effect 2: Handles auto-starting generation based on URL params and loaded project
  useEffect(() => {
    if (
      project && // Ensure project data is loaded
      startGeneratingFromUrl === "true" &&
      !hasAutoStartedFromUrl && // Only run once per valid condition set
      !isGenerating // Don't interfere if already generating
    ) {
      console.log(
        `Auto-starting generation for project ${project.name} (ID: ${project.id}) due to startGenerating=true URL parameter.`
      );
      const defaultPrompt = `Generate a brief, engaging social media update about the latest developments or a cool feature in the project '${project.name}'. What's something exciting to share?`;
      handleSendMessage(defaultPrompt); // This will set isGenerating to true
      setHasAutoStartedFromUrl(true);   // Mark that auto-start has occurred for this load
    }
  }, [project, startGeneratingFromUrl, hasAutoStartedFromUrl, isGenerating, handleSendMessage]); // Dependencies for auto-start logic

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

  console.log("##### DashboardPage render, isGenerating state:", isGenerating);

  // Placeholder for the new Generation In Progress View
  // const GenerationInProgressView = () => ( ... MOVED OUTSIDE ... );

  return (
    <div className="min-h-screen text-foreground font-sans flex flex-col items-center pt-12 md:pt-16 p-4 md:p-6 
                    bg-black 
                    bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"
    >
      {isGenerating ? (
        <GenerationInProgressView 
          currentPrompt={currentPrompt}
          llmStream={llmStream}
          isLlmProcessingComplete={isLlmProcessingComplete}
          generationError={generationError}
          currentProgressIcon={currentProgressIcon}
          currentProgressText={currentProgressText}
          generatedContent={generatedContent} // This is string[] | null
          editableTweetText={editableTweetText}
          setEditableTweetText={setEditableTweetText} // Pass the setter directly
          onUseContent={handleUseContent}
          onDoneOrCancel={handleDoneOrCancelGeneration}
        />
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