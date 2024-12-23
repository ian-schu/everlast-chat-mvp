import { z } from "zod";
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
      console.log("Input received for chatCompletion: ", input);
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return { response: "oh how clever" };
    }),
});
