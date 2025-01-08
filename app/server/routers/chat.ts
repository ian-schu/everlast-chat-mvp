import { z } from "zod";
import { generateChatResponse } from "../services/chatService";
import { publicProcedure, router } from "../trpc";

// Define the Message schema
const MessageSchema = z.object({
  sender: z.enum(["user", "app"]),
  text: z.string(),
});

export const chatRouter = router({
  chatCompletion: publicProcedure
    .input(
      z.object({
        message: z.string(),
        messageHistory: z.array(MessageSchema),
        style: z
          .enum(["default", "analytical", "practical"] as const)
          .default("default"),
      })
    )
    .mutation(async ({ input }) => {
      const response = await generateChatResponse(
        input.message,
        input.messageHistory,
        input.style
      );
      return { answer: response };
    }),
});
