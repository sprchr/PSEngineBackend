// Import necessary modules
import { Pinecone } from "@pinecone-database/pinecone";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { OpenAI, OpenAIEmbeddings } from "@langchain/openai";
import axios from "axios";

dotenv.config();

const router = express.Router();
const upload = multer();
// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey:process.env.PINECONE_API_KEY
});
// console.log(pinecone);

 // Replace with your Pinecone index name

// Upload and store PDF embeddings
router.post("/upload/:index", upload.single("pdf"), async (req, res) => {
  try {
    const file = req.file;
    const docIndex = req.params.index
  //  console.log(file.buffer)
    if (!file) {
      return res.status(400).json({ message: "No PDF file uploaded." });
    }
   
    // console.log("Uploaded File Path:", file.path);

    // Load the PDF file using PDFLoader
    const pdfBlob = new Blob([file.buffer], { type: "application/pdf" });
    const pdf = new PDFLoader(pdfBlob);
   // Use the buffer from multer's memory storage
    const pdffile = await pdf.load();

    const textSplitter = new CharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 0,
    });
    const docs = await textSplitter.splitDocuments(pdffile);

    if (!docs || docs.length === 0) {
      throw new Error("No documents found to process.");
    }

    // Initialize embeddings
    const embeddings = new OpenAIEmbeddings();

    // Generate embeddings for each document using embedDocuments
    const vectors = await embeddings.embedDocuments(docs.map(doc => doc.pageContent));

    // Prepare vectors with metadata
    const index = pinecone.index(docIndex);
    const vectorsWithMetadata = vectors.map((embedding, index) => ({
      id: `${file.originalname}-${index}`, // Unique ID for each document
      values: embedding, // Embedding vector
      metadata: {  pageContent: docs[index].pageContent, title: file.originalname },
    }));
     
      
    // Ensure vectorsWithMetadata is an array
    if (!Array.isArray(vectorsWithMetadata)) {
      throw new Error("Vectors data is not in the expected format.");
    }
  // console.log(vectorsWithMetadata)
     const upsertResponse =await index.upsert(vectorsWithMetadata)
  
     console.log("Vector store saved successfully.");
    
      res.send(upsertResponse)
    
  } catch (error) {
    console.error("Error processing PDF:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});



// Search using Pinecone
router.post("/search/:index", async (req, res) => {
  const docIndex = req.params.index
  try {
    const query = req.body.query;

    // Validate the query
    if (!query || typeof query !== "string" || query.trim() === "") {
      return res.status(400).json({ message: "Invalid query provided." });
    }

    console.log("Query received:", query);

    const index = pinecone.Index(docIndex);

    // Perform similarity search
    const embedding =new OpenAIEmbeddings()
    const queryEmbedding = await embedding.embedQuery(query);
    const searchResponse = await index.query({
      topK: 10, // Number of top matches
      vector: queryEmbedding, // Replace with your embedding generation logic for the query
      includeMetadata: true,
      includeValues:true
    });

    const results = searchResponse.matches || [];
    if (results.length === 0) {
      return res.status(404).json({ message: "No relevant context found for the query." });
    }

    // Combine context from the top results
    
    const context = results.map((result) => result.metadata.pageContent).join("\n");
    // console.log(context);

    // Prepare a prompt for the LLM
    const prompt = `Answer the following question based on the context below:\n\nContext:\n${context}\n\nQuestion: ${query}\nAnswer:`;

    // Initialize the LLM
    const llm = new OpenAI({ temperature: 0.7, modelName: "gpt-4o-mini" });

    // Generate a response using the LLM
    const answer = await llm.invoke(prompt);

    console.log("Generated Answer:", answer);

    return res.status(200).json({ query, answer });
    
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});


router.get("/files/:index", async (req, res) => {
  const docIndex = req.params.index
  
  // console.log(docIndex)
  try {
    // Reference to the "files" collection in Firebase Firestore
    const index = pinecone.index(docIndex)
    const results =  (await index.listPaginated()).vectors
    const ids = results.map((item) => item.id);
    if(ids.length > 0 ){
      const file =  (await index.fetch(ids)).records
      
      const titles = ids.map((id) => 
        file[id].metadata.title ,
    );
    const uniqueTitles = [...new Set(titles)]
    return res.status(200).json(uniqueTitles);
  }
  return res.status(200).json()
  } catch (error) {
    console.error("Error fetching files:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});
router.delete("/files/:index", async (req, res) => {
  const docIndex = req.params.index
  try {
    const fileId  = req.body.file;
  console.log(fileId)
   
    if (!fileId) {
      return res.status(400).json({ error: "File ID is required." });
    }

    const index = pinecone.index(docIndex);

    // List all vectors from the index
    const results = (await index.listPaginated()).vectors;

    // Extract IDs and filter those matching the given fileId
    const ids = results.map((item) => item.id);
    const filteredIds = ids.filter((item) => item.startsWith(fileId));

    if (filteredIds.length === 0) {
      return res.status(404).json({ message: "No matching files found for deletion." });
    }

    // Delete the filtered IDs
    await index.deleteMany(filteredIds);

    console.log("Deleted files:", filteredIds);

    return res.status(200).json({
      message: "Files deleted successfully.",
      deletedFiles: filteredIds,
    });
  } catch (error) {
    console.error("Error deleting files:", error);
    return res.status(500).json({
      error: "An error occurred while deleting files.",
      details: error.message,
    });
  }
});


router.get("/index", async (req, res) => {
  try {
    // Fetch the list of indexes from Pinecone
    const database = (await pinecone.listIndexes()).indexes;

    // Extract the names of the indexes
    const index = database.map((item) => item.name);

    // Respond with the list of indexes
    res.status(200).json(index);
  } catch (error) {
    console.error("Error fetching indexes:", error);

    // Handle errors gracefully
    res.status(500).json({
      success: false,
      message: "Failed to fetch indexes.",
      details: error.message,
    });
  }
});


router.delete("/index/:index", async (req, res) => {
  try {
    const docIndex = req.params.index;
  //  console.log(docIndex)
    if (!docIndex) {
      return res.status(400).json({ error: "Index name is required in the URL." });
    }

    // Delete the Pinecone index
    const response = await pinecone.deleteIndex(docIndex);

    res.status(200).json({ message: `Index '${docIndex}' deleted successfully.`, response });
  } catch (error) {
    console.error("Error deleting index:", error);
    res.status(500).json({ error: "Failed to delete index.", details: error.message });
  }
});

router.post('/index', upload.none(), async (req, res) => {
  try {
    const name = req.body.indexName;

    if (!name) {
      return res.status(400).json({ error: 'Index name is required.' });
    }

  
    await pinecone.createIndex({
      name: name,
      dimension: 1536,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      },
      deletionProtection: 'disabled',
   
    });
    res.status(200).json({ message: `Index '${name}' created successfully.` });
  } catch (error) {
    console.error('Error creating index:', error);
    res.status(500).json({ error: 'Failed to create index.', details: error.message });
  }
});

export default router;
