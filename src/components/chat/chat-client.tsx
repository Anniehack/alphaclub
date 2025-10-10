

"use client"

import { useState, useEffect, useRef, useMemo } from "react";
import { useUser } from "@/hooks/use-user";
import { 
    getMessages,
    addMessage,
    getOrCreateGeneralChatForOBC,
    getAllOBCs,
    onNotificationsUpdate,
    markNotificationAsRead,
} from "@/services/firestore";
import type { Conversation, ChatMessage, User, OBC, Notification } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Paperclip, Send, Smile, Loader2, MessageSquare, Users, Search } from "lucide-react";
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TEAM_ADMIN_ID = 'alphajet-team-admin';
const TEAM_ADMIN_NAME = 'AlphaJet Team';
const TEAM_ADMIN_AVATAR = 'https://firebasestorage.googleapis.com/v0/b/alphaclub-ev7kl.firebasestorage.app/o/logo%2FLogo%20(1).png?alt=media&token=533c6cbd-0524-454e-ad2a-e0dba243b2c1';


const getInitials = (name: string = '') => {
    if (!name) return '??';
    if (name === TEAM_ADMIN_NAME) return 'AJ';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function MessageBubble({ message, isSender }: { message: ChatMessage, isSender: boolean }) {
    return (
        <div className={cn("flex items-end gap-2", isSender ? "justify-end" : "justify-start")}>
            {!isSender && (
                <Avatar className="h-8 w-8">
                    <AvatarImage src={message.senderAvatar} data-ai-hint="person avatar" />
                    <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
                </Avatar>
            )}
            <div className={cn(
                "max-w-md rounded-lg p-3",
                isSender ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
                {!isSender && <p className="text-xs font-bold mb-1">{message.senderName}</p>}
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                 <p className="text-xs mt-1 opacity-70 text-right">
                    {message.timestamp ? format(new Date(message.timestamp), 'p') : ''}
                </p>
            </div>
        </div>
    );
}

// Reusable ChatWindow component
function ChatWindow({ 
    conversation, 
    currentUser,
    overrideName,
    overrideAvatar,
}: { 
    conversation: Conversation, 
    currentUser: User,
    overrideName?: string,
    overrideAvatar?: string,
}) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    
    useEffect(() => {
    if (!conversation.id) return;
    setMessages([]);
    const unsubscribe = getMessages(conversation.id, (msgs) => {
        setMessages(msgs);
        scrollToBottom();
    });
    return () => unsubscribe();
}, [conversation.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollAreaRef.current) {
                const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
                if (viewport) viewport.scrollTop = viewport.scrollHeight;
            }
        }, 100);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        setSending(true);

        const messageData: Omit<ChatMessage, 'id' | 'timestamp'> = {
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar || '',
            text: newMessage,
        };

        try {
            await addMessage(conversation.id, messageData);
            setNewMessage("");
        } catch (error) {
            console.error("Failed to send message:", error);
            toast({ variant: 'destructive', title: "Send Error", description: "Could not send your message." });
        } finally {
            setSending(false);
        }
    };

    const onEmojiClick = (emojiObject: EmojiClickData) => {
        setNewMessage(prev => prev + emojiObject.emoji);
    };
    
    // Determine the other participant for display purposes.
    const otherParticipant = Object.values(conversation.participants).find(p => p.id !== currentUser.id);

    const displayName = overrideName || otherParticipant?.name || 'Chat';
    const displayAvatar = overrideAvatar || otherParticipant?.avatar;
    const chatTitle = conversation.missionTitle === 'General Chat' ? "General Support" : conversation.missionTitle;

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center gap-4 p-4 border-b">
                <Avatar>
                    <AvatarImage src={displayAvatar} data-ai-hint="person avatar" />
                    <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="font-semibold">{displayName}</h2>
                    <p className="text-sm text-muted-foreground">{chatTitle}</p>
                </div>
            </header>
            <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
                 <div className="space-y-4">
                    {messages.map((msg) => {
                        const isSender = msg.senderId === currentUser.id;
                        return <MessageBubble key={msg.id} message={msg} isSender={isSender} />
                    })}
                </div>
            </ScrollArea>
            <div className="p-4 border-t">
                <div className="relative">
                    <Input 
                        placeholder="Type a message..." 
                        className="pr-28"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
                        disabled={sending}
                    />
                    <div className="absolute top-1/2 right-2 transform -translate-y-1/2 flex items-center gap-1">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon"><Smile /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-auto">
                                <EmojiPicker onEmojiClick={onEmojiClick} />
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="icon"><Paperclip /></Button>
                        <Button size="sm" onClick={handleSendMessage} disabled={sending}>
                            {sending ? <Loader2 className="animate-spin" /> : <Send />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}


// Admin-specific view
function AdminChatView({ currentUser }: { currentUser: User }) {
    const [allObcs, setAllObcs] = useState<OBC[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedObc, setSelectedObc] = useState<OBC | null>(null);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [loadingConvo, setLoadingConvo] = useState(false);
    const [unreadConversations, setUnreadConversations] = useState<Set<string>>(new Set());
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onNotificationsUpdate(currentUser.id, (newNotifications) => {
            setNotifications(newNotifications);
            const unread = new Set(
                newNotifications
                    .filter(n => !n.read && n.type === 'mission_update')
                    .map(n => n.relatedId)
            );
            setUnreadConversations(unread);
        });
        return () => unsubscribe();
    }, [currentUser.id]);

    const handleSelectObc = async (obc: OBC) => {
        setSelectedObc(obc);
        
        const obcConvoId = [obc.id, currentUser.id].sort().join('_');
        const relatedNotifications = notifications.filter(n => n.relatedId === obcConvoId && !n.read);
        
        if (relatedNotifications.length > 0) {
            await Promise.all(
                relatedNotifications.map(n => markNotificationAsRead(currentUser.id, n.id))
            );
        }
    };

    useEffect(() => {
        getAllOBCs()
            .then(setAllObcs)
            .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch OBC list.' }))
            .finally(() => setLoading(false));
    }, [toast]);

    const filteredObcs = useMemo(() => {
        return allObcs.filter(obc => 
            obc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            obc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (obc.obcNumber && obc.obcNumber.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [allObcs, searchTerm]);

    useEffect(() => {
        if (!selectedObc) return;

        const loadConversation = async () => {
            setLoadingConvo(true);
            setConversation(null);
            try {
                // For admin view, we want a direct chat with the OBC.
                const convo = await getOrCreateGeneralChatForOBC(selectedObc, currentUser);
                if (convo) {
                    setConversation(convo);
                } else {
                    setConversation(null); 
                    toast({ variant: 'destructive', title: 'Error', description: 'Failed to load or create conversation.' });
                }
            } catch (error) {
                 toast({ variant: 'destructive', title: 'Error', description: 'Failed to load conversation.' });
                 console.error("Failed to load conversation:", error);
            } finally {
                setLoadingConvo(false);
            }
        };

        loadConversation();

    }, [selectedObc, currentUser, toast]);

    const hasUnread = (obcId: string): boolean => {
        // In the admin view, the conversation ID with an OBC is always their_id + current_admin_id
        const convoId = [obcId, currentUser.id].sort().join('_');
        return unreadConversations.has(convoId);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] h-full border-t">
            <aside className="border-r flex flex-col">
                <header className="p-4 border-b">
                    <h1 className="text-xl font-bold">OBC Chats</h1>
                    <div className="relative mt-2">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search OBCs..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </header>
                <ScrollArea className="flex-1">
                    {loading ? (
                        <div className="p-4 space-y-4">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                        </div>
                    ) : filteredObcs.length > 0 ? (
                        filteredObcs.map(obc => (
                            <button 
                                key={obc.id} 
                                className={cn(
                                    "flex gap-3 p-4 text-left w-full hover:bg-muted/50 items-center",
                                    selectedObc?.id === obc.id && 'bg-muted'
                                )}
                                onClick={() => handleSelectObc(obc)}
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={obc.avatar} data-ai-hint="person portrait" />
                                    <AvatarFallback>{getInitials(obc.name)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold truncate">{obc.name}</p>
                                        {hasUnread(obc.id) && <div className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {obc.obcNumber ? `#${obc.obcNumber}` : obc.email}
                                    </p>
                                </div>
                            </button>
                        ))
                    ) : (
                         <div className="p-4 text-center text-muted-foreground">
                            No OBCs found.
                        </div>
                    )}
                </ScrollArea>
            </aside>
            <main className="h-full">
                {loadingConvo ? (
                    <div className="flex flex-col h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : conversation ? (
                    <ChatWindow conversation={conversation} currentUser={currentUser} overrideName={selectedObc?.name} overrideAvatar={selectedObc?.avatar} />
                ) : (
                    <div className="flex flex-col h-full items-center justify-center text-center p-8">
                        {selectedObc ? (
                            <>
                                <MessageSquare className="h-16 w-16 text-muted-foreground/50" />
                                <h2 className="mt-4 text-xl font-semibold">Start Chat</h2>
                                <p className="text-muted-foreground">This will be the start of your conversation with {selectedObc.name}.</p>
                            </>
                        ) : (
                            <>
                                <Users className="h-16 w-16 text-muted-foreground/50" />
                                <h2 className="mt-4 text-xl font-semibold">Select an OBC</h2>
                                <p className="text-muted-foreground">Choose an OBC from the list to view their general chat.</p>
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

// OBC-specific view
function ObcChatView({ currentUser }: { currentUser: User }) {
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (!currentUser) return;
        getOrCreateGeneralChatForOBC(currentUser)
            .then(convo => {
                if (!convo) {
                    toast({ variant: 'destructive', title: 'Chat Error', description: 'Could not create or find the general support chat.' });
                }
                setConversation(convo);
            })
            .catch(err => {
                console.error("Failed to load general chat:", err);
                toast({ variant: "destructive", title: "Error", description: `Could not load the general chat. Reason: ${err.message}` });
            })
            .finally(() => setLoading(false));
    }, [currentUser, toast]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <main className="h-full border-t">
            {conversation ? (
                <ChatWindow 
                    conversation={conversation} 
                    currentUser={currentUser}
                    overrideName={TEAM_ADMIN_NAME}
                    overrideAvatar={TEAM_ADMIN_AVATAR}
                />
            ) : (
                <div className="flex flex-col h-full items-center justify-center text-center p-8">
                    <MessageSquare className="h-16 w-16 text-muted-foreground/50" />
                    <h2 className="mt-4 text-xl font-semibold">General Chat Unavailable</h2>
                    <p className="text-muted-foreground">Could not establish a connection with the support team.</p>
                </div>
            )}
        </main>
    );
}

// Main export
export function ChatClient() {
    const { user, loading: userLoading } = useUser();

    if (userLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!user) {
         return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>You must be logged in to chat.</p>
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-60px)]">
            {user.role === 'admin' ? <AdminChatView currentUser={user} /> : <ObcChatView currentUser={user} />}
        </div>
    );
}
