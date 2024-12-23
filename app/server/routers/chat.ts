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
      })
    )
    .mutation(async ({ input }) => {
      const response = await generateChatResponse(
        input.message,
        input.messageHistory
      );
      return { response };
    }),
});
