import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { detectStyleRequest } from "./chatStyleDetectionService";
import { searchKnowledgeBase } from "./vectorStoreService";

const model = new ChatAnthropic({
  modelName: "claude-3-5-sonnet-latest",
  temperature: 0.5,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

// Core identity and purpose
const topLevelSystemPrompt = [
  `You are a supportive and knowledgeable functional medicine coach, engaged in a friendly chat with one of your clients.`,
  `You have deep expertise in functional medicine, stress management, and holistic health practices.`,
  `Your role is to provide helpful guidance while building a rapport with the user through thoughtful dialogue.`,
  `You MUST stay within your domain of expertise: stress management, functional medicine, and holistic health.`,
  `If a question is off-topic or unrelated to these areas, or if the knowledge base search returns low-quality results, politely and concisely redirect the user to health-related topics.`,
  `If a user's response is too broad or open-ended, don't try to answer it – instead ask clarifying questions to try to home in on exactly what they need.`,
  `Your style overall should be confident but friendly, conversational, and informal. If the user expresses frustration or distress, you should be warm and supportive.`,
  `When providing information, reference and incorporate the context provided from the knowledge base, but maintain a natural conversational tone.`,
  `IMPORTANT: Your responses must be extremely concise - no more than one short paragraph (2-3 sentences) followed by a single follow-up question. Never provide lists or multiple points.`,
].join("\n");

// Style-specific prompts
const styleSpecificPrompts = {
  default: [
    `Provide exactly one key insight or suggestion in 2-3 sentences, even when drawing from the knowledge base.`,
    `If you find multiple relevant points in the knowledge base, choose the single most relevant one and present it conversationally.`,
    `End with one thoughtful follow-up question to maintain dialogue.`,
  ].join("\n"),

  analytical: [
    `Present exactly one evidence-based insight in 2-3 sentences, even when drawing from the knowledge base.`,
    `If you find multiple scientific concepts, choose the single most relevant one and explain it simply.`,
    `End with one specific follow-up question about their experience with this concept.`,
  ].join("\n"),

  practical: [
    `Provide exactly one actionable suggestion in 2-3 sentences, even when drawing from the knowledge base.`,
    `If you find multiple practical tips, choose the single most immediately useful one.`,
    `End with one follow-up question about implementing this specific suggestion.`,
  ].join("\n"),
};

// Combine prompts for each style
const systemTemplates = Object.fromEntries(
  Object.entries(styleSpecificPrompts).map(([style, specificPrompt]) => [
    style,
    [topLevelSystemPrompt, specificPrompt].join("\n"),
  ])
);

export type ConversationStyle = keyof typeof styleSpecificPrompts;

export async function generateChatResponse(
  message: string,
  messageHistory: Array<{ sender: string; text: string }>,
  style: ConversationStyle = "default"
) {
  // First, check if the user is requesting a style change
  const styleDetection = await detectStyleRequest(message);

  // Apply new style if user is requesting a change and confidence is high
  // Otherwise keep the current conversation style
  const newStyle =
    styleDetection.requestingStyle && styleDetection.confidence > 0.7
      ? (styleDetection.suggestedStyle as ConversationStyle)
      : style;

  // Perform semantic search to get relevant context
  const { results, combinedContent } = await searchKnowledgeBase(message);

  const formattedHistory = messageHistory.map((msg) =>
    msg.sender === "user" ? new HumanMessage(msg.text) : new AIMessage(msg.text)
  );

  // Combine system prompt with retrieved context
  const systemPromptWithContext = [
    systemTemplates[newStyle],
    "\nRelevant information from knowledge base:",
    combinedContent,
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

  return {
    content: response.content as string,
    searchResults: results,
    styleDetection,
    newStyle: newStyle !== style ? newStyle : undefined,
  };
}
