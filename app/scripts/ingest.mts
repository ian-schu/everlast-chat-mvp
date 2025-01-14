// This is a script to ingest source documents (docx format) into a vector database.
// This fits into the bigger picture because in order to spin up an Everlast chatbot
// that "knows" about the contents of these modules, we first have to process those
// modules into a format that can be semantically queried – e.g. a vector database.

// To invoke this, run `npm run ingest`

// Ignore warnings for `punycode` to keep terminal output clean
process.removeAllListeners("warning");

import chalk from "chalk";
import "dotenv/config";
import ora from "ora";
import { join } from "path";

import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createClient } from "@supabase/supabase-js";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";

// Initialize spinner
const spinner = ora();

console.log(chalk.blue("\n🔄 Starting document ingestion process...\n"));

// Check environment variables
spinner.start("Checking Supabase configuration");
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PRIVATE_KEY) {
  spinner.fail("Missing Supabase environment variables");
  process.exit(1);
}
spinner.succeed("Supabase configuration verified");

// Initialize Supabase client
spinner.start("Initializing Supabase client");
const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PRIVATE_KEY!
);
spinner.succeed("Supabase client initialized");

// Load and split documents
spinner.start("Loading documents from directory");
const loader = new DirectoryLoader(
  join(process.cwd(), "data/stress_module_docs"),
  {
    ".docx": (path) => new DocxLoader(path),
  }
);
const docs = await loader.load();
spinner.succeed(`Loaded ${docs.length} documents`);

spinner.start("Splitting documents into chunks");
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const splits = await textSplitter.splitDocuments(docs);
spinner.succeed(`Created ${splits.length} document chunks`);

// Create vector store and index the docs
spinner.start("Indexing documents in vector store");
await SupabaseVectorStore.fromDocuments(
  splits,
  new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
  }),
  {
    client,
    tableName: "documents",
    queryName: "match_documents",
  }
);
spinner.succeed("Documents successfully indexed in vector store");

console.log(
  chalk.green("\n✨ Ingestion complete! Your documents are ready to use.\n")
);
