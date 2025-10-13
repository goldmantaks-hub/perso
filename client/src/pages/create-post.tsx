import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { X, ArrowLeft, Camera, Image as ImageIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { getToken } from "@/lib/auth";

export default function CreatePostPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<"select" | "caption">("select");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 현재 사용자 정보 가져오기
  const { data: currentUser } = useQuery<{
    id: string;
    name: string;
    username: string;
    profileImage?: string;
  }>({
    queryKey: ["/api/user"],
  });

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setStep("caption");
      };
      reader.readAsDataURL(file);
    }
  };

  // 카메라 촬영 핸들러
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e);
  };

  // 이미지 업로드
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const token = getToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      throw new Error('이미지 업로드 실패');
    }

    const data = await response.json();
    return data.url;
  };

  // 게시물 작성
  const handlePost = async () => {
    if (!selectedFile) {
      toast({
        title: "이미지를 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    if (!caption.trim()) {
      toast({
        title: "캡션을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // 1. 이미지 업로드
      const imageUrl = await uploadImage(selectedFile);
      
      setIsPosting(true);
      
      // 2. 게시물 생성
      await apiRequest('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: caption.substring(0, 100),
          description: caption,
          image: imageUrl,
        }),
      });

      // 3. 캐시 무효화 및 피드로 이동
      await queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      
      toast({
        title: "게시물이 작성되었습니다",
      });
      
      setLocation('/');
    } catch (error) {
      console.error('게시물 작성 실패:', error);
      toast({
        title: "게시물 작성에 실패했습니다",
        description: error instanceof Error ? error.message : "다시 시도해주세요",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsPosting(false);
    }
  };

  // 뒤로 가기
  const handleBack = () => {
    if (step === "caption") {
      setStep("select");
    } else {
      setLocation('/');
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          data-testid="button-back"
        >
          {step === "caption" ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </Button>
        
        <h1 className="text-lg font-semibold">
          {step === "select" ? "새 게시물" : "새 게시물 작성"}
        </h1>
        
        {step === "caption" && (
          <Button
            onClick={handlePost}
            disabled={isUploading || isPosting || !caption.trim()}
            size="sm"
            data-testid="button-share"
          >
            {isUploading ? "업로드 중..." : isPosting ? "게시 중..." : "공유"}
          </Button>
        )}
        {step === "select" && <div className="w-10" />}
      </div>

      {/* 본문 */}
      {step === "select" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="text-center mb-4">
            <ImageIcon className="w-24 h-24 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">사진을 선택하세요</h2>
            <p className="text-sm text-muted-foreground">
              갤러리에서 선택하거나 카메라로 촬영하세요
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-sm">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-file"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
              data-testid="input-camera"
            />
            
            <Button
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
              data-testid="button-select-gallery"
            >
              <ImageIcon className="w-5 h-5" />
              갤러리에서 선택
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              className="gap-2"
              data-testid="button-select-camera"
            >
              <Camera className="w-5 h-5" />
              카메라로 촬영
            </Button>
          </div>
        </div>
      )}

      {step === "caption" && selectedImage && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 이미지 미리보기 */}
          <div className="relative w-full aspect-square bg-black flex-shrink-0">
            <img
              src={selectedImage}
              alt="Selected"
              className="w-full h-full object-contain"
              data-testid="preview-selected-image"
            />
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => {
                setSelectedImage(null);
                setSelectedFile(null);
                setStep("select");
              }}
              data-testid="button-remove-image"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 캡션 입력 */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={currentUser?.profileImage} alt={currentUser?.name} />
                <AvatarFallback>{currentUser?.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-sm mb-2">{currentUser?.name || "사용자"}</p>
                <Textarea
                  placeholder="캡션을 입력하세요..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="min-h-[120px] resize-none border-0 focus-visible:ring-0 text-base p-0"
                  data-testid="input-caption"
                  autoFocus
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
