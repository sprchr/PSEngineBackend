// Import necessary modules
import { Pinecone } from "@pinecone-database/pinecone";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { OpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { TextLoader } from "langchain/document_loaders/fs/text";
import fs from 'fs'
import csv from 'csv-parser'
import XLSX from "xlsx";


dotenv.config();

const router = express.Router();
const upload = multer({ dest: "/tmp" });

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

router.post("/upload/:index", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const docIndex = req.params.index;
    //  console.log(file.originalname)
    if (!file) {
      return res.status(400).json({ message: "No  file uploaded." });
    }
    let docs;

    // Identify file type and use the appropriate loader
    const fileType = file.mimetype;
    console.log(fileType);
    if (fileType === "application/pdf") {
      const pdfLoader = new PDFLoader(file.path);
      const pdffile = await pdfLoader.load();
      const combinedText = pdffile.map(doc => doc.pageContent).join("\n");

      // Use the CharacterTextSplitter on the combined text
      const textSplitter = new CharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 0,
      });
      
      docs = await textSplitter.createDocuments([combinedText]);
     
    } else if (fileType === "text/csv") {
      const loader = new CSVLoader(file.path); // Replace `filePath` with the actual path
    docs = await loader.load(); // Load all rows as documents

  // Optional: Batch rows into groups of 100
  const batchSize = 1000;
  const batchedDocs = [];
  let batch = [];

  for (let i = 0; i < docs.length; i++) {
    batch.push(docs[i]);
    if ((i + 1) % batchSize === 0 || i === docs.length - 1) {
      const combinedContent = batch.map(doc => doc.pageContent).join("\n");
      batchedDocs.push({
        pageContent: combinedContent,
        metadata: { batchNumber: batchedDocs.length + 1 },
      });
      batch = [];
    }
  }

  docs = batchedDocs; 
  
    } else if (
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileType === "application/msword"
    ) {
      const docxLoader = new DocxLoader(file.path); // Initialize Word document loader
      const wordFile = await docxLoader.load(); // Load the Word document

      const combinedText = wordFile.map(doc => doc.pageContent).join("\n");

      // Use the CharacterTextSplitter on the combined text
      const textSplitter = new CharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 100,
      });
      
      docs = await textSplitter.createDocuments([combinedText]);
      
    } else if (fileType === "text/plain") {
      const textLoader = new TextLoader(file.path);
      const textFile = await textLoader.load();
      const combinedText = textFile.map(doc => doc.pageContent).join("\n");

      // Use the CharacterTextSplitter on the combined text
      const textSplitter = new CharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 100,
      });
      
      docs = await textSplitter.createDocuments([combinedText]);
    } else if (
      fileType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      const workbook = XLSX.readFile(file.path);

      // Extract data from the first sheet (you can change this to iterate through sheets if needed)
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convert sheet data to JSON
      const excelData = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // `header: 1` ensures the first row is treated as column names

      // Function to group rows into chunks of 100
      const chunkArray = (arr, size) => {
        const result = [];
        for (let i = 0; i < arr.length; i += size) {
          result.push(arr.slice(i, i + size));
        }
        return result;
      };

      // Group rows into chunks of 100
      const groupedData = chunkArray(excelData, 1000);

      // Convert each chunk into a document
      const documents = groupedData.map((chunk, index) => {
        const pageContent = chunk.map((row) => row.join(" ")).join("\n"); // Join rows within a chunk and then join all rows together

        return {
          pageContent: pageContent, // All rows in the chunk as a single document
          metadata: {
            loc: `row ${index * 100 + 1} to row ${(index + 1) * 100}`, // loc represents the range of rows
            source: file.path,
            sheetName: sheetName,
          },
        };
      });

      // Example of how you might split documents (if needed)
      // const textSplitter = new CharacterTextSplitter({
      //   chunkSize: 1000,
      //   chunkOverlap: 0,
      // });

      // docs = await textSplitter.splitDocuments(documents);
      docs = documents
   
      
    } else {
      return res.status(400).json({ message: "Unsupported file type." });
    }
  
    if (!docs || docs.length === 0) {
      throw new Error("No documents found to process.");
    }

    // Initialize embeddings
    const embeddings = new OpenAIEmbeddings();

    // Generate embeddings for each document using embedDocuments
    const vectors = await embeddings.embedDocuments(
      docs.map((doc) => doc.pageContent)
    );

    // Prepare vectors with metadata
    const index = pinecone.index(docIndex);
    const vectorsWithMetadata = vectors.map((embedding, index) => ({
      id: `${file.originalname}-${index}`, // Unique ID for each document
      values: embedding, // Embedding vector
      metadata: {
        pageContent: docs[index].pageContent,
        title: file.originalname,
      },
    }));

    // Ensure vectorsWithMetadata is an array
    if (!Array.isArray(vectorsWithMetadata)) {
      throw new Error("Vectors data is not in the expected format.");
    }
    // console.log(vectorsWithMetadata)
    const upsertResponse = await index.upsert(vectorsWithMetadata);

    //  console.log("Vector store saved successfully.");

    res.send(upsertResponse);
  } catch (error) {
    console.error("Error processing PDF:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

router.get("/files/:index", async (req, res) => {
  const docIndex = req.params.index;

  // console.log(docIndex)
  try {
    // Reference to the "files" collection in Firebase Firestore
    const index = pinecone.index(docIndex);
    const results = (await index.listPaginated()).vectors;
    const ids = results.map((item) => item.id);
    if (ids.length > 0) {
      const file = (await index.fetch(ids)).records;

      const titles = ids.map((id) => file[id].metadata.title);
      const uniqueTitles = [...new Set(titles)];
      return res.status(200).json(uniqueTitles);
    }
    return res.status(200).json();
  } catch (error) {
    console.error("Error fetching files:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});
router.delete("/files/:index", async (req, res) => {
  const docIndex = req.params.index;
  try {
    const fileId = req.body.file;
    // console.log(fileId)

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
      return res
        .status(404)
        .json({ message: "No matching files found for deletion." });
    }

    // Delete the filtered IDs
    await index.deleteMany(filteredIds);

    // console.log("Deleted files:", filteredIds);

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

// indexes

router.get("/index", async (req, res) => {
  try {
    // Fetch the list of indexes from Pinecone
    const database = (await pinecone.listIndexes()).indexes;
    const name = req.query.name.toLowerCase();
    // Extract the names of the indexes
    const val = name.slice(1, name.length - 1);
    const data = "g8hgsufhx0b7qdxveumogfkyg1v1";
    const index = database.map((item) => item.name);
    const filterd = index.filter(
      (item) => item && item.toString().toLowerCase().startsWith(`${val}-`)
    );
    // Respond with the list of indexes
    res.status(200).json(filterd);
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

    if (!docIndex) {
      return res
        .status(400)
        .json({ error: "Index name is required in the URL." });
    }

    // Delete the Pinecone index
    const response = await pinecone.deleteIndex(docIndex);

    res
      .status(200)
      .json({ message: `Index '${docIndex}' deleted successfully.`, response });
  } catch (error) {
    console.error("Error deleting index:", error);
    res
      .status(500)
      .json({ error: "Failed to delete index.", details: error.message });
  }
});

router.post("/index/:user", upload.none(), async (req, res) => {
  try {
    const Indexname = req.body.indexName;
    const user = req.params.user;

    if (!Indexname) {
      return res.status(400).json({ error: "Index name is required." });
    }
    const userIndexName = `${user}-${Indexname}`.toLowerCase();

    console.log(userIndexName);

    await pinecone.createIndex({
      name: userIndexName,
      dimension: 1536,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
      deletionProtection: "disabled",
    });
    res
      .status(200)
      .json({ message: `Index '${userIndexName}' created successfully.` });
  } catch (error) {
    console.error("Error creating index:", error);
    res
      .status(500)
      .json({ error: "Failed to create index.", details: error.message });
  }
});

// search

// Search using Pinecone
router.post("/search/:index", async (req, res) => {
  const docIndex = req.params.index;
  try {
    const query = req.body.query;

    // Validate the query
    if (!query || typeof query !== "string" || query.trim() === "") {
      return res.status(400).json({ message: "Invalid query provided." });
    }

    console.log("Query received:", query);

    const index = pinecone.Index(docIndex);

    // Perform similarity search
    const embedding = new OpenAIEmbeddings();
    const queryEmbedding = await embedding.embedQuery(query);
    const searchResponse = await index.query({
      topK: 3, // Number of top matches
      vector: queryEmbedding, // Replace with your embedding generation logic for the query
      includeMetadata: true,
      includeValues: true,
    });

    const results = searchResponse.matches || [];
    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "No relevant context found for the query." });
    }

    // Combine context from the top results

    const context = results
      .map((result) => result.metadata.pageContent)
      .join("\n");
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

export default router;
