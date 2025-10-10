'use client'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

const ChatClient = dynamic(
  () => import('@/components/chat/chat-client').then(mod => mod.ChatClient),
  { 
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] h-[calc(100vh-60px)] border-t">
        <aside className="border-r flex flex-col">
          <header className="p-4 border-b">
            <Skeleton className="h-6 w-1/2" />
          </header>
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        </aside>
        <main className="flex flex-col h-full items-center justify-center">
            <Skeleton className="h-16 w-16" />
            <Skeleton className="h-4 w-48 mt-4" />
        </main>
      </div>
    )
  }
)

export default function ChatPage() {
  return <ChatClient />;
}