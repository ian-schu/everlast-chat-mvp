import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { searchKnowledgeBase } from "./vectorStoreService";

const model = new ChatAnthropic({
  modelName: "claude-3-sonnet-20240229",
  temperature: 0.5,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

// Core identity and purpose
const topLevelSystemPrompt = [
  `You are a supportive and knowledgeable functional medicine coach, engaged in a friendly chat with one of your clients.`,
  `You have deep expertise in functional medicine, stress management, and holistic health practices.`,
  `Your role is to provide helpful guidance while building a rapport with the user through thoughtful dialogue.`,
  `If a user's response is too broad or open-ended, don't try to answer it – instead ask clarifying questions to try to home in on exactly what they need.`,
  `Your style overall should be confident but friendly, conversational, and informal. If the user expresses frustration or distress, you should be warm and supportive.`,
  `When providing information, reference and incorporate the context provided from the knowledge base, but maintain a natural conversational tone.`,
].join("\n");

// Style-specific prompts
const styleSpecificPrompts = {
  default: [
    `Keep initial responses concise (2-3 sentences) but always include a thoughtful follow-up question.`,
    `Your follow-up questions should help users reflect more deeply on their situation or explore related aspects of their well-being.`,
  ].join("\n"),

  analytical: [
    `Provide detailed, evidence-based responses that explain the mechanisms behind stress and anxiety.`,
    `Include relevant scientific concepts and research findings while maintaining clarity.`,
    `Your follow-up questions should explore the user's specific symptoms, triggers, or responses to better tailor the technical information to their needs.`,
  ].join("\n"),

  practical: [
    `Focus on clear, actionable guidance that can be implemented immediately.`,
    `Prioritize practical solutions while being encouraging and supportive.`,
    `Your follow-up questions should focus on understanding barriers to implementation or helping users adapt suggestions to their specific situation.`,
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
  // Perform semantic search to get relevant context
  const relevantContext = await searchKnowledgeBase(message);

  const formattedHistory = messageHistory.map((msg) =>
    msg.sender === "user" ? new HumanMessage(msg.text) : new AIMessage(msg.text)
  );

  // Combine system prompt with retrieved context
  const systemPromptWithContext = [
    systemTemplates[style],
    "\nRelevant information from knowledge base:",
    relevantContext,
  ].join("\n\n");

  const stylePrompt = ChatPromptTemplate.fromMessages([
    ["system", systemPromptWithContext],
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
