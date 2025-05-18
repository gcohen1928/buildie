"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ChatInput from '@/components/Dashboard/ChatInput';
import CommitHistoryTable, { Commit } from '@/components/Dashboard/CommitHistoryTable';
import PreviousContentTable from '@/components/Dashboard/PreviousContentTable'; // Import the new table
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Button } from "@/components/ui/button"; // For pagination buttons
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Added Tabs
import { Badge } from "@/components/ui/badge"; // Added Badge
import { Paperclip, ArrowRight, Globe, Settings2, SearchCode, PenTool, AlertTriangle, Sparkles, Zap, Bot, Wand2, CheckCircle2, Github, DownloadCloud, GitCommit, LayoutDashboard, Loader2, GitFork, ListChecks, FileText, X, PlayCircle } from "lucide-react"; // Changed PowerPlug to Zap and added X icon, Added PlayCircle
import React from 'react'; // Ensure React is imported for JSX types
import { motion, AnimatePresence } from 'framer-motion'; // Import motion and AnimatePresence

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

// Props for AnimatedTypingText
interface AnimatedTypingTextProps {
  fullText: string;
  charTypingDelay?: number; // Delay between each character in seconds
  className?: string;
}

const AnimatedTypingText: React.FC<AnimatedTypingTextProps> = ({ fullText, charTypingDelay = 0.02, className }) => {
  const characters = Array.from(fullText);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: charTypingDelay, delayChildren: 0.05 },
    },
  };

  const charVariants = {
    hidden: {
      opacity: 0,
      y: 8, 
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 15,
        stiffness: 200,
      },
    },
  };

  return (
    <motion.div
      className={className} // Apply className here for styling the container (e.g., text color/size)
      style={{ display: 'flex', flexWrap: 'wrap', whiteSpace: 'pre-wrap' }} // Allow wrapping and preserve spaces/newlines
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      key={fullText} // Re-trigger animation when fullText changes
    >
      {characters.map((char, index) => (
        <motion.span key={`${char}-${index}`} variants={charVariants} style={{ minHeight: '1em' /* Prevent jitter for empty chars */}}>
          {char === ' ' ? '\u00A0' : char} 
        </motion.span>
      ))}
    </motion.div>
  );
};

// Props for GenerationInProgressView
interface GenerationInProgressViewProps {
  currentPrompt: string;
  llmStream: string[];
  isLlmProcessingComplete: boolean;
  generationError: string | null;
  currentStepIcon: React.ReactNode | null;
  currentStepTitle: string;
  currentStepDetail: string;
  generatedContent: string[] | null;
  setGeneratedContent: (content: string[] | null) => void;
  editableTweetText: string;
  setEditableTweetText: (text: string) => void;
  onUseContent: () => void;
  onDoneOrCancel: () => void;
  isPostingToTwitter: boolean;
  twitterPostResult: { success: boolean; message: string; tweetUrl?: string; postedTweets?: Array<{id: string; text: string; url: string}> } | null;
}

// Define GenerationInProgressView outside DashboardPage and wrap with React.memo
const GenerationInProgressView = React.memo<GenerationInProgressViewProps>((
  { 
    currentPrompt, 
    llmStream, 
    isLlmProcessingComplete, 
    generationError, 
    currentStepIcon, 
    currentStepTitle,
    currentStepDetail,
    generatedContent,
    setGeneratedContent,
    editableTweetText,
    setEditableTweetText,
    onUseContent,
    onDoneOrCancel,
    isPostingToTwitter,
    twitterPostResult
  }
) => {
  console.log("%%% GenerationInProgressView render %%%", currentStepTitle, currentStepDetail);
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
            {isLlmProcessingComplete && generationError ? (
              <AlertTriangle className="h-8 w-8 text-red-500" />
            ) : isLlmProcessingComplete && !generationError ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : null}
          </div>

          {/* Main Progress Indicator - Icon, Static Title, Animated Detail Text */}
          {!isLlmProcessingComplete && (
            <motion.div
              className="flex flex-col items-center justify-center mb-8 p-4 bg-slate-700/30 rounded-lg min-h-[200px] md:min-h-[240px] ring-1 ring-slate-600"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStepTitle} // Key change triggers animation for the whole block
                  className="flex flex-col items-center w-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  {currentStepIcon && (
                    <motion.div 
                      className="mb-3 md:mb-4"
                      initial={{ scale: 0.5, opacity: 0}}
                      animate={{ scale: 1, opacity: 1}}
                      transition={{ duration: 0.4, delay: 0.1, ease: "backOut"}}
                    >
                      {currentStepIcon}
                    </motion.div>
                  )}
                  <h3 className="text-xl md:text-2xl text-slate-100 font-semibold mb-2 md:mb-3 text-center">
                    {currentStepTitle}
                  </h3>
                  <AnimatePresence mode="wait">
                    <motion.div // Using motion.div as a wrapper for the paragraph to handle key and animations for detail changes
                      key={currentStepDetail} // Animate when detail text changes
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5, transition: { duration: 0.2 } }} // Smooth fade out for old text
                      className="w-full"
                    >
                      <p className="text-xs md:text-sm text-slate-400/70 text-center min-h-[50px] md:min-h-[70px] w-full px-2 leading-snug flex items-center justify-center">
                        {currentStepDetail && <AnimatedTypingText fullText={currentStepDetail} charTypingDelay={0.008} className="text-slate-400/80" />}
                        {!currentStepDetail && <span className="italic text-slate-500">Processing...</span>} {/* Fallback for empty detail */}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
          
          {/* Generated Post Preview (X-like) */}
          {isLlmProcessingComplete && (
            <motion.div 
              className="mt-8 animate-fadeIn"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-semibold text-slate-100 mb-4">Generated Post Preview</h3>
              {generationError ? (
                <div className="p-4 border border-red-500/50 bg-red-500/10 rounded-lg text-red-400"><AlertTriangle className="inline h-5 w-5 mr-2" />Error: {generationError}</div>
              ) : generatedContent && generatedContent.length > 0 ? (
                <div className="p-4 border border-slate-600 rounded-lg bg-black shadow-lg">
                  {/* New Threaded View */}
                  <div className="space-y-0"> {/* Container for all tweets */}
                    {generatedContent.map((tweetText, index) => {
                      const videoPlaceholderMatch = tweetText.match(/\[Video:(.*?)\]/);
                      const hasVideo = index === 0 && videoPlaceholderMatch;
                      const cleanTweetText = tweetText.replace(/\[Video:.*?\]/g, '').trim();
                      const videoPath = videoPlaceholderMatch?.[1].trim();

                      return (
                        <div key={index} className="flex space-x-3">
                          {/* Left column for Avatar and Connecting Line */}
                          <div className="flex flex-col items-center pt-1"> {/* Added pt-1 to align avatar with text better */}
                            {/* <Skeleton className="h-10 w-10 rounded-full bg-slate-700 flex-shrink-0" /> */}
                            <img src="/gabe-avatar.png" alt="User Avatar" className="h-10 w-10 rounded-full flex-shrink-0 object-cover" />
                            {/* Vertical line connecting tweets, if not the last tweet */}
                            {index < generatedContent.length - 1 && (
                              <div className="w-0.5 flex-grow bg-slate-600 my-1.5 rounded-full"></div>
                            )}
                          </div>

                          {/* Right column for Tweet Content */}
                          <div className={`flex-1 ${index < generatedContent.length - 1 ? 'pb-5' : 'pb-1'}`}>
                            <div className="flex items-center space-x-1.5 mb-1">
                              <span className="font-semibold text-slate-100 text-sm">Gabe</span>
                              <span className="text-xs text-slate-500">@glenomenagabe</span>
                              <span className="text-xs text-slate-500">· Now</span>
                            </div>
                            
                            <Textarea
                              value={cleanTweetText} 
                              onChange={(e) => {
                                const newText = e.target.value;
                                const newGeneratedContent = generatedContent.map((content, idx) => {
                                  if (idx === index) {
                                    // If it's the first tweet and it originally had a video, preserve the video tag.
                                    const originalTweet = generatedContent[index]; 
                                    const videoMatch = originalTweet.match(/\[Video:(.*?)\]/);
                                    if (index === 0 && videoMatch) {
                                      return `${newText.trim()} ${videoMatch[0]}`;
                                    }
                                    return newText;
                                  }
                                  return content;
                                });
                                setGeneratedContent(newGeneratedContent);
                                setEditableTweetText(newGeneratedContent.join("\n\n---\n\n"));
                              }}
                              className="w-full bg-slate-900/80 border-slate-700 text-slate-200 text-sm resize-none focus:ring-purple-500 focus:border-purple-500 p-2.5 rounded-md min-h-[100px] h-auto placeholder:text-slate-500 transition-colors duration-150 ease-in-out shadow-sm hover:bg-slate-800/90 focus:bg-slate-900"
                              placeholder={`Edit tweet ${index + 1}...`}
                            />

                            {hasVideo && videoPath && (
                              <div className="mt-2.5 mb-1 border border-slate-700 bg-slate-800/50 rounded-lg overflow-hidden shadow-md">
                                <div className="aspect-video flex flex-col items-center justify-center text-slate-400 p-2">
                                  <PlayCircle className="h-10 w-10 md:h-12 md:w-12 mb-1.5 text-slate-500" />
                                  <span className="text-xs md:text-sm">Video Preview</span>
                                  <span className="text-xs text-slate-600 mt-0.5 truncate max-w-full px-2">(mock: {videoPath})</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Action icons */}
                            <div className="flex space-x-5 text-slate-500 mt-3">
                              <button aria-label="Comment" className="hover:text-sky-400 flex items-center space-x-1 transition-colors">
                                <Paperclip size={16}/>
                              </button> 
                              <button aria-label="Retweet" className="hover:text-emerald-400 flex items-center space-x-1 transition-colors">
                                <ArrowRight size={16}/>
                              </button> 
                              <button aria-label="Like" className="hover:text-pink-400 flex items-center space-x-1 transition-colors">
                                <Globe size={16}/>
                              </button> 
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* "Use This Content" Button - now appears after the thread */}
                  <div className="mt-8 flex justify-end items-center gap-4">
                    {twitterPostResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-sm p-2.5 rounded-md ${
                          twitterPostResult.success ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/30' : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
                        }`}
                      >
                        {twitterPostResult.message}
                        {twitterPostResult.success && twitterPostResult.postedTweets && twitterPostResult.postedTweets[0]?.url && (
                          <a
                            href={twitterPostResult.postedTweets[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 underline hover:text-green-300"
                          >
                            View Tweet
                          </a>
                        )}
                      </motion.div>
                    )}
                    <Button 
                      className="bg-sky-500 hover:bg-sky-600 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                      onClick={onUseContent}
                      disabled={isPostingToTwitter || (twitterPostResult?.success ?? false)}
                    >
                      {isPostingToTwitter ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Posting to Twitter...
                        </>
                      ) : twitterPostResult?.success ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Posted!
                        </>
                      ) : (
                        "Post to Twitter" // Changed button text
                      )}
                    </Button>
                  </div>
                  
                  {/* Optional: Textarea for editing the full thread string, if desired for debugging or direct manipulation */}
                  {/* <Textarea
                    value={editableTweetText} 
                    onChange={(e) => {
                      setEditableTweetText(e.target.value);
                    }}
                    className="mt-4 w-full bg-slate-900 border-slate-700 text-slate-300 text-xs font-mono resize-none focus:ring-purple-600 p-2.5 rounded-md min-h-[100px] h-auto"
                    placeholder="Raw tweet thread text for editing..."
                  /> */}
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
GenerationInProgressView.displayName = 'GenerationInProgressView'; 

// New Project Indexing View Component
interface ProjectIndexingViewProps {
  onIndexingComplete: () => void;
  projectName: string | undefined;
}

const indexingSteps = [
  { key: 'connect_github', message: "Connecting to your GitHub repository", icon: <Github className="h-10 w-10 text-purple-400" /> },
  { key: 'clone_repo', message: "Cloning repository to analyze", icon: <DownloadCloud className="h-10 w-10 text-purple-400" /> },
  { key: 'analyze_commits', message: "Analyzing commit history", icon: <GitCommit className="h-10 w-10 text-purple-400" /> },
  { key: 'index_code', message: "Indexing code structure", icon: <SearchCode className="h-10 w-10 text-purple-400" /> },
  { key: 'setup_dashboard', message: "Setting up your Buildie dashboard", icon: <LayoutDashboard className="h-10 w-10 text-purple-400" /> },
  { key: 'almost_done', message: "Finalizing setup", icon: <Sparkles className="h-10 w-10 text-purple-400" /> },
];

const ProjectIndexingView: React.FC<ProjectIndexingViewProps> = ({ onIndexingComplete, projectName }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dots, setDots] = useState("");

  const currentStep = indexingSteps[currentStepIndex];
  const displayProjectName = projectName || "your new project";

  useEffect(() => {
    if (currentStepIndex < indexingSteps.length) {
      const timer = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, 2500); // Adjust timing for demo (2.5 seconds per step)
      return () => clearTimeout(timer);
    } else {
      const finalTimer = setTimeout(() => {
        onIndexingComplete();
      }, 2000); // Show final "Ready" message for 2s
      return () => clearTimeout(finalTimer);
    }
  }, [currentStepIndex, onIndexingComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  if (currentStepIndex >= indexingSteps.length) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-md flex flex-col items-center justify-center z-[100] animate-fadeIn">
        <motion.div 
          className="bg-slate-800 p-8 md:p-12 rounded-xl shadow-2xl text-center ring-1 ring-purple-500/60 max-w-lg w-11/12"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "backOut" }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness: 150 }}
          >
            <CheckCircle2 className="h-16 w-16 md:h-20 md:w-20 text-green-400 mx-auto mb-6" />
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
            Project <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">{displayProjectName}</span> is Ready!
          </h2>
          <p className="text-slate-300 text-lg mb-6">Your dashboard is now set up.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-md flex flex-col items-center justify-center z-[100] p-4">
      {/* Main card - animates in once */}
      <motion.div 
        className="bg-slate-800 p-8 md:p-10 rounded-xl shadow-2xl text-center ring-1 ring-purple-500/60 max-w-lg w-11/12"
        initial={{ opacity: 0, y: 30, scale: 0.95 }} // Initial animation for the card itself
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.key + '_icon'} // Key changes for icon to re-animate
            className="mb-6 mx-auto w-fit"
            initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
            animate={{ 
              opacity: 1, 
              scale: [1, 1.08, 1, 1.08, 1], // Existing pulse
              rotate: [0, 2, -2, 2, 0],      // Existing subtle rotate
            }}
            exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            {React.cloneElement(currentStep.icon, {className: "h-10 w-10 md:h-12 md:w-12 text-purple-400"})}
          </motion.div>
        </AnimatePresence>

        <h2 className="text-xl md:text-2xl font-semibold text-slate-100 mb-3">
          Setting up <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">{displayProjectName}</span>
        </h2>
        
        <AnimatePresence mode="wait">
          <motion.p 
            key={currentStep.key + '_message'} // Key changes for message to re-animate
            className="text-md md:text-lg text-slate-300 min-h-[2.5em] mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {currentStep.message}{dots}
          </motion.p>
        </AnimatePresence>

        <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
          <motion.div 
            className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 h-2.5 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStepIndex + 1) / (indexingSteps.length + 1)) * 100}%` }} 
            transition={{ duration: 0.6, ease: "circOut" }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-3 tracking-wider">
          STEP {currentStepIndex + 1} OF {indexingSteps.length}
        </p>
      </motion.div>
    </div>
  );
};
ProjectIndexingView.displayName = 'ProjectIndexingView';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter(); // Initialize useRouter
  const projectId = searchParams.get("projectId");
  const startGeneratingFromUrl = searchParams.get("startGenerating");
  const isIndexingFromUrl = searchParams.get("isIndexing"); // Read new param

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
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [llmStream, setLlmStream] = useState<string[]>([]);
  const [generatedContent, setGeneratedContent] = useState<string[] | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isLlmProcessingComplete, setIsLlmProcessingComplete] = useState(false);
  
  const [editableTweetText, setEditableTweetText] = useState<string>("");

  // New states for step-by-step progress display
  const [currentStepIcon, setCurrentStepIcon] = useState<React.ReactNode | null>(null);
  const [currentStepTitle, setCurrentStepTitle] = useState<string>("");
  const [currentStepDetail, setCurrentStepDetail] = useState<string>("");

  // State to ensure auto-start from URL only happens once
  const [hasAutoStartedFromUrl, setHasAutoStartedFromUrl] = useState(false);

  // Ref to manage the icon displayed for a group of steps with the same title
  const activeDisplayGroupRef = useRef<{ title: string | null; icon: React.ReactNode | null }>({ title: null, icon: null });

  // New state for active tab view
  const [activeTab, setActiveTab] = useState("activity");

  // New state for initial project indexing
  const [isInitialIndexing, setIsInitialIndexing] = useState(false);

  // Placeholder state and fetch function for previous content
  // TODO: Define actual structure for PreviousContentItem
  interface PreviousContentItem {
    id: string;
    contentSummary: string;
    platform: string;
    dateGenerated: string;
    performance: {
      views?: number;
      likes?: number;
      shares?: number;
    };
    directLink?: string; // Added for the "View Post" button
    // New fields for account display
    accountName?: string;
    accountHandle?: string;
    avatarUrl?: string;
  }
  const [previousContent, setPreviousContent] = useState<PreviousContentItem[]>([]);
  const [isLoadingPreviousContent, setIsLoadingPreviousContent] = useState(false);
  const [previousContentError, setPreviousContentError] = useState<string | null>(null);

  // New state for selected commits
  const [selectedCommitShas, setSelectedCommitShas] = useState<string[]>([]);

  // State for Twitter posting
  const [isPostingToTwitter, setIsPostingToTwitter] = useState(false);
  const [twitterPostResult, setTwitterPostResult] = useState<{ success: boolean; message: string; tweetUrl?: string; postedTweets?: Array<{id: string; text: string; url: string}> } | null>(null);
  const [didJustPost, setDidJustPost] = useState(false); // Flag to control fetchPreviousContent
  
  // Function to return to dashboard view
  const returnToDashboard = useCallback(() => {
    setIsGenerating(false);
    setLlmStream([]);
    setGeneratedContent(null);
    setCurrentPrompt("");
    setGenerationError(null); 
    setIsLlmProcessingComplete(false);
    activeDisplayGroupRef.current = { title: null, icon: null }; 
    setCurrentStepIcon(null);
    setCurrentStepTitle("");
    setCurrentStepDetail("");
    // We don't reset twitterPostResult here so it's available in dashboard
  }, []);

  // Define handlers before useEffects that might use them
  const handleSendMessage = useCallback(async (message: string) => {
    if (!projectId) {
      console.error("No project ID available to send message.");
      setGenerationError("Project ID is missing. Cannot generate content.");
      setCurrentStepTitle("Error");
      setCurrentStepDetail("Project ID is missing. Cannot generate content.");
      setCurrentStepIcon(<AlertTriangle className="h-8 w-8 text-red-500" />); 
      return;
    }

    console.log("Message submitted to dashboard:", message, "for project:", projectId);
    setIsGenerating(true);
    setCurrentPrompt(message);
    setLlmStream(["Agent session initialized..."]);
    setGeneratedContent(null);
    setGenerationError(null);
    setIsLlmProcessingComplete(false);
    setCurrentStepIcon(null);
    setCurrentStepTitle("");
    setCurrentStepDetail("");

    const updateStep = (icon: React.ReactNode, title: string, detail: string, logMessage?: string) => {
      // Logic for conditional icon update
      if (title !== activeDisplayGroupRef.current.title || activeDisplayGroupRef.current.title === null) {
        setCurrentStepIcon(icon);
        activeDisplayGroupRef.current = { title, icon };
      } else {
        // Title is the same, ensure we use the stored icon for this group, not necessarily the one passed in
        // (in case chainOfThoughtSteps defines a different icon for a sub-step with the same title)
        setCurrentStepIcon(activeDisplayGroupRef.current.icon);
      }

      setCurrentStepTitle(title);
      setCurrentStepDetail(detail);
      setLlmStream(prev => [...prev, logMessage || `${title}: ${detail.substring(0,70)}...`]);
    };
    
    const userPromptSnippet = message.length > 60 ? message.substring(0, 57) + "..." : message;
    const projectNameForDisplay = project?.name || "project context";

    const chainOfThoughtSteps = [
      // Step 1: RAG Search & Browser Prompt Generation (multiple sub-details)
      {
        icon: <SearchCode className="h-8 w-8 text-slate-400" />,
        title: "RAG Search & Prompt Generation",
        detail: "Scanning recent commit diffs for the 'Project Import & Indexing' feature. Generating embeddings for changed code blocks (e.g., `ProjectIndexingView.tsx`, `api/projects/routes.py`). Initiating similarity search across the indexed codebase vectors...",
        duration: 1200, // Adjusted for cutoff
        log: "RAGAgent: Analyzing diffs and generating embeddings for similarity search."
      },
      {
        icon: <SearchCode className="h-8 w-8 text-slate-400 filter hue-rotate-15" />, // Slightly different icon look
        title: "RAG Search & Prompt Generation",
        detail: "Retrieved relevant code chunks: Main UI logic in `ProjectIndexingView.tsx` showing loading states, backend API endpoints in `api/projects/routes.py` handling the clone and parse. These are key for demonstrating the feature.",
        duration: 1000, // Adjusted for cutoff
        log: "RAGAgent: Key code sections identified for feature demonstration context."
      },
      {
        icon: <FileText className="h-8 w-8 text-slate-400" />,
        title: "RAG Search & Prompt Generation",
        detail: "Synthesizing findings from code analysis. Constructing a focused natural language prompt for the Browser Automation Agent to accurately navigate and showcase the new project indexing user flow. Prompt: 'Record a video of importing a new project, showing the full indexing process and successful dashboard setup.'",
        duration: 1500, // Adjusted for cutoff
        log: "RAGAgent: Browser agent prompt generated based on code analysis."
      },
      // Step 2: Automated Feature Recording
      {
        icon: <Github className="h-8 w-8 text-slate-400" />,
        title: "Automated Feature Recording",
        detail: "Requesting ephemeral test environment. Spinning up a Docker container (buildie-app:latest) with the most recent build. Waiting for services to be healthy...",
        duration: 1000, // Adjusted for cutoff
        log: "InfraManager: Test environment provisioned, container starting."
      },
      {
        icon: <PlayCircle className="h-8 w-8 text-slate-400" />,
        title: "Automated Feature Recording",
        detail: "Launching Playwright browser agent. Executing automated script to showcase the project import. This will capture a 10-second video of the complete user flow: [Login > Dashboard > Import > Indexing > Success]...",
        duration: 10000, // Increased to 10 seconds for this specific step
        log: "BrowserAgent: Playwright script initiated for a 10-second video capture."
      },
      {
        icon: <DownloadCloud className="h-8 w-8 text-slate-400" />,
        title: "Automated Feature Recording",
        detail: "10-second video recording successful. Dimensions: 1920x1080. Uploading `project-indexing-demo-10s.mp4` to secure media storage. Initiating transcoding for web optimization (H.264, AAC).",
        duration: 1200, // Adjusted for cutoff
        log: "MediaService: 10s video captured, uploaded, and transcoding started."
      },
      // Step 3: AI Content Drafting
      {
        icon: <Bot className="h-8 w-8 text-slate-400" />,
        title: "AI Content Drafting",
        detail: "Contextualizing for content generation: New feature is 'Project Import & Indexing', video is ready (`project-indexing-demo.mp4`). Target Audience: Developers, #buildinpublic. Goal: Announce feature, highlight ease-of-use & automation.",
        duration: 1200, // Adjusted for cutoff
        log: "ContentAI: Context established for tweet generation."
      },
      {
        icon: <Wand2 className="h-8 w-8 text-slate-400" />,
        title: "AI Content Drafting",
        detail: "Generating initial tweet thread drafts. Iteration 1: Focus on speed. Iteration 2: Focus on visual appeal with video. Iteration 3: Combining clarity, engagement, and a non-cringey tone. Ensuring video is referenced appropriately.",
        duration: 1400, // Adjusted for cutoff
        log: "ContentAI: Iteratively drafting tweet thread options."
      },
      {
        icon: <ListChecks className="h-8 w-8 text-emerald-400" />, // Success indication
        title: "AI Content Drafting",
        detail: "Refining the best draft. Ensuring the video is clearly signposted in the first tweet. Adding relevant hashtags (#buildinpublic, #devtool, #automation, #opensource, #ai). Final content package ready for user review.",
        duration: 1200, // Adjusted for cutoff
        log: "ContentAI: Final tweet thread polished and ready."
      },
    ];

    try {
      for (const step of chainOfThoughtSteps) {
        updateStep(activeDisplayGroupRef.current.icon || step.icon, step.title, step.detail, step.log); // Use active group icon if title matches, else new step icon
        
        // Use the step's defined duration directly to allow for text cutoff
        await new Promise(resolve => setTimeout(resolve, step.duration));

        if (!isGeneratingRef.current) {
          console.log("Generation cancelled during thought process.");
          return;
        }
      }
      
      updateStep(<Zap className="h-8 w-8 text-slate-400" />, "Secure Handoff to Service", "Transmitting validated prompt and context hash to Buildie Generation Core. Awaiting encrypted response payload...", "CommsModule: Transmitting to Generation Core...");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const requestBody = {
        project_id: projectId,
        commits: selectedCommitShas, // Updated to include selected commit SHAs
        user_prompt: message,
      };
      setLlmStream(prev => [...prev, `📞 Calling generation endpoint: ${apiUrl}/api/generate/demo with commits: ${selectedCommitShas.join(', ') || 'none'}`]);
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network latency for API call

      // Simulate API response for the new scenario
      // const response = await fetch(`${apiUrl}/api/generate/demo`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(requestBody),
      // });
      
      if (!isGeneratingRef.current) return;

      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => ({ detail: "Unknown API error" }));
      //   updateStep(<AlertTriangle className="h-8 w-8 text-red-500" />, "API Error", errorData.detail || `Service request failed: ${response.status}`, `Agent: API Error - ${errorData.detail || response.statusText}`);
      //   throw new Error(errorData.detail || `API Error: ${response.status} ${response.statusText}`);
      // }
      
      updateStep(<Wand2 className="h-8 w-8 text-emerald-500" />, "Processing & Crafting Content", "Successfully simulated agent analysis. Formatting the generated content for your review...", "Agent: Formatting final output..."); 
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      // const result = await response.json(); // No actual API call, direct content set below
      
      const newTweetThread = [
        "Just shipped a cool new way to get started with Buildie! 🚀 Now you can easily import your GitHub projects, and we'll automagically index your codebase & commit history. Check out this quick walkthrough of the new indexing flow in action! 👇 #buildinpublic #devtool #automation [Video: /static/videos/project-indexing-demo.mp4]",
        "This means a smoother onboarding and Buildie gets all the context it needs right from the get-go to help you create awesome content about your dev journey. Less setup, more building (and sharing!). What do you think? Full steam ahead! 🚂 #opensource #ai"
      ];

      setGeneratedContent(newTweetThread);
      setEditableTweetText(newTweetThread.join("\n\n---\n\n"));
      setLlmStream(prev => [...prev, "👍 Agent crafted a new tweet thread! Content received and parsed."]);
      setIsLlmProcessingComplete(true);
      setTwitterPostResult(null); // Reset any previous post result when new content is generated

    } catch (error: any) {
      if (!isGeneratingRef.current) {
        console.log("Generation error handling skipped due to cancellation.");
        return;
      }
      console.error("Error calling generation API:", error);
      setGenerationError(error.message || "Failed to generate content.");
      // Ensure the final error state is shown in the new structure
      setCurrentStepIcon(<AlertTriangle className="h-8 w-8 text-red-500" />); 
      setCurrentStepTitle("Generation Failed");
      setCurrentStepDetail(error.message || "An unknown error occurred during generation.");
      setLlmStream(prev => [...prev, `💥 Critical Error: ${error.message || "Unknown failure."}`]);
      setIsLlmProcessingComplete(true); 
    }
  }, [projectId, project?.name, selectedCommitShas]);

  // Ref to track cancellation for async operations in handleSendMessage
  const isGeneratingRef = React.useRef(isGenerating);
  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  const fetchPreviousContent = useCallback(async (currentProjectId: string) => {
    if (!currentProjectId || didJustPost) { // Check the flag here
      if(didJustPost) console.log("Skipping fetchPreviousContent because didJustPost is true.");
      // Even if skipping, ensure loading state is false if it was somehow true
      setIsLoadingPreviousContent(false);
      return;
    }

    // Only clear and "fetch" if the previousContent array is truly empty.
    if (previousContent.length === 0) {
      console.log(`Fetching previous content for project ID: ${currentProjectId} (list is empty, will clear for demo)`);
      setIsLoadingPreviousContent(true);
      setPreviousContentError(null);
      setPreviousContent([]); 
      setIsLoadingPreviousContent(false);
    } else {
      console.log("Skipping fetchPreviousContent as content already exists (already loaded).");
      setIsLoadingPreviousContent(false); // Ensure loading is false here too
      setPreviousContentError(null);    // And error is cleared
    }
  }, [previousContent, didJustPost]); // Add didJustPost to dependency array

  const handleUseContent = useCallback(async () => {
    const contentToPostArray = editableTweetText.split("\n\n---\n\n").map(s => s.trim()).filter(s => s.length > 0);
    if (contentToPostArray.length === 0) {
      setTwitterPostResult({ success: false, message: "Cannot post empty content." });
      return;
    }

    console.log("Attempting to post to Twitter:", contentToPostArray);
    setIsPostingToTwitter(true);
    setTwitterPostResult(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/post_tweet`, {
        method: "POST",
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify({ content: contentToPostArray }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || `Failed to post to Twitter: ${response.statusText}`);
      
      setTwitterPostResult({ success: true, message: result.message || "Successfully posted!", postedTweets: result.posted_tweets });

      if (result.posted_tweets && result.posted_tweets.length > 0) {
        const tweetContent = result.posted_tweets.map((t: {text: string}) => t.text).join(" ");
        const now = new Date();
        const formattedDate = now.toISOString().split('T')[0];
        const newContentItem: PreviousContentItem = {
          id: result.posted_tweets[0].id,
          contentSummary: tweetContent.length > 100 ? tweetContent.substring(0, 97) + "..." : tweetContent,
          platform: "Twitter",
          dateGenerated: formattedDate,
          performance: { views: 0, likes: 0, shares: 0 },
          directLink: `https://x.com/glenomenagabe/status/`,
          accountName: "Your Account", 
          accountHandle: "glenomenagabe",
          avatarUrl: "/buildie-logo-small.png"
        };
        setPreviousContent(prevContent => [newContentItem, ...prevContent]);
        setActiveTab("previousContent");
        setDidJustPost(true); // Set the flag
        
        setTimeout(() => {
          returnToDashboard();
          // Reset the flag after returning and a short delay for UI to settle
          setTimeout(() => setDidJustPost(false), 100); 
        }, 1500);
      }
    } catch (error: any) {
      console.error("Error posting to Twitter:", error);
      setTwitterPostResult({ success: false, message: error.message || "An unknown error occurred." });
    } finally {
      setIsPostingToTwitter(false);
    }
  }, [editableTweetText, setActiveTab, returnToDashboard]);

  const handleDoneOrCancelGeneration = useCallback(() => {
    returnToDashboard();
    // For cancellation, also reset Twitter post result
    setTwitterPostResult(null);
  }, [returnToDashboard]);

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

  // Effect 0: Handle initial indexing state based on URL
  useEffect(() => {
    const attemptToStartIndexing = isIndexingFromUrl === "true" && projectId && !isGenerating;

    if (attemptToStartIndexing && !isInitialIndexing) {
      console.log("%%%% Dashboard: Setting isInitialIndexing to true due to URL param %%%%. Project:", projectId);
      setIsInitialIndexing(true);
      setHasAutoStartedFromUrl(true); // Prevent other auto-starts like content generation
    } else if (isIndexingFromUrl !== "true" && isInitialIndexing) {
      // If the URL param is gone (or not 'true'), but state still thinks we are indexing, stop.
      // This handles completion (via handleIndexingComplete removing the param) or manual URL edits/back button.
      console.log("%%%% Dashboard: URL param for indexing absent/false, ensuring isInitialIndexing is false. %%%%");
      setIsInitialIndexing(false);
    }
  }, [isIndexingFromUrl, projectId, isGenerating, isInitialIndexing, setHasAutoStartedFromUrl]);

  // Effect 1: Handles projectId changes, loads project data, and resets states for new project
  useEffect(() => {
    if (projectId) {
      console.log(`New/changed projectId detected: ${projectId}. Resetting states.`);
      // Reset states that should change when projectId changes
      setActiveTab("activity"); // Reset to activity tab on project change
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

      // If not initial indexing, proceed to fetch project details.
      // If isInitialIndexing is true, ProjectIndexingView is shown, and project details will load in background.
      if (!isInitialIndexing) {
        fetchProjectDetails(projectId)
          .then((fetchedProject) => {
            if (fetchedProject) { 
              fetchProjectCommits(fetchedProject.id, 1);
            } 
          })
          .catch((err) => {
            setIsLoadingProject(false);
            setIsLoadingCommits(false);
          });
      } else {
         // Still fetch project details in background for ProjectIndexingView to use name
         fetchProjectDetails(projectId).catch(() => { /*error handled in func*/});
      }
    } else {
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
      setIsInitialIndexing(false); // Clear indexing state if projectId is gone
      setCurrentPrompt("");
    }
  }, [projectId, fetchProjectDetails, fetchProjectCommits, isInitialIndexing]); // Added isInitialIndexing

  // Effect 2: Handles auto-starting generation based on URL params and loaded project
  useEffect(() => {
    if (
      project && 
      startGeneratingFromUrl === "true" &&
      !hasAutoStartedFromUrl && 
      !isGenerating &&
      !isInitialIndexing // Do not auto-start if we are in initial indexing flow
    ) {
      console.log(
        `Auto-starting generation for project ${project.name} (ID: ${project.id}) due to startGenerating=true URL parameter.`
      );
      const defaultPrompt = `Generate a brief, engaging social media update about the latest developments or a cool feature in the project \'${project.name}\'. What\'s something exciting to share?`;
      handleSendMessage(defaultPrompt); 
      setHasAutoStartedFromUrl(true);   
    }
  }, [project, startGeneratingFromUrl, hasAutoStartedFromUrl, isGenerating, handleSendMessage, isInitialIndexing]); // Added isInitialIndexing

  // Effect 3: Fetch previous content when the relevant tab is active and project exists
  useEffect(() => {
    if (activeTab === "previousContent" && project && project.id) {
      fetchPreviousContent(project.id);
    }
  }, [activeTab, project, fetchPreviousContent]);

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
  
  // Callback for when ProjectIndexingView completes
  const handleIndexingComplete = useCallback(() => {
    console.log("%%%% Dashboard: Indexing complete. Setting isInitialIndexing to false. %%%%");
    setIsInitialIndexing(false);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete('isIndexing');
    router.replace(`/dashboard?${newSearchParams.toString()}`);
    
    if (projectId) {
        fetchProjectDetails(projectId)
        .then((fetchedProject) => {
            if (fetchedProject) { 
                fetchProjectCommits(fetchedProject.id, 1); // Fetch commits for the newly "indexed" project
                // Optionally fetch previous content if that tab might be active
                // if (activeTab === "previousContent") fetchPreviousContent(fetchedProject.id);
            }
        })
        .catch(() => { /* Error handled in fetch functions */ });
    }

  }, [projectId, router, searchParams, fetchProjectDetails, fetchProjectCommits /*, activeTab, fetchPreviousContent */]);

  // Handler for selecting/deselecting commits
  const handleCommitSelect = useCallback((commitSha: string) => {
    setSelectedCommitShas(prevShas =>
      prevShas.includes(commitSha)
        ? prevShas.filter(sha => sha !== commitSha)
        : [...prevShas, commitSha]
    );
  }, []);

  const isLoading = isLoadingProject || (project && isLoadingCommits);
  const totalPages = Math.ceil(totalCommits / commitsPerPage);

  console.log("##### DashboardPage render, isGenerating state:", isGenerating, "isInitialIndexing:", isInitialIndexing);

  // MAIN RENDER LOGIC
  if (isInitialIndexing) {
    return (
      <div className="min-h-screen text-foreground font-sans flex flex-col items-center justify-center pt-12 md:pt-16 p-4 md:p-6 
                      bg-black 
                      bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"
      >
        <ProjectIndexingView 
          onIndexingComplete={handleIndexingComplete} 
          projectName={project?.name} 
        />
      </div>
    );
  }

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
          currentStepIcon={currentStepIcon}
          currentStepTitle={currentStepTitle}
          currentStepDetail={currentStepDetail}
          generatedContent={generatedContent}
          setGeneratedContent={setGeneratedContent}
          editableTweetText={editableTweetText}
          setEditableTweetText={setEditableTweetText}
          onUseContent={handleUseContent}
          onDoneOrCancel={handleDoneOrCancelGeneration}
          isPostingToTwitter={isPostingToTwitter}
          twitterPostResult={twitterPostResult}
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

          {/* Selected Commits Display Area */}
          {selectedCommitShas.length > 0 && (
            <div className="w-full max-w-2xl lg:max-w-3xl mb-3">
              <div className="p-3 bg-slate-800/70 backdrop-blur-sm rounded-md border border-slate-700/80 shadow">
                <div className="flex items-center mb-2">
                  <GitFork size={16} className="mr-2 text-slate-400" />
                  <h4 className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
                    Selected Commits for Context:
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCommitShas.map(sha => (
                    <Badge 
                      key={sha} 
                      variant="secondary" 
                      className="pl-2.5 pr-1 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 shadow-sm font-mono group"
                    >
                      {sha.substring(0, 7)}
                      <button 
                        onClick={() => handleCommitSelect(sha)} 
                        className="ml-2 p-0.5 rounded-full hover:bg-slate-500/70 group-hover:opacity-100 opacity-60 transition-opacity focus:outline-none focus:ring-1 focus:ring-slate-400"
                        aria-label={`Remove commit ${sha.substring(0,7)}`}
                      >
                        <X size={13} className="text-slate-300 hover:text-white" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat Input Section - More centered and prominent */}
          <div className="w-full max-w-2xl lg:max-w-3xl mb-12 md:mb-16">
            <ChatInput onSendMessage={handleSendMessage} /> {/* Pass the handler */}
          </div>

          {/* Tabs for Project Activity and Previous Content */}
          {project && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl lg:max-w-5xl">
              <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-6 bg-slate-800">
                <TabsTrigger value="activity" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Project Activity</TabsTrigger>
                <TabsTrigger value="previousContent" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Previous Content</TabsTrigger>
              </TabsList>
              
              <TabsContent value="activity">
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
                    <CommitHistoryTable 
                      commits={commits} 
                      selectedCommitShas={selectedCommitShas} // Passed selected SHAs
                      onCommitSelect={handleCommitSelect}   // Passed handler
                    />
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
              </TabsContent>

              <TabsContent value="previousContent">
                <h2 className="text-2xl md:text-3xl font-semibold text-slate-100 mb-6 pb-3 border-b border-slate-700">
                  Previously Generated Content for {project.name}
                </h2>
                {isLoadingPreviousContent && (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={`prev-content-skeleton-${i}`} className="h-20 w-full rounded bg-slate-700/50" />)}
                  </div>
                )}
                {!isLoadingPreviousContent && previousContentError && (
                  <p className="text-red-500">Error loading previous content: {previousContentError}</p>
                )}
                {!isLoadingPreviousContent && !previousContentError && previousContent.length === 0 && (
                  <p className="text-slate-400">No previously generated content found for this project.</p>
                )}
                {!isLoadingPreviousContent && !previousContentError && previousContent.length > 0 && (
                  <div className="space-y-4">
                    {/* TODO: Replace this with a proper table or list component for previous content */}
                    <PreviousContentTable items={previousContent} />
                  </div>
                )}
              </TabsContent>
            </Tabs>
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