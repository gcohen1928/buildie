"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ChatInput from '@/components/Dashboard/ChatInput';
import CommitHistoryTable, { Commit } from '@/components/Dashboard/CommitHistoryTable';
import PreviousContentTable from '@/components/Dashboard/PreviousContentTable'; // Import the new table
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Button } from "@/components/ui/button"; // For pagination buttons
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Added Tabs
import { Badge } from "@/components/ui/badge"; // Added Badge
import { Paperclip, ArrowRight, Globe, Settings2, SearchCode, PenTool, AlertTriangle, Sparkles, Zap, Bot, Wand2, CheckCircle2, Github, DownloadCloud, GitCommit, LayoutDashboard, Loader2, GitFork, ListChecks, FileText, X } from "lucide-react"; // Changed PowerPlug to Zap and added X icon
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
    currentStepIcon, 
    currentStepTitle,
    currentStepDetail,
    generatedContent,
    editableTweetText,
    setEditableTweetText,
    onUseContent,
    onDoneOrCancel
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
              className="flex flex-col items-center justify-start mb-8 p-4 bg-slate-700/30 rounded-lg min-h-[200px] md:min-h-[240px] ring-1 ring-slate-600"
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
                  <p className="text-xs md:text-sm text-slate-400/70 text-center min-h-[50px] md:min-h-[70px] w-full px-2 leading-snug">
                    {currentStepDetail && <AnimatedTypingText fullText={currentStepDetail} charTypingDelay={0.008} className="text-slate-400/80" />}
                  </p>
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
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Skeleton className="h-10 w-10 rounded-full bg-slate-700" /> 
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-1 mb-2">
                        <span className="font-semibold text-slate-100">Your Name</span>
                        <span className="text-sm text-slate-500">@username</span>
                        <span className="text-sm text-slate-500">· Now</span>
                      </div>
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
      setCurrentStepIcon(icon);
      setCurrentStepTitle(title);
      setCurrentStepDetail(detail);
      setLlmStream(prev => [...prev, logMessage || `${title}: ${detail.substring(0,70)}...`]);
    };
    
    const userPromptSnippet = message.length > 60 ? message.substring(0, 57) + "..." : message;
    const projectNameForDisplay = project?.name || "project context";

    const chainOfThoughtSteps = [
      {
        icon: <Settings2 className="h-8 w-8 text-slate-400" />,
        title: "Agent Core Bootup",
        detail: "Initializing agent kernel. Loading cognitive modules: [ContextParser, DiffAnalyzer, CreativeEngine, OutputFormatter]. Verifying API endpoints. System status: Nominal.",
        duration: 2200, 
        log: "AgentKernel: Boot sequence initiated."
      },
      {
        icon: <SearchCode className="h-8 w-8 text-slate-400" />,
        title: "Contextual Data Ingestion",
        detail: `Fetching project data stream for '${projectNameForDisplay}'. Accessing: Git log, file tree, README.md, issue tracker metadata. Parsing structure. Data integrity check: OK.`, 
        duration: 2800,
        log: `ContextParser: Ingesting data for ${projectNameForDisplay}.`
      },
      {
        icon: <GitCommit className="h-8 w-8 text-slate-400" />,
        title: "Change Analysis Routine",
        detail: "Executing diff analysis on recent commits. Identifying key modified files: [X, Y, Z]. Extracting code snippets and commit messages. Calculating change impact score. Focusing on high-impact deltas.",
        duration: 3000,
        log: "DiffAnalyzer: Processing recent commit activity."
      },
      {
        icon: <FileText className="h-8 w-8 text-slate-400" />,
        title: "Prompt Deconstruction",
        detail: `Parsing user prompt: "${userPromptSnippet}". Extracting keywords and intent vectors. Semantic analysis: [entity_1, entity_2, sentiment, desired_format]. Cross-referencing with project context.`,
        duration: 2500,
        log: `NLPModule: Deconstructing user prompt.`
      },
      {
        icon: <Bot className="h-8 w-8 text-slate-400" />,
        title: "Cognitive Synthesis Loop",
        detail: "Initiating synthesis phase. Correlating prompt intent with analyzed changes. Generating potential narrative threads. Evaluating relevance scores for N content angles. Iteration 1/3... Iteration 2/3... Prioritizing top  K hypotheses.",
        duration: 3500,
        log: "CognitiveEngine: Synthesizing information, generating hypotheses."
      },
      {
        icon: <PenTool className="h-8 w-8 text-slate-400" />,
        title: "Creative Content Generation",
        detail: "Activating Creative Engine. Drafting multiple content pieces based on prioritized hypotheses. Applying linguistic style parameters. Generating variations for tone and length. Ensuring adherence to platform constraints (e.g., tweet character limits).",
        duration: 3000,
        log: "CreativeEngine: Drafting content variations."
      },
      {
        icon: <ListChecks className="h-8 w-8 text-slate-400" />,
        title: "Output Structuring & Validation",
        detail: "Consolidating generated content. Formatting into a structured output (e.g., tweet thread object). Performing quality checks: [coherence, grammar, factual_accuracy_check (simulated)]. Final review pass before handoff.",
        duration: 2800,
        log: "OutputFormatter: Validating and structuring final content."
      },
    ];

    try {
      for (const step of chainOfThoughtSteps) {
        updateStep(step.icon, step.title, step.detail, step.log);
        const estimatedTypingTime = step.detail.length * 8; // 8ms per char with charTypingDelay={0.008}
        const bufferTime = 700; // Reduced buffer as typing is faster
        await new Promise(resolve => setTimeout(resolve, Math.max(step.duration, estimatedTypingTime + bufferTime) ));
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

      const response = await fetch(`${apiUrl}/api/generate/demo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!isGeneratingRef.current) return;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown API error" }));
        updateStep(<AlertTriangle className="h-8 w-8 text-red-500" />, "API Error", errorData.detail || `Service request failed: ${response.status}`, `Agent: API Error - ${errorData.detail || response.statusText}`);
        throw new Error(errorData.detail || `API Error: ${response.status} ${response.statusText}`);
      }
      
      updateStep(<Wand2 className="h-8 w-8 text-emerald-500" />, "Processing Response", "Successfully received response from our intelligent agent. Parsing and formatting the generated content for your review...", "Agent: Formatting final output..."); 
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      const result = await response.json();
      setLlmStream(prev => [...prev, "👍 Agent responded! Content received and parsed."]);
      
      if (result.tweet_thread && Array.isArray(result.tweet_thread)) {
        setGeneratedContent(result.tweet_thread);
        setEditableTweetText(result.tweet_thread.join("\n\n---\n\n"));
      } else {
        const errorMsg = "Received unexpected content format from agent.";
        setGeneratedContent([errorMsg]);
        setEditableTweetText(errorMsg);
        setLlmStream(prev => [...prev, `❗ Error: ${errorMsg}`]);
      }
      setIsLlmProcessingComplete(true);

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

  const handleUseContent = useCallback(() => {
    const updatedContentArray = editableTweetText.split("\n\n---\n\n");
    setGeneratedContent(updatedContentArray);
    console.log("Using content (array):", updatedContentArray);
    console.log("Original editable text:", editableTweetText);
  }, [editableTweetText]);

  const handleDoneOrCancelGeneration = useCallback(() => {
    setIsGenerating(false); // This will update isGeneratingRef.current via its own useEffect
    setLlmStream([]);
    setGeneratedContent(null);
    setCurrentPrompt("");
    setGenerationError(null); 
    setIsLlmProcessingComplete(false);
    setCurrentStepIcon(null);
    setCurrentStepTitle("");
    setCurrentStepDetail("");
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

  const fetchPreviousContent = useCallback(async (currentProjectId: string) => {
    if (!currentProjectId) return;
    console.log(`Fetching previous content for project ID: ${currentProjectId}`);
    setIsLoadingPreviousContent(true);
    setPreviousContentError(null);
    // TODO: Replace with actual API call
    // Example: const response = await fetch(`/api/projects/${currentProjectId}/previous-content`);
    // For now, using mock data with a delay
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    setPreviousContent([
      { 
        id: "1", 
        contentSummary: "Tweet about new feature X: Enhanced AI suggestions!", 
        platform: "Twitter", 
        dateGenerated: "2023-05-15", 
        performance: { views: 1052, likes: 78, shares: 12 }, 
        directLink: "https://twitter.com/example/status/1",
        accountName: "BuildieApp",
        accountHandle: "Buildie",
        avatarUrl: "/buildie-logo-small.png" // Assuming you have a small logo
      },
      { 
        id: "2", 
        contentSummary: "LinkedIn post on Q2 results and future outlook.", 
        platform: "LinkedIn", 
        dateGenerated: "2023-05-10", 
        performance: { views: 876, likes: 120, shares: 25 }, 
        directLink: "https://linkedin.com/feed/update/urn:li:activity:2",
        accountName: "BuildieApp",
        accountHandle: "Buildie",
        avatarUrl: "/buildie-logo-small.png"
      },
      { 
        id: "3", 
        contentSummary: "Blog draft: The future of AI in software development, a deep dive.", 
        platform: "Blog", 
        dateGenerated: "2023-05-05", 
        performance: { views: 1200, likes: 90 }, 
        directLink: "https://example.com/blog/ai-future",
        accountName: "Gabe Cohen", // Different author for variety
        accountHandle: "ga_cohen",
        // avatarUrl: undefined // Test fallback initials
      },
      { 
        id: "4", 
        contentSummary: "Short update on Instagram about team expansion.", 
        platform: "Instagram", 
        dateGenerated: "2023-05-02", 
        performance: { likes: 250, shares: 5 },
        accountName: "BuildieApp",
        accountHandle: "Buildie",
        avatarUrl: "/buildie-logo-small.png"
      },
    ]);
    setIsLoadingPreviousContent(false);
  }, []);

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
          editableTweetText={editableTweetText}
          setEditableTweetText={setEditableTweetText}
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