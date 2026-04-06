import { useState, useCallback, useRef } from "react";

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
  isSupported: boolean;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback((text: string) => {
    if (!isSupported) return;

    // Remove emotion tags from spoken text
    const cleanText = text.replace(/\[Emotion:.*?\]/g, "").trim();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.92;
    utterance.pitch = 1.1;
    utterance.volume = 1;

    // Pick a warm, natural-sounding female English voice
    const voices = window.speechSynthesis.getVoices();
    const femaleKeywords = ["female", "woman", "Samantha", "Karen", "Moira", "Tessa", "Fiona", "Victoria", "Zira", "Hazel", "Susan", "Jenny", "Aria"];
    const preferred =
      voices.find(v => v.lang.startsWith("en") && v.name.includes("Google") && femaleKeywords.some(k => v.name.includes(k)))
      || voices.find(v => v.lang.startsWith("en") && femaleKeywords.some(k => v.name.includes(k)))
      || voices.find(v => v.name.includes("Google UK English Female"))
      || voices.find(v => v.name.includes("Google US English") && !v.name.includes("Male"))
      || voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
      || voices.find(v => v.lang.startsWith("en"));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return { isSpeaking, speak, stop, isSupported };
}
