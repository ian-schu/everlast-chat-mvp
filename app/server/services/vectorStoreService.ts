import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client and vector store
const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PRIVATE_KEY!
);

const vectorStore = new SupabaseVectorStore(
  new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
  }),
  {
    client,
    tableName: "documents",
    queryName: "match_documents",
  }
);

/**
 * Performs a semantic search in the knowledge base using the provided query
 * @param query The search query from the user
 * @returns A string containing the concatenated content of the most relevant documents
 */
export async function searchKnowledgeBase(query: string) {
  const results = await vectorStore.similaritySearch(query, 3);
  return results.map((doc) => doc.pageContent).join("\n\n");
}
