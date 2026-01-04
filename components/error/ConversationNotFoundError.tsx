import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { MessageCircleX, MessageCircle, History } from "lucide-react";

export function ConversationNotFoundError() {
  return (
    <div className="relative w-full h-[calc(100vh-4rem)]">
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8">
        {/* Icon and illustration */}
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <MessageCircleX className="w-10 h-10 text-primary" />
          </div>

          {/* Error Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Conversation Not Found
            </h1>
            <p className="text-muted-foreground">
              This conversation doesn&rsquo;t exist or has been deleted. The link you followed may be broken or you may not have permission to access it.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link to="/chat">
              <MessageCircle className="w-4 h-4" />
              Start New Chat
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link to="/history">
              <History className="w-4 h-4" />
              View Chat History
            </Link>
          </Button>
        </div>

        {/* Help text */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Looking for a specific conversation? Check your chat history or start a new one.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
