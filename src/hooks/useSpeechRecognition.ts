import { useEffect, useRef, useState } from "react";

// Browser Web Speech API wrapper
export function useSpeechRecognition(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);
  const cbRef = useRef(onTranscript);

  // Keep callback ref up to date so the SR instance always invokes the latest handler
  useEffect(() => {
    cbRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const SR =
      (typeof window !== "undefined" && (window as any).SpeechRecognition) ||
      (typeof window !== "undefined" && (window as any).webkitSpeechRecognition);
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
      }
      if (finalText) cbRef.current(finalText);
    };
    rec.onend = () => setListening(false);
    rec.onerror = (ev: any) => {
      console.error("SpeechRecognition error:", ev?.error || ev);
      setListening(false);
    };
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    if (!recRef.current) return;
    try {
      recRef.current.start();
      setListening(true);
    } catch (e) {
      console.error("SR start failed:", e);
    }
  };
  const stop = () => {
    if (!recRef.current) return;
    try {
      recRef.current.stop();
    } catch {}
    setListening(false);
  };

  return { listening, supported, start, stop };
}