/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send, Sparkles, MessageSquare, Volume2, HelpCircle } from "lucide-react";
import { VoiceMessage, CurrentWeather } from "../types";

interface VoiceAssistantProps {
  weatherContext: CurrentWeather | null;
}

export default function VoiceAssistant({ weatherContext }: VoiceAssistantProps) {
  const [messages, setMessages] = useState<VoiceMessage[]>([
    {
      id: "welcome-msg",
      sender: "assistant",
      text: "Hello! I am your AeroCast companion. Ask me anything about the current weather conditions, clothes suggestions, or click a shortcut below!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Audio ref for vocal synthesizer tracking
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    // Cancel prior speech streams first
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  // Browser Recognition initializer
  const startSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition API is not supported in this browser. Please type your query!");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (e: any) => {
      const resultText = e.results[0][0].transcript;
      setInputText(resultText);
      setIsListening(false);
      handleMessageSend(resultText);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech Recognition error:", e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleMessageSend = async (queryText: string) => {
    if (!queryText.trim()) return;

    // Append user query bubble to list
    const userMsg: VoiceMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/weather/voice-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText,
          weatherContext,
        }),
      });

      if (!response.ok) {
        throw new Error("Assistant is overloaded at this time");
      }

      const data = await response.json();
      const assistantText = data.reply || "I am connected to satellite parameters but could not fetch results now.";

      const assistantMsg: VoiceMessage = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: assistantText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      // Narrate speech synthesized answer aloud
      speakText(assistantText);
    } catch (err: any) {
      console.error(err);
      const errMsg: VoiceMessage = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: "I experienced brief disruptions speaking to the cloud. Please verify backend networks.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeShortcutQuery = (query: string) => {
    handleMessageSend(query);
  };

  return (
    <div className="glass border border-white/10 rounded-3xl p-5 shadow-2xl max-w-md mx-auto flex flex-col h-[520px] relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
      {/* Voice Core Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/10 rounded-xl border border-cyan-500/25">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gradient leading-tight tracking-wider uppercase">AeroCast AI Voice</h3>
            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
              {isSpeaking ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-bounce" /> SPEAKING NOW
                </>
              ) : (
                "COMPANION STANDBY"
              )}
            </span>
          </div>
        </div>

        {isListening && (
          <span className="bg-red-950/40 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-[9px] font-bold animate-pulse tracking-wider block uppercase">
            Listening...
          </span>
        )}
      </div>

      {/* Dialect message log screen */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 scrollbar-thin z-10">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[85%] ${
              msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
            }`}
          >
            <div
              className={`p-3 text-xs rounded-2xl leading-relaxed shadow-md ${
                msg.sender === "user"
                  ? "bg-cyan-500 text-slate-950 rounded-br-none font-bold shadow-cyan-500/10"
                  : "glass text-slate-250 rounded-bl-none border border-white/10"
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[9px] text-slate-500 mt-1 px-1 font-mono">{msg.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs p-1">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce" />
            </div>
            <span className="text-[10px] italic font-mono text-slate-450">Meteorologist thinking...</span>
          </div>
        )}
      </div>

      {/* Suggested Chat Shortcuts Row */}
      <div className="flex flex-wrap gap-1.5 mb-3 shrink-0 z-10">
        <button
          id="btn-voice-shortcut-1"
          onClick={() => executeShortcutQuery("Will it rain today?")}
          className="text-[9px] font-mono text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-xl transition shrink-0"
        >
          Rain warning?
        </button>
        <button
          id="btn-voice-shortcut-2"
          onClick={() => executeShortcutQuery("What should I wear based on the temperature?")}
          className="text-[9px] font-mono text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-xl transition shrink-0"
        >
          Outfit suggest?
        </button>
        <button
          id="btn-voice-shortcut-3"
          onClick={() => executeShortcutQuery("What can I do outdoors today?")}
          className="text-[9px] font-mono text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-xl transition shrink-0"
        >
          Outdoor tasks?
        </button>
      </div>

      {/* Dialect search bar and Mic triggers */}
      <div className="flex gap-2 items-stretch shrink-0 relative z-10">
        <button
          id="btn-voice-trigger-mic"
          onClick={startSpeechRecognition}
          className={`p-3 rounded-2xl border flex items-center justify-center transition cursor-pointer ${
            isListening 
              ? "bg-red-600 text-white border-red-500 animate-pulse shadow-md shadow-red-600/30" 
              : "bg-white/5 text-cyan-400 border-white/10 hover:text-cyan-300 hover:bg-white/10"
          }`}
          title="Click to speak aloud"
        >
          {isListening ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5" />}
        </button>

        <input
          id="inp-voice-text"
          type="text"
          className="flex-1 bg-slate-950/60 focus:bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
          placeholder="Ask e.g. 'Carry umbrella today?'"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleMessageSend(inputText)}
        />

        <button
          id="btn-voice-submit"
          onClick={() => handleMessageSend(inputText)}
          className="p-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-2xl flex items-center justify-center transition shadow-md shadow-cyan-500/10 active:scale-95"
        >
          <Send className="w-4 h-4 text-slate-900" />
        </button>
      </div>
    </div>
  );
}
