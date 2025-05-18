"use client";

import { useState, useRef, useEffect } from 'react';
import { Paperclip, Globe, ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LandingPageChatInput() {
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSubmit = () => {
    toast.message("Let's get you started!", {
      description: "Redirecting to sign up page...",
      icon: <Sparkles className="mr-2 h-4 w-4" />,
    });
    router.push('/signup'); // Or your actual signup route
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3 flex flex-col gap-3 shadow-xl transform hover:scale-[1.01] transition-transform duration-300 ease-out">
      <Textarea
        ref={textareaRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Curious what Buildie can do? Type a command to see... (e.g., 'Draft a launch announcement')"
        className="flex-grow bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground resize-none overflow-y-hidden leading-tight pb-6 md:pb-8 min-h-[80px] md:min-h-[100px]"
      />
      <div className="flex flex-row items-center justify-between gap-2 w-full">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9 md:h-10 md:w-auto md:px-2.5 group text-xs"
            onClick={handleSubmit}
            title="Attach files (Sign up to use)"
          >
            <Paperclip size={16} className="group-hover:text-primary md:mr-1" />
            <span className="hidden md:inline group-hover:text-primary">Attach</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9 md:h-10 md:w-auto md:px-2.5 group text-xs"
            onClick={handleSubmit}
            title="Toggle visibility (Sign up to use)"
          >
            <Globe size={16} className="group-hover:text-primary md:mr-1" />
            <span className="hidden md:inline group-hover:text-primary">Public</span>
          </Button>
        </div>
        <Button 
          size="icon" 
          className="h-9 w-9 md:h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={handleSubmit}
          title="Submit (Sign up to use)"
        >
          <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
} 