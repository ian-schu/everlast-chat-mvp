"use client";

import { trpc } from "@/app/utils/trpc";
import { useState } from "react";

type ConversationStyle = "default" | "analytical" | "practical";

type SearchResult = {
  content: string;
  score: number;
  source: string;
};

// Update Message type to include style detection info
type Message = {
  sender: "user" | "app";
  text: string;
  style: ConversationStyle;
  timestamp: string;
  searchResults?: SearchResult[];
  styleDetection?: {
    requestingStyle: boolean;
    confidence: number;
    suggestedStyle?: ConversationStyle;
    explanation: string;
  };
};

const formatMessageText = (text: string) => {
  // Split text into lines
  const lines = text.split(/\n+/);

  return lines.map((line, i) => {
    // Check for numbered lists (e.g., "1.", "2.", etc.)
    const numberedMatch = line.match(/^\s*(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      return (
        <div key={i} className="flex gap-2 mb-1">
          <span className="min-w-[20px]">{numberedMatch[1]}.</span>
          <span>{numberedMatch[2]}</span>
        </div>
      );
    }

    // Check for bullet points
    const bulletMatch = line.match(/^\s*[-•]\s+(.+)/);
    if (bulletMatch) {
      return (
        <div key={i} className="flex gap-2 mb-1">
          <span className="min-w-[20px]">•</span>
          <span>{bulletMatch[1]}</span>
        </div>
      );
    }

    // Regular text
    return (
      <div key={i} className="mb-1">
        {line}
      </div>
    );
  });
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState<ConversationStyle>("default");
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(
    new Set()
  );

  const chatCompletion = trpc.chat.chatCompletion.useMutation({
    onSuccess: (data) => {
      // Update the style if a change was detected
      if (data.newStyle) {
        setStyle(data.newStyle);
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "app",
          text: data.answer,
          style: data.newStyle || style,
          timestamp: new Date().toISOString(),
          searchResults: data.searchResults,
          styleDetection: data.styleDetection,
        },
      ]);
      setLoading(false);
    },
  });

  const sendMessage = () => {
    if (input.trim() === "") return;
    const newMessage: Message = {
      sender: "user",
      text: input,
      style,
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    chatCompletion.mutate({
      message: input,
      messageHistory: updatedMessages,
      style,
    });
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col max-w-6xl bg-gray-100 p-4 rounded-lg shadow-lg">
        <div className="mb-4">
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as ConversationStyle)}
            className="p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="default">Default</option>
            <option value="analytical">Analytical</option>
            <option value="practical">Practical</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto mb-4">
          {messages.map((msg, index) => (
            <div key={index} className="mb-4 flex items-start gap-2">
              <div className="flex-1">
                <div
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  } mb-2`}
                >
                  <div
                    className={`max-w-xl p-2 rounded-lg ${
                      msg.sender === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-300 text-gray-900"
                    }`}
                  >
                    {msg.sender === "user" ? (
                      msg.text
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {formatMessageText(msg.text)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {isDebugOpen && (
                <div className="w-96 text-xs text-gray-500 pt-2 bg-gray-100 p-2 rounded">
                  <div>Style: {msg.style}</div>
                  <div>{new Date(msg.timestamp).toLocaleTimeString()}</div>
                  {msg.styleDetection && (
                    <div className="mt-1 border-t border-gray-200 pt-1">
                      <div className="font-semibold">Style Detection:</div>
                      <div>
                        Requesting Change:{" "}
                        {msg.styleDetection.requestingStyle ? "Yes" : "No"}
                      </div>
                      <div>
                        Confidence:{" "}
                        {(msg.styleDetection.confidence * 100).toFixed(1)}%
                      </div>
                      {msg.styleDetection.suggestedStyle && (
                        <div>
                          Suggested Style: {msg.styleDetection.suggestedStyle}
                        </div>
                      )}
                      <div className="text-gray-600 italic">
                        {msg.styleDetection.explanation}
                      </div>
                    </div>
                  )}
                  {msg.sender === "app" && msg.searchResults && (
                    <div className="mt-2">
                      <div className="font-semibold">
                        RAG Results ({msg.searchResults.length}):
                      </div>
                      {msg.searchResults.map((result, idx) => {
                        const resultKey = `${msg.timestamp}-${idx}`;
                        const isExpanded = expandedResults.has(resultKey);
                        return (
                          <div
                            key={idx}
                            className="mt-1 border-t border-gray-200 pt-1"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div>Source: {result.source}</div>
                                <div>
                                  Score: {(result.score * 100).toFixed(1)}%
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedResults);
                                  if (isExpanded) {
                                    newExpanded.delete(resultKey);
                                  } else {
                                    newExpanded.add(resultKey);
                                  }
                                  setExpandedResults(newExpanded);
                                }}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <svg
                                  className={`w-4 h-4 transition-transform ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="mt-1 p-2 bg-white rounded text-gray-700 whitespace-pre-wrap">
                                {result.content}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start mb-2">
              <div className="max-w-xs p-2 rounded-lg bg-gray-300 text-gray-900">
                ...
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-row justify-between items-start gap-2">
          <textarea
            className="flex-1 p-2 border rounded-lg focus:outline-none resize-none overflow-hidden min-h-[40px] max-h-[200px]"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type your message..."
            rows={1}
          />
          <button
            className="h-10 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors self-end"
            onClick={sendMessage}
          >
            Send
          </button>
        </div>
      </div>

      <button
        onClick={() => setIsDebugOpen(!isDebugOpen)}
        className={`ml-2 p-2 h-12 transition-colors rounded-lg ${
          isDebugOpen ? "bg-gray-300" : "bg-gray-200 hover:bg-gray-300"
        }`}
        title="Toggle Debug Panel"
      >
        <svg
          className={`w-6 h-6 transition-transform ${
            isDebugOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}
