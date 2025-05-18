"use client";

import { useState } from 'react';
import { Copy, CheckCircle, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // For tweet display
import { Textarea } from "@/components/ui/textarea"; // For editable tweet

interface Commit {
  id: string;
  message: string;
  author: string;
  avatarUrl?: string;
  date: string;
  sha: string;
  verified?: boolean;
}

interface CommitRowProps {
  commit: Commit;
}

export default function CommitRow({ commit }: CommitRowProps) {
  const [generatedTweet, setGeneratedTweet] = useState("");
  const [editableTweet, setEditableTweet] = useState("");
  const [isLoadingTweet, setIsLoadingTweet] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleGenerateTweet = () => {
    setIsLoadingTweet(true);
    setGeneratedTweet("");
    setEditableTweet("");
    setIsCopied(false);
    setTimeout(() => {
      const baseTweet = `Check out this update: "${commit.message.substring(0, 100)}${commit.message.length > 100 ? '...' : ''}" - just pushed by ${commit.author}! 🚀`;
      const hashtags = " #buildinpublic #devlog #update";
      let finalTweet = baseTweet + hashtags;
      if (finalTweet.length > 280) {
        finalTweet = baseTweet.substring(0, 280 - hashtags.length - 3) + "..." + hashtags;
      }
      setGeneratedTweet(finalTweet);
      setEditableTweet(finalTweet);
      setIsLoadingTweet(false);
    }, 1500);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(editableTweet);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
        <div className="flex-grow">
          <h3 className="text-base font-medium text-foreground mb-1 cursor-pointer hover:text-primary hover:underline">
            {commit.message}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 sm:mb-0">
            <Avatar className="h-5 w-5">
              <AvatarImage src={commit.avatarUrl} alt={`@${commit.author}`} />
              <AvatarFallback>{commit.author.substring(0,1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-foreground">{commit.author}</span>
            <span>committed on {new Date(commit.date).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
          {commit.verified ? (
            <Badge variant="outline" className="text-green-500 border-green-500/50">
              <ShieldCheck size={14} className="mr-1" /> Verified
            </Badge>
          ) : (
            <Badge variant="secondary">
               Unverified
            </Badge>
          )}
          <Badge variant="outline" className="font-mono text-xs">
            {commit.sha.substring(0, 7)}
          </Badge>
        </div>
      </div>
      
      <div className="flex flex-col items-end mt-2 gap-3">
        <Button
          onClick={handleGenerateTweet}
          disabled={isLoadingTweet || !!generatedTweet}
          size="sm"
          variant={!!generatedTweet ? "secondary" : "default"}
        >
          {isLoadingTweet ? 
            <><Loader2 size={16} className="animate-spin mr-2" /> Generating...</> : 
            !!generatedTweet ? 
            <><CheckCircle size={16} className="mr-2" /> Tweet Ready!</> : 
            <><Sparkles size={16} className="mr-2" /> Commit Spark</>
          }
        </Button>

        {generatedTweet && (
          <Card className="w-full max-w-md bg-background/70 border-primary/50 shadow-md">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={commit.avatarUrl} alt={`@${commit.author}`} />
                  <AvatarFallback>{commit.author.substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
                {commit.author}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <Textarea 
                value={editableTweet}
                onChange={(e) => setEditableTweet(e.target.value)}
                className="w-full text-sm bg-background focus-visible:ring-1 focus-visible:ring-primary-focus min-h-[80px]"
                placeholder="Edit your tweet..."
              />
            </CardContent>
            <CardFooter className="px-4 pb-3 flex justify-between items-center">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => console.log("Re-running agent with edits:", editableTweet)} // Placeholder
                    className="text-xs text-muted-foreground hover:text-primary"
                >
                    Refresh with Edits
                </Button>
                <Button onClick={handleCopyToClipboard} size="sm" variant="outline">
                    {isCopied ? <CheckCircle size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
                    {isCopied ? "Copied!" : "Copy Tweet"}
                </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
} 