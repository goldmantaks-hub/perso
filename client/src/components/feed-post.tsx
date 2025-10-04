import { useState } from "react";
import { Heart, MessageCircle, Share2, Sparkles, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FeedPostProps {
  id: string;
  author: {
    name: string;
    username: string;
    avatar?: string;
  };
  content: string;
  image?: string;
  isAIGenerated?: boolean;
  aiComments?: Array<{
    id: string;
    author: string;
    content: string;
    avatar?: string;
  }>;
  likes: number;
  comments: number;
  timestamp: string;
}

export default function FeedPost({
  author,
  content,
  image,
  isAIGenerated = false,
  aiComments = [],
  likes: initialLikes,
  comments: initialComments,
  timestamp,
}: FeedPostProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
  };

  return (
    <div className="bg-card border border-card-border rounded-2xl overflow-hidden hover-elevate" data-testid={`post-card`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 ring-2 ring-offset-2 ring-primary/20">
              <AvatarImage src={author.avatar} alt={author.name} />
              <AvatarFallback>{author.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-card-foreground" data-testid="text-author-name">{author.name}</p>
                {isAIGenerated && (
                  <Badge variant="secondary" className="h-5 px-2 text-xs bg-primary/10 text-primary border-primary/20">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-timestamp">{timestamp}</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-post-menu">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid="menu-item-share">공유하기</DropdownMenuItem>
              <DropdownMenuItem data-testid="menu-item-save">저장하기</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" data-testid="menu-item-report">신고하기</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-card-foreground mb-4 leading-relaxed" data-testid="text-post-content">
          {content}
        </p>

        {image && (
          <div className="relative -mx-4 mb-4">
            <img
              src={image}
              alt="Post content"
              className="w-full aspect-square object-cover"
              data-testid="img-post-content"
            />
            {isAIGenerated && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-primary/90 backdrop-blur-md border-primary" data-testid="badge-ai-generated">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI 생성
                </Badge>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-6 pt-3 border-t border-card-border">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${isLiked ? 'text-destructive' : 'text-muted-foreground'}`}
            onClick={handleLike}
            data-testid="button-like"
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span data-testid="text-like-count">{likes}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={() => setShowComments(!showComments)}
            data-testid="button-comment"
          >
            <MessageCircle className="w-5 h-5" />
            <span data-testid="text-comment-count">{initialComments}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            data-testid="button-share"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {showComments && aiComments.length > 0 && (
        <div className="border-t border-card-border bg-muted/30 px-4 py-3 space-y-3">
          {aiComments.map((comment) => (
            <div key={comment.id} className="flex gap-3 border-l-2 border-primary/40 pl-3" data-testid={`comment-${comment.id}`}>
              <Avatar className="w-6 h-6">
                <AvatarImage src={comment.avatar} alt={comment.author} />
                <AvatarFallback className="text-xs">{comment.author[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium" data-testid="text-comment-author">{comment.author} AI</p>
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-primary/10 text-primary">
                    <Sparkles className="w-2.5 h-2.5" />
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-comment-content">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
