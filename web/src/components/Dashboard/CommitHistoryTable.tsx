"use client";

import CommitRow from './CommitRow';

export interface Commit {
  id: string;
  message: string;
  author: string;
  avatarUrl?: string;
  date: string;
  sha: string;
  verified?: boolean;
  // filesChanged, additions, deletions removed as they are not used in CommitRow current version
}

interface CommitHistoryTableProps {
  commits: Commit[];
  selectedCommitShas: string[];
  onCommitSelect: (commitSha: string) => void;
}

export default function CommitHistoryTable({ commits, selectedCommitShas, onCommitSelect }: CommitHistoryTableProps) {
  if (!commits || commits.length === 0) {
    return <p className="text-muted-foreground text-center py-10">No commit history available.</p>;
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-md overflow-hidden">
      {/* 
        While shadcn/ui Table could be used, for a GitHub-like commit list,
        a simple div mapping to CommitRow components often provides more styling flexibility per row.
        If a more traditional tabular layout is needed later, shadcn/ui Table is a good option.
      */}
      <div className="divide-y divide-border">
        {commits.map((commit) => (
          <CommitRow 
            key={commit.id} 
            commit={commit} 
            isSelected={selectedCommitShas.includes(commit.sha)}
            onSelect={() => onCommitSelect(commit.sha)}
          />
        ))}
      </div>
    </div>
  );
} 