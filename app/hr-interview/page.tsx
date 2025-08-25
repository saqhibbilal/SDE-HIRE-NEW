"use client"

import { useState } from "react"
import { AuthLayout } from "@/components/layout/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Menu,
  X,
  User,
  Bot,
  Paperclip,
  Camera,
  Clock,
  Briefcase
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function HRInterviewPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [inputMessage, setInputMessage] = useState("")
  const [messages, setMessages] = useState<any[]>([])
  const [chatHistory] = useState([
    { id: 1, title: "Interview Session 1", date: "2024-01-15" },
    { id: 2, title: "Interview Session 2", date: "2024-01-14" },
    { id: 3, title: "Interview Session 3", date: "2024-01-13" },
  ])

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return
    
    const newMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date().toLocaleTimeString()
    }
    
    setMessages([...messages, newMessage])
    setInputMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <AuthLayout>
      <div className="min-h-screen bg-background">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">HR Interview Page</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden"
            >
              {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex h-[calc(100vh-120px)] gap-4">
            {/* Chat History Sidebar */}
            <div className={cn(
              "w-64 bg-card border rounded-lg p-4 transition-all duration-300",
              isSidebarOpen ? "block" : "hidden lg:block"
            )}>
                             <Button 
                 className="w-full mb-3 bg-blue-600 hover:bg-blue-700"
                 onClick={() => {
                   setMessages([])
                   setIsSidebarOpen(false)
                 }}
               >
                 <Plus className="w-4 h-4 mr-2" />
                 New Chat
               </Button>
               
               <div className="space-y-1">
                 <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent Interviews</h3>
                {chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{chat.title}</p>
                      <p className="text-xs text-muted-foreground">{chat.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

                         {/* Chat Area */}
             <div className="flex-1 flex flex-col bg-card border rounded-lg min-h-0">
                               {/* Messages Area */}
                <div className="flex-1 p-3 overflow-y-auto min-h-0">
                 {messages.length === 0 ? (
                   <div className="flex items-center justify-center h-full">
                     <div className="text-center">
                       <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                         <Briefcase className="w-6 h-6 text-blue-600 animate-pulse" />
                       </div>
                       <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                         HR Interview Simulator
                       </h2>
                       <p className="text-sm text-muted-foreground mb-4 max-w-md">
                         Our AI-powered HR interview assistant is coming soon. 
                         Get ready for realistic interview practice with personalized feedback.
                       </p>
                       <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                         <Clock className="w-3 h-3 text-blue-600" />
                         <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                           Coming Soon
                         </span>
                       </div>
                     </div>
                   </div>
                 ) : (
                   <div className="space-y-4">
                     {messages.map((message) => (
                       <div
                         key={message.id}
                         className={cn(
                           "flex gap-3",
                           message.sender === "user" ? "justify-end" : "justify-start"
                         )}
                       >
                         {message.sender === "ai" && (
                           <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                             <Bot className="w-4 h-4 text-white" />
                           </div>
                         )}
                         
                         <div
                           className={cn(
                             "max-w-[70%] p-3 rounded-lg",
                             message.sender === "user"
                               ? "bg-blue-600 text-white rounded-br-none"
                               : "bg-muted text-foreground rounded-bl-none"
                           )}
                         >
                           <p className="text-sm">{message.text}</p>
                           <p className="text-xs opacity-70 mt-1">
                             {message.timestamp}
                           </p>
                         </div>
                         
                         {message.sender === "user" && (
                           <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                             <User className="w-4 h-4 text-muted-foreground" />
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 )}
               </div>

                               {/* Input Area */}
                <div className="border-t p-3 flex-shrink-0">
                 <div className="flex gap-2">
                   <Button
                     variant="outline"
                     size="sm"
                     className="flex-shrink-0"
                     title="Attach file"
                   >
                     <Paperclip className="w-4 h-4" />
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     className="flex-shrink-0"
                     title="Open camera"
                   >
                     <Camera className="w-4 h-4" />
                   </Button>
                   <Input
                     value={inputMessage}
                     onChange={(e) => setInputMessage(e.target.value)}
                     onKeyPress={handleKeyPress}
                     placeholder="Type your message..."
                     className="flex-1"
                   />
                   <Button 
                     onClick={handleSendMessage}
                     disabled={!inputMessage.trim()}
                     className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                   >
                     <Send className="w-4 h-4" />
                   </Button>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
