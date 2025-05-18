"use client";

import { useState } from 'react';
import { Copy, CheckCircle, ShieldCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

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
  isSelected: boolean;
  onSelect: () => void;
}

export default function CommitRow({ commit, isSelected, onSelect }: CommitRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySha = () => {
    navigator.clipboard.writeText(commit.sha);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
  };

  return (
    <div className="p-4 hover:bg-slate-800/50 transition-colors duration-150 ease-in-out">
      <div className="flex items-center gap-3">
        <Checkbox
          id={`commit-${commit.sha}`}
          checked={isSelected}
          onCheckedChange={onSelect}
          className="mr-3 self-start mt-1 relative top-0.5"
          aria-labelledby={`commit-message-${commit.sha}`}
        />
        <div className="flex-grow min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-x-3 gap-y-1">
            <div className="flex-grow min-w-0">
              <h3 
                id={`commit-message-${commit.sha}`}
                className="text-base font-medium text-slate-100 mb-1 truncate cursor-default"
                title={commit.message}
              >
                {commit.message}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={commit.avatarUrl} alt={commit.author} />
                  <AvatarFallback>{getInitials(commit.author)}</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-slate-200 truncate">{commit.author}</span>
                <span>committed on {new Date(commit.date).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center mt-1 sm:mt-0">
              {commit.verified ? (
                <Badge variant="outline" className="text-emerald-400 border-emerald-400/40 bg-emerald-900/30 text-xs px-2 py-0.5">
                  <ShieldCheck size={13} className="mr-1" /> Verified
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-slate-400 bg-slate-700 hover:bg-slate-600 text-xs px-2 py-0.5">
                   Unverified
                </Badge>
              )}
              <Button 
                variant="outline" 
                className="font-mono text-xs p-1 h-auto border-slate-600 hover:border-slate-500 text-slate-400 hover:text-slate-200"
                onClick={handleCopySha}
                title="Copy SHA to clipboard"
              >
                {copied ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span className="ml-1.5">{commit.sha.substring(0, 7)}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 