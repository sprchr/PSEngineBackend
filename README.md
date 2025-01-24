# PSEngineBackend

# Pinecone Document Processing API

This repository contains an Express.js-based API for processing, embedding, and managing documents using the Pinecone vector database. The application supports various document formats, such as PDF, CSV, Word, plain text, and Excel, and integrates with OpenAI for embedding and query processing.

## Features
- Upload and process documents in multiple formats.
- Generate embeddings for documents using OpenAI.
- Store document embeddings in Pinecone with metadata.
- Perform similarity search for query matching.
- Manage Pinecone indexes and vectors, including creation, deletion, and retrieval.

## Prerequisites
- Node.js 
- Pinecone account and API key
- OpenAI account and API key
- dotenv for environment variable management

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your API keys:
   ```env
   PINECONE_API_KEY=<your-pinecone-api-key>
   OPENAI_API_KEY=<your-openai-api-key>
   ```

4. Start the application:
   ```bash
   npm start
   ```

## API Endpoints

### 1. Upload Document
**POST** `/upload/:index`
- Uploads a document, processes it based on its type, and stores the embeddings in Pinecone.

**Request:**
- `file` (form-data): The file to upload.
- `index` (path): The Pinecone index to store the embeddings.

**Response:**
- Status 200: Success message with details of the operation.
- Status 400: Error if no file is uploaded or unsupported file type.
- Status 500: Internal server error.

---

### 2. List Uploaded Files
**GET** `/files/:index`
- Retrieves a list of uploaded files for a specific index.

**Request:**
- `index` (path): The Pinecone index to retrieve files from.

**Response:**
- Status 200: List of unique file titles.
- Status 500: Internal server error.

---

### 3. Delete Files
**DELETE** `/files/:index`
- Deletes files from a specific index based on the provided file ID.

**Request:**
- `index` (path): The Pinecone index.
- `file` (body): The file ID to delete.

**Response:**
- Status 200: Success message with deleted file IDs.
- Status 400: Error if file ID is not provided.
- Status 500: Internal server error.

---

### 4. List Indexes
**GET** `/index`
- Lists all Pinecone indexes.

**Request:**
- `name` (query): Optional filter to search indexes by name.

**Response:**
- Status 200: List of index names.
- Status 500: Internal server error.

---

### 5. Create Index
**POST** `/index/:user`
- Creates a new Pinecone index.

**Request:**
- `user` (path): The user identifier.
- `indexName` (body): The name of the index to create.

**Response:**
- Status 200: Success message.
- Status 400: Error if index name is not provided.
- Status 500: Internal server error.

**Steps:**
- choosing metrics used for querying (cosine,euclidian,2-point)
- dimensions based on embedding model you are using (azure,openai)  

---

### 6. Delete Index
**DELETE** `/index/:index`
- Deletes a specific Pinecone index.

**Request:**
- `index` (path): The name of the index to delete.

**Response:**
- Status 200: Success message.
- Status 400: Error if index name is not provided.
- Status 500: Internal server error.

---

### 7. Search
**POST** `/search/:index`
- Performs a similarity search using Pinecone.

**Request:**
- `index` (path): The Pinecone index.
- `query` (body): The search query string.

**Response:**
- Status 200: Search results with context and generated answers.
- Status 400: Error if query is invalid.
- Status 500: Internal server error.

## Supported File Types
- PDF
- CSV
- Microsoft Word (.docx, .doc)
- Plain text (.txt)
- Excel (.xlsx)

## Key Technologies
- **Express.js**: Backend framework for routing and middleware.
- **Multer**: File upload handling.
- **Pinecone**: Vector database for managing embeddings.
- **OpenAI**: Embedding generation and LLM integration.
- **LangChain**: Document loaders and text splitting.
- **dotenv**: Environment variable management.
- **XLSX**: Excel file processing.

## Error Handling
The application includes comprehensive error handling to capture and log issues at each step of the process. Most errors return a detailed JSON response for easier debugging.


