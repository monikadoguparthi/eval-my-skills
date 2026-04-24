import { useEffect, useRef, useState } from "react";

// Browser Web Speech API wrapper
// - Streams interim results live to `onInterim`
// - Commits final results via `onFinal` (append to textarea)
// - Auto-stops after `silenceMs` of no new speech
export function useSpeechRecognition(
  onFinal: (text: string) => void,
  onInterim?: (text: string) => void,
  silenceMs: number = 3000,
) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const finalCbRef = useRef(onFinal);
  const interimCbRef = useRef(onInterim);
  const silenceTimerRef = useRef<number | null>(null);
  const manualStopRef = useRef(false);

  useEffect(() => {
    finalCbRef.current = onFinal;
    interimCbRef.current = onInterim;
  }, [onFinal, onInterim]);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const armSilenceTimer = () => {
    clearSilenceTimer();
    silenceTimerRef.current = window.setTimeout(() => {
      manualStopRef.current = true;
      try {
        recRef.current?.stop();
      } catch {}
    }, silenceMs);
  };

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
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interimText += t;
      }
      if (interimText && interimCbRef.current) interimCbRef.current(interimText);
      if (finalText) finalCbRef.current(finalText);
      // any speech resets the silence timer
      armSilenceTimer();
    };
    rec.onend = () => {
      clearSilenceTimer();
      setListening(false);
      // clear any leftover interim preview
      interimCbRef.current?.("");
    };
    rec.onstart = () => {
      setError(null);
      setListening(true);
      armSilenceTimer();
    };
    rec.onspeechstart = () => armSilenceTimer();
    rec.onerror = (ev: any) => {
      const err = ev?.error || ev;
      console.error("SpeechRecognition error:", err);
      if (err === "not-allowed" || err === "service-not-allowed") {
        setError("Please allow microphone access to use voice input.");
      } else if (err === "no-speech") {
        return;
      } else if (err === "audio-capture") {
        setError("No microphone detected.");
      } else if (typeof err === "string") {
        setError(`Speech recognition error: ${err}`);
      }
      clearSilenceTimer();
      setListening(false);
    };
    recRef.current = rec;
    return () => {
      clearSilenceTimer();
      try {
        rec.stop();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    if (!recRef.current) return;
    manualStopRef.current = false;
    setError(null);
    try {
      recRef.current.start();
      setListening(true);
    } catch (e) {
      console.error("SR start failed:", e);
      try {
        recRef.current.stop();
      } catch {}
    }
  };
  const stop = () => {
    if (!recRef.current) return;
    manualStopRef.current = true;
    clearSilenceTimer();
    try {
      recRef.current.stop();
    } catch {}
    setListening(false);
  };

  return { listening, supported, error, start, stop };
}