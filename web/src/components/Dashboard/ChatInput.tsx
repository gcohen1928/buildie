"use client";

import { useState, useRef, useEffect } from 'react';
import { Paperclip, Globe, ArrowRight } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ChatInput() {
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Basic auto-resize logic (can be replaced with a library for more robustness)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // Submit form or handle Enter key press action
      console.log('Submit (Enter pressed):', inputValue);
      // setInputValue(""); // Optionally clear input
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3 flex flex-col gap-3 shadow-lg">
      <Textarea
        ref={textareaRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask Buildie to... (e.g., draft a tweet thread about my last commit)"
        className="flex-grow bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground resize-none overflow-y-hidden leading-tight pb-6 md:pb-8 min-h-[80px] md:min-h-[100px]"
        // rows={1} // min-height and padding will control initial height better
      />
      <div className="flex flex-row items-center justify-between gap-2 w-full"> {/* Changed from flex-col and self-end */}
        <div className="flex gap-2"> {/* Attach and Public buttons */}
            <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-auto md:px-2.5 group text-xs">
                <Paperclip size={16} className="group-hover:text-primary md:mr-1" />
                <span className="hidden md:inline group-hover:text-primary">Attach</span>
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-auto md:px-2.5 group text-xs">
                <Globe size={16} className="group-hover:text-primary md:mr-1" />
                <span className="hidden md:inline group-hover:text-primary">Public</span>
            </Button>
        </div>
        <Button 
          size="icon" 
          className="h-9 w-9 md:h-10 bg-primary hover:bg-primary/90 text-primary-foreground" // Kept size icon for now, can be w-full if needed
          onClick={() => {
            console.log('Submit (Button clicked):', inputValue);
            // setInputValue(""); // Optionally clear input
          }}
          title="Submit"
        >
          <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
} 