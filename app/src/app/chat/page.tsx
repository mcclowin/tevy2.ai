"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { listInstances } from "@/lib/api";
import { isAuthenticated, getUser } from "@/lib/auth";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
};

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<{
    id: string;
    webchatUrl: string;
    gateway_token: string;
    fly_machine_name: string;
  } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load instance info
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadInstance();
  }, [router]);

  async function loadInstance() {
    try {
      const { instances } = await listInstances();
      if (instances && instances.length > 0) {
        const inst = instances[0] as any;
        setInstance({
          id: inst.id,
          webchatUrl: inst.webchatUrl || `https://${inst.fly_machine_name}.fly.dev`,
          gateway_token: inst.gateway_token,
          fly_machine_name: inst.fly_machine_name,
        });
      } else {
        setError("No bot instance found. Create one from the dashboard first.");
      }
    } catch (err) {
      setError("Failed to load bot instance");
    }
  }

  // Connect WebSocket to bot's gateway
  const connectWs = useCallback(() => {
    if (!instance) return;

    const wsUrl = instance.webchatUrl
      .replace("https://", "wss://")
      .replace("http://", "ws://");

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Authenticate
        ws.send(JSON.stringify({
          type: "connect",
          params: {
            auth: instance.gateway_token,
          },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "connected") {
            setConnected(true);
            setError(null);
            // Fetch history
            ws.send(JSON.stringify({ type: "chat.history", limit: 50 }));
          }

          if (data.type === "chat.history") {
            const history = (data.messages || []).map((m: any, i: number) => ({
              id: `hist-${i}`,
              role: m.role === "user" ? "user" : "assistant",
              text: m.content || m.text || "",
              timestamp: m.timestamp || Date.now(),
            })).filter((m: Message) => m.text.trim());
            setMessages(history);
          }

          if (data.type === "chat.message" || data.type === "chat.reply") {
            const msg: Message = {
              id: `msg-${Date.now()}`,
              role: data.role === "user" ? "user" : "assistant",
              text: data.content || data.text || "",
              timestamp: Date.now(),
            };
            if (msg.text.trim()) {
              setMessages((prev) => [...prev, msg]);
            }
            if (msg.role === "assistant") {
              setLoading(false);
            }
          }

          if (data.type === "chat.stream") {
            // Handle streaming responses
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === "assistant" && last.id.startsWith("stream-")) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: last.text + (data.delta || data.content || "") },
                ];
              }
              return [
                ...prev,
                {
                  id: `stream-${Date.now()}`,
                  role: "assistant",
                  text: data.delta || data.content || "",
                  timestamp: Date.now(),
                },
              ];
            });
          }

          if (data.type === "chat.stream.end") {
            setLoading(false);
          }

          if (data.type === "error") {
            setError(data.message || "Connection error");
            setLoading(false);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Reconnect after 5s
        setTimeout(() => connectWs(), 5000);
      };

      ws.onerror = () => {
        setError("WebSocket connection failed. Is your bot running?");
        setConnected(false);
      };
    } catch {
      setError("Failed to connect to bot");
    }
  }, [instance]);

  // Connect when instance is loaded
  useEffect(() => {
    if (instance) {
      connectWs();
    }
    return () => {
      wsRef.current?.close();
    };
  }, [instance, connectWs]);

  function sendMessage() {
    if (!input.trim() || !wsRef.current || !connected) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    wsRef.current.send(JSON.stringify({
      type: "chat.send",
      message: input,
    }));
    setInput("");
    setLoading(true);
    inputRef.current?.focus();
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {/* Header */}
      <div className="glass border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <a href="/dashboard" className="text-[var(--muted)] hover:text-[var(--foreground)] transition">
          ← Dashboard
        </a>
        <div className="flex-1" />
        <img src="/logo-wizard.jpg" alt="Tevy" className="w-8 h-8 rounded-full" />
        <div>
          <div className="font-semibold text-sm">Tevy</div>
          <div className="text-xs text-[var(--muted)] flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
            {connected ? "Connected" : "Disconnected"}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">👋</div>
            <h2 className="text-xl font-bold mb-2">Chat with Tevy</h2>
            <p className="text-[var(--muted)] text-sm mb-6">
              Ask Tevy to draft posts, research competitors, or run an SEO audit.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "Draft 3 Instagram posts for this week",
                "Research what my competitors are posting",
                "Run an SEO audit of my website",
                "Suggest content ideas for spring",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="glass rounded-full px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[var(--accent)] text-white rounded-br-md"
                  : "glass rounded-bl-md"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="glass rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder={connected ? "Ask Tevy anything..." : "Connecting..."}
            disabled={!connected}
            className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!connected || !input.trim()}
            className="bg-[var(--accent)] text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
