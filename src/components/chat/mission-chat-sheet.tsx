'use client';

import { useState, useEffect, useRef } from 'react';
import type { Conversation, ChatMessage, Mission, User } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/use-user';
import {
  getMessages,
  addMessage,
  getOrCreateMissionConversation,
} from '@/services/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const getInitials = (name: string = '') => {
  return name ? name.split(' ').map((n) => n[0]).join('') : '';
};

function MessageBubble({ message, isSender, senderDetails }: { message: ChatMessage, isSender: boolean, senderDetails: { name: string, avatar: string | undefined } }) {
    return (
        <div className={cn("flex items-end gap-2", isSender ? "justify-end" : "justify-start")}>
            {!isSender && (
                <Avatar className="h-8 w-8">
                    <AvatarImage src={senderDetails.avatar} data-ai-hint="person avatar" />
                    <AvatarFallback>{getInitials(senderDetails.name)}</AvatarFallback>
                </Avatar>
            )}
            <div className={cn(
                "max-w-md rounded-lg p-3",
                isSender ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
                {!isSender && <p className="text-xs font-bold mb-1">{senderDetails.name}</p>}
                <p className="text-sm">{message.text}</p>
                 <p className="text-xs mt-1 opacity-70 text-right">
                    {message.timestamp ? format(new Date(message.timestamp), 'p') : ''}
                </p>
            </div>
        </div>
    );
}

interface MissionChatSheetProps {
  mission: Mission;
  children: React.ReactNode; // The trigger button
}

export function MissionChatSheet({ mission, children }: MissionChatSheetProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('div');
            if (viewport) viewport.scrollTop = viewport.scrollHeight;
        }
    }, 100);
  };

  useEffect(() => {
    if (isOpen && user) {
      setLoading(true);
      getOrCreateMissionConversation(mission, user)
        .then((convo) => {
          if (convo) {
            setConversation(convo);
          } else {
             toast({ variant: 'destructive', title: "Chat Error", description: "Could not initialize mission chat." });
             setIsOpen(false);
          }
        })
        .catch(err => {
            console.error("Failed to load mission chat:", err);
            toast({ variant: 'destructive', title: "Error", description: "Could not load the mission chat." });
            setIsOpen(false);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, user, mission, toast]);

  useEffect(() => {
    if (conversation?.id) {
      const unsubscribe = getMessages(conversation.id, (msgs) => {
        setMessages(msgs);
        scrollToBottom();
      });
      return () => unsubscribe();
    }
  }, [conversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation || !user) return;
    setSending(true);

    const messageData = {
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      text: newMessage,
    };

    try {
      await addMessage(conversation.id, messageData);
      setNewMessage('');
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({ variant: 'destructive', title: "Send Error", description: "Could not send your message." });
    } finally {
      setSending(false);
    }
  };
  
  const getParticipantDetails = (senderId: string) => {
    return conversation?.participants[senderId] || { name: 'Unknown', avatar: '' };
  }

  if (!user) return <>{children}</>;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Mission Chat: {mission.title}</SheetTitle>
          <SheetDescription>
            Discuss details related to this mission.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 flex flex-col overflow-y-auto">
            {loading ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <>
                <ScrollArea className="flex-grow p-4 pr-6" ref={scrollAreaRef}>
                    <div className="space-y-4">
                        {messages.map((msg) => (
                           <MessageBubble 
                                key={msg.id} 
                                message={msg} 
                                isSender={msg.senderId === user.id}
                                senderDetails={getParticipantDetails(msg.senderId)}
                            />
                        ))}
                    </div>
                </ScrollArea>
                 <div className="p-4 border-t">
                    <div className="relative">
                        <Input 
                            placeholder="Type a message..." 
                            className="pr-12"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
                            disabled={sending}
                        />
                        <div className="absolute top-1/2 right-2 transform -translate-y-1/2 flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={handleSendMessage} disabled={sending}>
                                {sending ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
                </>
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
