import { useState } from "react";
import { X, Image as ImageIcon, Sparkles, Wand2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser?: {
    name: string;
    avatar?: string;
  };
}

export default function CreatePostModal({ open, onOpenChange, currentUser }: CreatePostModalProps) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleGenerateAIText = () => {
    setIsGeneratingText(true);
    setTimeout(() => {
      setAiSuggestion("카페의 따뜻한 분위기 속에서 하루의 여유를 즐기는 순간. 창밖으로 들어오는 햇살이 커피 잔에 반짝이며, 이 평화로운 시간이 영원했으면 좋겠다는 생각이 듭니다. ☕️✨");
      setIsGeneratingText(false);
    }, 1500);
  };

  const handleGenerateAIImage = () => {
    setIsGeneratingImage(true);
    setTimeout(() => {
      setImage("https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80");
      setIsGeneratingImage(false);
    }, 2000);
  };

  const handleUseSuggestion = () => {
    if (aiSuggestion) {
      setContent(aiSuggestion);
      setAiSuggestion(null);
    }
  };

  const handlePost = () => {
    console.log("게시물 작성:", { content, image });
    setContent("");
    setImage(null);
    setAiSuggestion(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="modal-create-post">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            새 게시물 만들기
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              AI 지원
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={currentUser?.avatar} alt={currentUser?.name} />
              <AvatarFallback>{currentUser?.name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-sm mb-2">{currentUser?.name || "사용자"}</p>
              <Textarea
                placeholder="무슨 생각을 하고 계신가요?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] resize-none border-0 focus-visible:ring-0 text-base"
                data-testid="input-post-content"
              />
            </div>
          </div>

          {aiSuggestion && (
            <div className="bg-muted border border-border rounded-lg p-4" data-testid="ai-suggestion-box">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1">AI가 제안한 글</p>
                  <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-ai-suggestion">
                    {aiSuggestion}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleUseSuggestion}
                  data-testid="button-use-suggestion"
                >
                  이 글 사용하기
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateAIText}
                  data-testid="button-regenerate-text"
                >
                  다시 생성
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAiSuggestion(null)}
                  data-testid="button-dismiss-suggestion"
                >
                  닫기
                </Button>
              </div>
            </div>
          )}

          {image && (
            <div className="relative rounded-xl overflow-hidden" data-testid="preview-image">
              <img src={image} alt="Upload preview" className="w-full aspect-video object-cover" />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => setImage(null)}
                data-testid="button-remove-image"
              >
                <X className="w-4 h-4" />
              </Button>
              <Badge className="absolute bottom-2 right-2 bg-primary/90 backdrop-blur-md">
                <Sparkles className="w-3 h-3 mr-1" />
                AI 생성
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => console.log("이미지 업로드")}
                data-testid="button-upload-image"
              >
                <ImageIcon className="w-4 h-4" />
                이미지
              </Button>
              
              {image && !content && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleGenerateAIText}
                  disabled={isGeneratingText}
                  data-testid="button-generate-text"
                >
                  {isGeneratingText ? (
                    <>
                      <div className="w-3 h-3 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      AI 글 생성
                    </>
                  )}
                </Button>
              )}
              
              {content && !image && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleGenerateAIImage}
                  disabled={isGeneratingImage}
                  data-testid="button-generate-image"
                >
                  {isGeneratingImage ? (
                    <>
                      <div className="w-3 h-3 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI 이미지 생성
                    </>
                  )}
                </Button>
              )}
            </div>

            <Button
              onClick={handlePost}
              disabled={!content && !image}
              data-testid="button-post"
            >
              게시하기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
