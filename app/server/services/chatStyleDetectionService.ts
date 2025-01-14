import { ChatAnthropic } from "@langchain/anthropic";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ConversationStyle } from "./chatService";

// Style detection model with lower temperature for more consistent results
const styleDetectionModel = new ChatAnthropic({
  modelName: "claude-3-5-haiku-latest",
  temperature: 0.1,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

const styleDetectionPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a style classifier that determines if a user is requesting a change in conversational style.
The available styles are:
- default: friendly and concise
- analytical: evidence-based and scientific
- practical: action-oriented and implementable

You must respond with a JSON object containing these exact fields:
- requestingStyle: a boolean indicating if the user is requesting a style change
- confidence: a number between 0.0 and 1.0 indicating detection confidence
- suggestedStyle: one of ["default", "analytical", "practical"], use "default" if the user is not requesting a style change
- explanation: a brief text explaining your decision

Important: Your response must be a single, valid JSON object. Do not include any other text, comments, or explanations outside the JSON structure.`,
  ],
  ["human", "{input}"],
]);

export type StyleDetectionResult = {
  requestingStyle: boolean;
  confidence: number;
  suggestedStyle?: ConversationStyle;
  explanation: string;
};

export async function detectStyleRequest(
  message: string
): Promise<StyleDetectionResult> {
  try {
    const response = await styleDetectionPrompt
      .pipe(styleDetectionModel)
      .invoke({
        input: message,
      });

    console.log("Raw style detection response: ", response.content);
    const result = JSON.parse(response.content as string);
    console.log("Style detection response: ", JSON.stringify(result, null, 2));

    // Clean up the result to match our expected type
    const cleanResult: StyleDetectionResult = {
      requestingStyle: result.requestingStyle,
      confidence: result.confidence,
      explanation: result.explanation,
      // Only include suggestedStyle if it's not null
      ...(result.suggestedStyle && {
        suggestedStyle: result.suggestedStyle as ConversationStyle,
      }),
    };

    return cleanResult;
  } catch (e) {
    console.error(
      e instanceof Error
        ? `Style detection failed: ${e.message}`
        : "Style detection failed: Unknown error"
    );
    return {
      requestingStyle: false,
      confidence: 1.0,
      explanation: "Failed to parse style detection response",
    };
  }
}
