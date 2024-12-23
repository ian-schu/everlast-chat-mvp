import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

const model = new ChatAnthropic({
  modelName: "claude-3-sonnet-20240229",
  temperature: 0.5,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a helpful AI assistant. Provide clear, concise responses in 1-2 sentences.",
  ],
  new MessagesPlaceholder("history"),
  ["human", "{input}"],
]);

export async function generateChatResponse(
  message: string,
  messageHistory: Array<{ sender: string; text: string }>
) {
  const formattedHistory = messageHistory.map((msg) =>
    msg.sender === "user" ? new HumanMessage(msg.text) : new AIMessage(msg.text)
  );

  const chain = prompt.pipe(model);

  const response = await chain.invoke({
    history: formattedHistory,
    input: message,
  });

  return response.content;
}
