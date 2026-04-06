import { useState, useRef, useEffect, useCallback } from "react";
import { Heart, Send, Mic, MicOff, Volume2, VolumeX, Plus, Trash2, MessageSquare, ArrowLeft, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import {
  ChatMessage, ChatSession, getSessions, saveSession, deleteSession,
  getActiveSessionId, setActiveSessionId, createNewSession, generateTitle,
} from "@/lib/chatStorage";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

function EmotionBadge({ content }: { content: string }) {
  const match = content.match(/\[Emotion:\s*([^|]+)\|\s*Mood:\s*([^|]+)\|\s*Intensity:\s*([^\]]+)\]/);
  if (!match) return null;
  const [, emotion, mood, intensity] = match;
  const moodColor = mood.trim().toLowerCase() === "positive"
    ? "bg-green-100 text-green-800"
    : mood.trim().toLowerCase() === "negative"
      ? "bg-red-100 text-red-800"
      : "bg-muted text-muted-foreground";
  return (
    <div className="flex gap-1.5 mt-2 flex-wrap">
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${moodColor}`}>{emotion.trim()}</span>
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{intensity.trim()}</span>
    </div>
  );
}

function ChatBubble({ msg, onSpeak, isSpeaking }: { msg: ChatMessage; onSpeak: (t: string) => void; isSpeaking: boolean }) {
  const isUser = msg.role === "user";
  const displayContent = msg.content.replace(/\[Emotion:.*?\]/g, "").trim();

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
        <div className={`font-body text-sm leading-relaxed prose prose-sm max-w-none ${isUser ? "prose-invert" : ""}`}>
          <ReactMarkdown>{displayContent}</ReactMarkdown>
        </div>
        {!isUser && <EmotionBadge content={msg.content} />}
        {!isUser && (
          <button onClick={() => onSpeak(msg.content)} className="mt-2 text-muted-foreground hover:text-foreground transition-colors">
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(getSessions);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { isListening, transcript, startListening, stopListening, isSupported: sttSupported } = useSpeechRecognition();
  const { isSpeaking, speak, stop: stopSpeaking, isSupported: ttsSupported } = useSpeechSynthesis();

  // Load active session on mount
  useEffect(() => {
    const id = getActiveSessionId();
    const allSessions = getSessions();
    if (id) {
      const found = allSessions.find(s => s.id === id);
      if (found) { setActiveSession(found); return; }
    }
    if (allSessions.length > 0) {
      setActiveSession(allSessions[0]);
      setActiveSessionId(allSessions[0].id);
    }
  }, []);

  // Sync transcript to input
  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  const refreshSessions = () => setSessions(getSessions());

  const handleNewChat = () => {
    const session = createNewSession();
    setActiveSession(session);
    refreshSessions();
    setSidebarOpen(false);
  };

  const handleSelectSession = (s: ChatSession) => {
    setActiveSession(s);
    setActiveSessionId(s.id);
    setSidebarOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    refreshSessions();
    if (activeSession?.id === id) {
      const remaining = getSessions();
      if (remaining.length > 0) {
        setActiveSession(remaining[0]);
        setActiveSessionId(remaining[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    if (isListening) stopListening();

    let session = activeSession;
    if (!session) {
      session = createNewSession();
      setActiveSession(session);
      refreshSessions();
    }

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: input.trim(), timestamp: Date.now() };
    const updatedMessages = [...session.messages, userMsg];
    const updatedSession = {
      ...session,
      messages: updatedMessages,
      title: updatedMessages.length === 1 ? generateTitle(updatedMessages) : session.title,
      updatedAt: Date.now(),
    };
    setActiveSession(updatedSession);
    saveSession(updatedSession);
    refreshSessions();
    setInput("");
    setIsLoading(true);

    try {
      const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));
      // Send full history for emotion context
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages, chatHistory: apiMessages }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      // Stream response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      const assistantId = crypto.randomUUID();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setActiveSession(prev => {
                if (!prev) return prev;
                const msgs = [...prev.messages];
                const lastMsg = msgs[msgs.length - 1];
                if (lastMsg?.id === assistantId) {
                  msgs[msgs.length - 1] = { ...lastMsg, content: assistantContent };
                } else {
                  msgs.push({ id: assistantId, role: "assistant", content: assistantContent, timestamp: Date.now() });
                }
                const updated = { ...prev, messages: msgs, updatedAt: Date.now() };
                saveSession(updated);
                return updated;
              });
            }
          } catch { /* partial json */ }
        }
      }

      refreshSessions();

      // Auto-speak response
      if (autoSpeak && ttsSupported && assistantContent) {
        speak(assistantContent);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, activeSession, isListening, stopListening, autoSpeak, ttsSupported, speak, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleMic = () => {
    if (isListening) stopListening();
    else startListening();
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-lg text-foreground">
            <Heart className="w-4 h-4 text-primary fill-primary" />
            EmotiSense
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-3">
          <Button variant="soft" className="w-full justify-start gap-2 rounded-xl" onClick={handleNewChat}>
            <Plus className="w-4 h-4" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 pb-4">
            {sessions.map(s => (
              <div
                key={s.id}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${s.id === activeSession?.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                onClick={() => handleSelectSession(s)}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="text-sm font-body truncate flex-1">{s.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="font-display text-lg text-foreground truncate">{activeSession?.title || "New Chat"}</h1>
          <div className="ml-auto flex items-center gap-2">
            {ttsSupported && (
              <Button
                variant={autoSpeak ? "soft" : "ghost"}
                size="sm"
                className="gap-1.5 rounded-xl text-xs"
                onClick={() => { setAutoSpeak(!autoSpeak); if (isSpeaking) stopSpeaking(); }}
              >
                {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                Voice {autoSpeak ? "On" : "Off"}
              </Button>
            )}
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-6">
          <div className="max-w-2xl mx-auto">
            {(!activeSession || activeSession.messages.length === 0) && (
              <div className="text-center py-20">
                <Heart className="w-12 h-12 text-primary/30 mx-auto mb-4" />
                <h2 className="font-display text-2xl text-foreground mb-2">Start a conversation</h2>
                <p className="font-body text-muted-foreground text-sm max-w-sm mx-auto">
                  Talk to EmotiSense about anything. I'll listen, understand your emotions, and respond with empathy.
                </p>
              </div>
            )}
            {activeSession?.messages.map(msg => (
              <ChatBubble
                key={msg.id}
                msg={msg}
                onSpeak={(t) => isSpeaking ? stopSpeaking() : speak(t)}
                isSpeaking={isSpeaking}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-card border border-border rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input bar */}
        <div className="border-t border-border p-4 shrink-0">
          <div className="max-w-2xl mx-auto flex items-end gap-2">
            {sttSupported && (
              <Button
                variant={isListening ? "destructive" : "ghost"}
                size="icon"
                className="rounded-xl shrink-0"
                onClick={toggleMic}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening…" : "Type a message…"}
                rows={1}
                className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 pr-12 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                style={{ minHeight: "44px", maxHeight: "120px" }}
              />
              <Button
                variant="hero"
                size="icon"
                className="absolute bottom-1.5 right-1.5 rounded-xl h-8 w-8"
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          {isListening && (
            <div className="max-w-2xl mx-auto mt-2">
              <div className="flex items-center gap-2 text-xs text-primary font-body">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Recording… speak now
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
