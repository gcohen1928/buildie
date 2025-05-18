"use client";

import { Button } from "@/components/ui/button";
import { Eye, ThumbsUp, Share2, ExternalLink } from "lucide-react"; // Icons for performance and actions
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Added Avatar components

// Interface should match the one in DashboardPage.tsx
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
  // Add a directLink if available, for a "View Post" button
  directLink?: string;
  // New fields for account display
  accountName?: string;
  accountHandle?: string;
  avatarUrl?: string;
}

interface PreviousContentRowProps {
  item: PreviousContentItem;
}

export default function PreviousContentRow({ item }: PreviousContentRowProps) {
  const hasPerformanceData = item.performance.views != null || item.performance.likes != null || item.performance.shares != null;

  const getInitials = (name?: string) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
  };

  return (
    <div className="p-4 hover:bg-slate-800/50 transition-colors duration-150 ease-in-out">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
        {/* Main content area */}
        <div className="flex-grow min-w-0">
          <h3 
            className="text-base font-medium text-slate-100 mb-1 truncate cursor-pointer hover:text-sky-400 transition-colors"
            title={item.contentSummary}
            // onClick={() => item.directLink && window.open(item.directLink, '_blank')} // Optional: make title clickable if link exists
          >
            {item.contentSummary}
          </h3>
          
          {/* Account Info */}
          {(item.accountName || item.accountHandle) && (
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={item.avatarUrl} alt={item.accountName || item.accountHandle} />
                <AvatarFallback>{getInitials(item.accountName || item.accountHandle)}</AvatarFallback>
              </Avatar>
              {item.accountName && <span className="font-semibold text-slate-200">{item.accountName}</span>}
              {item.accountHandle && <span className="text-slate-500">@{item.accountHandle}</span>}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 text-xs text-slate-400 sm:mb-0">
            <span>Platform: <span className="font-medium text-slate-300">{item.platform}</span></span>
            <span>Generated: <span className="font-medium text-slate-300">{new Date(item.dateGenerated).toLocaleDateString()}</span></span>
          </div>
        </div>

        {/* Right-aligned area: Performance and Actions */}
        <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0 self-start sm:self-end mt-1 sm:mt-0">
          {hasPerformanceData ? (
            <div className="flex items-center gap-3 text-xs text-slate-400">
              {item.performance.views != null && (
                <span className="flex items-center" title="Views">
                  <Eye size={13} className="mr-1 text-slate-500" /> {item.performance.views}
                </span>
              )}
              {item.performance.likes != null && (
                <span className="flex items-center" title="Likes">
                  <ThumbsUp size={13} className="mr-1 text-slate-500" /> {item.performance.likes}
                </span>
              )}
              {item.performance.shares != null && (
                <span className="flex items-center" title="Shares">
                  <Share2 size={13} className="mr-1 text-slate-500" /> {item.performance.shares}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">No performance data yet.</span>
          )}
          
          {item.directLink && (
            <Button 
              variant="outline" 
              size="xs"
              className="font-mono text-xs p-1 h-auto border-slate-600 hover:border-sky-500 text-slate-400 hover:text-sky-400 mt-1"
              onClick={() => window.open(item.directLink, '_blank')}
              title="View original post"
            >
              <ExternalLink size={14} />
              <span className="ml-1.5">View Post</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 