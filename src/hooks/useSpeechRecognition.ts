import { useEffect, useRef, useState } from "react";

// Browser Web Speech API wrapper
export function useSpeechRecognition(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);
  const cbRef = useRef(onTranscript);

  useEffect(() => {
    cbRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const SR =
      (typeof window !== "undefined" && (window as any).SpeechRecognition) ||
      (typeof window !== "undefined" && (window as any).webkitSpeechRecognition);
    if (!SR) {
      setSupported(false);
      return;
    }
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
    rec.onstart = () => setListening(true);
    rec.onerror = (ev: any) => {
      const err = ev?.error || ev;
      console.error("SpeechRecognition error:", err);
      if (err === "not-allowed" || err === "service-not-allowed") {
        alert("Microphone permission denied. Please allow mic access in your browser settings and reload.");
      } else if (err === "no-speech") {
        // ignore — user just didn't speak yet
        return;
      }
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
      // Already-started error: stop and restart
      try {
        recRef.current.stop();
      } catch {}
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