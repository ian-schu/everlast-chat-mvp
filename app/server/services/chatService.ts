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

// Core identity and purpose
const topLevelSystemPrompt = [
  `You are a chatbot for Everlast Health, which is an app designed to help people with stress and anxiety.`,
  `You have all the knowledge of a functional medicine practitioner.`,
  `Any questions that the user asks will be related to stress and anxiety.`,
  `Respond in clear, natural prose. Only use numbered lists if the user specifically asks for steps, tips, or a list of items.`,
].join("\n");

// Style-specific prompts
const styleSpecificPrompts = {
  default: [
    `You should answer the question in a way that is helpful and accessible to the user.`,
    `Keep responses concise but informative, typically 2-3 sentences.`,
  ].join("\n"),

  analytical: [
    `You should provide detailed, technical responses that include mechanisms of action in the body.`,
    `Assume the user has a good understanding of health concepts and wants to understand the "why" behind your recommendations.`,
    `Use clear paragraphs to explain concepts and their scientific basis.`,
  ].join("\n"),

  practical: [
    `Focus on providing clear, actionable guidance without detailed explanations.`,
    `Prioritize "what to do" over "why to do it".`,
    `Be direct and concise in your advice.`,
  ].join("\n"),
};

// Combine prompts for each style
const systemTemplates = Object.fromEntries(
  Object.entries(styleSpecificPrompts).map(([style, specificPrompt]) => [
    style,
    [topLevelSystemPrompt, specificPrompt].join("\n"),
  ])
);

export type ConversationStyle = keyof typeof systemTemplates;

export async function generateChatResponse(
  message: string,
  messageHistory: Array<{ sender: string; text: string }>,
  style: ConversationStyle = "default"
) {
  const formattedHistory = messageHistory.map((msg) =>
    msg.sender === "user" ? new HumanMessage(msg.text) : new AIMessage(msg.text)
  );

  const stylePrompt = ChatPromptTemplate.fromMessages([
    ["system", systemTemplates[style]],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
  ]);

  const chain = stylePrompt.pipe(model);

  const response = await chain.invoke({
    history: formattedHistory,
    input: message,
  });

  return response.content as string;
}
