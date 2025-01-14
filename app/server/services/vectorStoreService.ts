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

export type SearchResult = {
  content: string;
  score: number;
  source: string;
};

/**
 * Performs a semantic search in the knowledge base using the provided query
 * @param query The search query from the user
 * @returns Detailed search results including content, relevance scores, and source information
 */
export async function searchKnowledgeBase(query: string): Promise<{
  results: SearchResult[];
  combinedContent: string;
}> {
  // Get more results initially to account for potential duplicates
  const results = await vectorStore.similaritySearchWithScore(query, 5);

  // Filter out duplicates based on content and source
  const seenContent = new Set<string>();
  const formattedResults = results
    .map(([doc, score]) => {
      const source = doc.metadata.source
        ? doc.metadata.source.split("/").pop()
        : "unknown";
      return {
        content: doc.pageContent,
        score,
        source,
        key: `${source}-${doc.pageContent}`, // Unique key combining source and content
      };
    })
    .filter((result) => {
      if (seenContent.has(result.key)) {
        return false;
      }
      seenContent.add(result.key);
      return true;
    })
    .map(({ content, score, source }) => ({ content, score, source }))
    .slice(0, 3); // Limit to top 3 unique results

  return {
    results: formattedResults,
    combinedContent: formattedResults.map((r) => r.content).join("\n\n"),
  };
}
