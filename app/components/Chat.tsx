"use client";

import { trpc } from "@/app/utils/trpc";
import { useState } from "react";

// Define a Message type to enforce sender values
type Message = { sender: "user" | "app"; text: string };

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const chatCompletion = trpc.chat.chatCompletion.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { sender: "app", text: data.response }]);
      setLoading(false);
    },
  });

  const sendMessage = () => {
    if (input.trim() === "") return;
    const newMessage: Message = { sender: "user", text: input };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    chatCompletion.mutate({
      message: input,
      messageHistory: updatedMessages,
    });
  };

  return (
    <div className="flex flex-col h-full max-w-6xl bg-gray-100 p-4 rounded-lg shadow-lg mx-auto">
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((msg, index) => (
          <div
            key={index}
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
              {msg.text}
            </div>
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
            // Auto-adjust height
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
  );
}
