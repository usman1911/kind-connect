export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "emotisense_chat_sessions";
const ACTIVE_SESSION_KEY = "emotisense_active_session";

export function getSessions(): ChatSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: ChatSession) {
  const sessions = getSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function deleteSession(id: string) {
  const sessions = getSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

export function setActiveSessionId(id: string) {
  localStorage.setItem(ACTIVE_SESSION_KEY, id);
}

export function createNewSession(): ChatSession {
  const session: ChatSession = {
    id: crypto.randomUUID(),
    title: "New Chat",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveSession(session);
  setActiveSessionId(session.id);
  return session;
}

export function generateTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find(m => m.role === "user");
  if (!firstUserMsg) return "New Chat";
  return firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? "…" : "");
}
