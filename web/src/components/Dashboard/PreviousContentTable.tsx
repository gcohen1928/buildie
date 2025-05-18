"use client";

import PreviousContentRow from './PreviousContentRow';

// Interface should match the one in DashboardPage.tsx and PreviousContentRow.tsx
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
  directLink?: string;
  accountName?: string;
  accountHandle?: string;
  avatarUrl?: string;
}

interface PreviousContentTableProps {
  items: PreviousContentItem[];
}

export default function PreviousContentTable({ items }: PreviousContentTableProps) {
  if (!items || items.length === 0) {
    // This case is handled in DashboardPage.tsx, but good to have a fallback
    return <p className="text-muted-foreground text-center py-10">No previously generated content found.</p>;
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-md overflow-hidden">
      <div className="divide-y divide-border">
        {items.map((item) => (
          <PreviousContentRow 
            key={item.id} 
            item={item} 
          />
        ))}
      </div>
    </div>
  );
} 