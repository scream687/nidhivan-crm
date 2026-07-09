"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Play, Trash2, Loader2 } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface VoiceRecorderProps {
  leadId: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function VoiceRecorder({ leadId, onSuccess, onClose }: VoiceRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "stopped" | "uploading">("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setUnsupported(true);
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      setDuration(0);

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        clearTimer();
        const blob = new Blob(chunks.current, { type: recorder.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.current = recorder;
      recorder.start();
      setState("recording");

      timer.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  }, [clearTimer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    setState("stopped");
  }, []);

  const discard = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setState("idle");
  }, [audioUrl]);

  const upload = useCallback(async () => {
    if (!audioBlob) return;
    setState("uploading");
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, `voice-note-${Date.now()}.webm`);
      await api.post(`/leads/${leadId}/voice-note`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Voice note sent");
      discard();
      onSuccess?.();
    } catch {
      toast.error("Failed to upload voice note");
      setState("stopped");
    }
  }, [audioBlob, leadId, discard, onSuccess]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  if (unsupported) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
        <Mic size={14} className="text-gray-300" />
        Voice recording not supported in this browser
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      {state === "idle" && (
        <button
          onClick={startRecording}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg px-2.5 py-1.5 transition"
          title="Record voice note"
        >
          <Mic size={13} />
          Voice Note
        </button>
      )}

      {state === "recording" && (
        <>
          <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {formatDuration(duration)}
          </div>
          <button
            onClick={stopRecording}
            className="flex items-center gap-1 text-xs bg-red-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-red-700 transition font-medium"
          >
            <Square size={12} />
            Stop
          </button>
        </>
      )}

      {(state === "stopped" || state === "uploading") && audioUrl && (
        <>
          <button
            onClick={() => {
              const audio = new Audio(audioUrl);
              audio.play();
            }}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg px-2.5 py-1.5 transition"
          >
            <Play size={12} />
            Listen
          </button>

          <button
            onClick={upload}
            disabled={state === "uploading"}
            className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
          >
            {state === "uploading" ? <Loader2 size={12} className="animate-spin" /> : <Mic size={12} />}
            Send
          </button>

          <button
            onClick={discard}
            disabled={state === "uploading"}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 transition"
          >
            <Trash2 size={12} />
            Discard
          </button>

          <span className="text-xs text-gray-400">{formatDuration(duration)}</span>
        </>
      )}
    </div>
  );
}
