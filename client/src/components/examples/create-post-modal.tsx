import { useState } from 'react';
import CreatePostModal from '../create-post-modal';
import { Button } from '@/components/ui/button';

export default function CreatePostModalExample() {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)}>
        게시물 만들기
      </Button>
      <CreatePostModal
        open={open}
        onOpenChange={setOpen}
        currentUser={{
          name: "김지은",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun"
        }}
      />
    </div>
  );
}
