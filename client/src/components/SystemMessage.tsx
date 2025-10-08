import { motion } from "framer-motion";
import { Users, UserPlus, UserMinus, Crown, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SystemMessageProps {
  type: 'join' | 'leave' | 'handover' | 'topic_change' | 'info' | 'auto-introduction';
  personaId?: string;
  personaName?: string;
  dominantPersona?: string;
  dominantPersonaOwner?: {
    name: string;
    username: string;
  };
  currentTopics?: Array<{ topic: string; weight: number }>;
  totalTurns?: number;
  timestamp?: number;
  message?: string;
}

const personaEmojis: Record<string, string> = {
  'Kai': '🧠',
  'Espri': '💖',
  'Luna': '🌙',
  'Namu': '🌱',
  'Milo': '🎭',
  'Eden': '🌿',
  'Ava': '🎨',
  'Rho': '⚡',
  'Noir': '🦉',
  'Zara': '🌟'
};

export default function SystemMessage({
  type,
  personaId,
  personaName,
  dominantPersona,
  dominantPersonaOwner,
  currentTopics = [],
  totalTurns = 0,
  timestamp,
  message
}: SystemMessageProps) {
  const getIcon = () => {
    switch (type) {
      case 'join':
        return <UserPlus className="w-3 h-3" />;
      case 'leave':
        return <UserMinus className="w-3 h-3" />;
      case 'handover':
        return <Crown className="w-3 h-3" />;
      case 'topic_change':
        return <Hash className="w-3 h-3" />;
      case 'auto-introduction':
        return <span className="text-sm">{getPersonaEmoji(personaId || '')}</span>;
      default:
        return <Users className="w-3 h-3" />;
    }
  };

  const getMessage = () => {
    if (message) return message;
    
    switch (type) {
      case 'join':
        return `${getPersonaEmoji(personaId || '')} ${personaName || personaId}님이 대화에 참여했습니다`;
      case 'leave':
        return `${getPersonaEmoji(personaId || '')} ${personaName || personaId}님이 대화를 떠났습니다`;
      case 'handover':
        const displayName = dominantPersonaOwner 
          ? `${dominantPersonaOwner.name}의 ${dominantPersona}`
          : dominantPersona;
        return `주도권이 ${getPersonaEmoji(dominantPersona || '')} ${displayName}에게 넘어갔습니다`;
      case 'topic_change':
        return `토픽이 ${currentTopics.map(t => t.topic).join(', ')}로 변경되었습니다`;
      case 'auto-introduction':
        return `${getPersonaEmoji(personaId || '')} ${personaName || personaId}: ${message || '안녕하세요!'}`;
      default:
        return '시스템 메시지';
    }
  };

  const getPersonaEmoji = (personaId: string) => {
    return personaEmojis[personaId] || '🤖';
  };

  const getTypeColor = () => {
    switch (type) {
      case 'join':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'leave':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'handover':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'topic_change':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'auto-introduction':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="flex justify-center my-2"
    >
      <Badge 
        variant="outline" 
        className={`text-xs px-3 py-1 ${getTypeColor()} border max-w-full`}
      >
        <div className="flex items-center gap-1.5 max-w-full">
          {getIcon()}
          <span className="break-words whitespace-pre-wrap">{getMessage()}</span>
        </div>
      </Badge>
    </motion.div>
  );
}
