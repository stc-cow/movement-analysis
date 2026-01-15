/**
 * COW Movement POT Chat Button
 * Floating button to open chat interface
 */

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { COWMovementChat } from "./COWMovementChat";
import type { CowMovementsFact, DimLocation } from "@shared/models";

interface COWChatbotButtonProps {
  movements: CowMovementsFact[];
  locations: DimLocation[];
  className?: string;
}

export function COWChatbotButton({
  movements,
  locations,
  className = "",
}: COWChatbotButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <>
      {/* Floating Button */}
      <div className={`relative ${className}`}>
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-shadow"
          size="lg"
        >
          <MessageCircle className="h-6 w-6" />

          {/* Notification Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
          Chat with COW Movement POT
        </div>
      </div>

      {/* Chat Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>COW Movement POT Chat</DialogTitle>
          </DialogHeader>

          <div className="w-full h-full">
            <COWMovementChat
              movements={movements}
              locations={locations}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Alternative: Inline Chat Component
 * For full-screen or side-panel display
 */
export function COWChatbotPanel({
  movements,
  locations,
  className = "",
}: COWChatbotButtonProps) {
  return (
    <div className={`h-full w-full ${className}`}>
      <COWMovementChat movements={movements} locations={locations} />
    </div>
  );
}
