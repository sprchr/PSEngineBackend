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

**Endpoint**:  
**POST** `/upload/:index`

---

#### **Description**:  
Uploads a document, processes it based on its type, and stores the embeddings in Pinecone.

---

#### **Process**:  
1. The function identifies the type of file being uploaded (e.g., PDF, Word, etc.) and uses the appropriate **document loader** from **LangChain (npm)** to parse the file.  
2. The extracted data is divided into smaller **documents** based on required document size and embedding limits.  
3. These documents are converted into **embeddings** using the **OpenAI Embedding model**, generating vector representations.  
4. The generated vectors, along with **metadata**, are **upserted** into the specified **Pinecone database index** for future use.

---

#### **Request Parameters**:  

1. **Path Parameter**:
   - `index` (string): The name of the Pinecone index where the embeddings will be stored.

2. **Form-Data**:
   - `file` (file): The document file to upload.

---

#### **Response**:  

1. **Success**:
   - **Status 200**:
     - Success message detailing the operation, including information about the number of documents processed and stored.

2. **Client Error**:
   - **Status 400**:
     - Error message if:
       - No file is uploaded.
       - The file type is unsupported.

3. **Server Error**:
   - **Status 500**:
     - Internal server error message if something goes wrong during processing.

---


### 2. List Uploaded Files

**Endpoint**:  
**GET** `/files/:index`

---

#### **Description**:  
Retrieves a list of uploaded files for a specific Pinecone index.

---

#### **Process**:  
1. The API identifies the **index** specified in the request.  
2. The `list_paginated` function from **Pinecone** is used to retrieve all records from the specified index (limited to 100 records).  
3. The obtained records are **cleaned** and **filtered**, extracting only the unique filenames from the metadata.  
4. The list of filenames is returned as the response.

---

#### **Request Parameters**:  

1. **Path Parameter**:
   - `index` (string): The name of the Pinecone index from which to retrieve file information.

---

#### **Response**:  

1. **Success**:
   - **Status 200**:
     - Returns a list of unique file titles stored in the specified index.

2. **Server Error**:
   - **Status 500**:
     - Internal server error message if something goes wrong during processing.

---


### 3. Delete Files

**Endpoint**:  
**DELETE** `/files/:index`

---

#### **Description**:  
Deletes files from a specific Pinecone index based on the provided file ID.

---

#### **Process**:  
1. The API first uses **list_paginated** to fetch all the records from the specified index.  
2. The **filename** obtained in the request is used to identify records that start with the provided filename.  
3. The filtered records are deleted using Pinecone’s **`index.deletemany`** function.

---

#### **Request Parameters**:  

1. **Path Parameter**:
   - `index` (string): The name of the Pinecone index from which to delete files.

2. **Body**:
   - `file` (string): The **file ID** of the document to delete.

---

#### **Response**:  

1. **Success**:
   - **Status 200**:
     - Success message with the IDs of the deleted files.

2. **Client Error**:
   - **Status 400**:
     - Error message if no file ID is provided in the request.

3. **Server Error**:
   - **Status 500**:
     - Internal server error message if something goes wrong during processing.

---


### 4. List Indexes

**Endpoint**:  
**GET** `/index`

---

#### **Description**:  
Lists all Pinecone indexes for a specific user.

---

#### **Process**:  
1. The API uses the **user ID** provided in the request to fetch all the indexes associated with that user.  
2. The **`list_indexes`** function of Pinecone is called to retrieve the list of indexes.  
3. Optionally, if a **`name`** query parameter is provided, the list can be filtered by index name.

---

#### **Request Parameters**:  

1. **Query Parameter**:
   - `name` (string, optional): A filter to search indexes by their name.

---

#### **Response**:  

1. **Success**:
   - **Status 200**:
     - Returns a list of index names.

2. **Server Error**:
   - **Status 500**:
     - Internal server error message if something goes wrong during processing.

---

### 5. Create Index

**Endpoint**:  
**POST** `/index/:user`

---

#### **Description**:  
Creates a new Pinecone index for a specific user.

---

#### **Process**:  
1. The API accepts the **user identifier** and the **index name** to create the new index.  
2. The following parameters are configured for the new index:
   - **Metrics**: Choose the metric used for querying (e.g., cosine, Euclidean, 2-point).
   - **Embedding Model**: Based on the required vector size (dimensions), the appropriate embedding model is selected. Possible models include:
     - **Microsoft**: `multilingual-e5-large`
     - **OpenAI**: `text-embedding-3-small`, `text-embedding-3-large`, `text-embedding-ada-002`
   - **Cloud Provider & Region**: Specify the cloud service (e.g., AWS, Azure, GCP) and the region for the index deployment.

---

#### **Request Parameters**:  

1. **Path Parameter**:
   - `user` (string): The user identifier for the index creation.

2. **Body**:
   - `indexName` (string): The name of the index to create.

---

#### **Response**:  

1. **Success**:
   - **Status 200**:
     - Success message indicating that the index has been created.

2. **Client Error**:
   - **Status 400**:
     - Error message if no index name is provided in the request.

3. **Server Error**:
   - **Status 500**:
     - Internal server error message if something goes wrong during the index creation process.

---

### 6. Delete Index

**Endpoint**:  
**DELETE** `/index/:index`

---

#### **Description**:  
Deletes a specific Pinecone index.

---

#### **Process**:  
1. The **index name** is provided in the API request and concatenated with the **user ID**.
2. The **`delete_index`** function from Pinecone is then used to delete the specified index.

---

#### **Request Parameters**:  

1. **Path Parameter**:
   - `index` (string): The name of the index to delete.

---

#### **Response**:  

1. **Success**:
   - **Status 200**:
     - Success message indicating the index has been deleted.

2. **Client Error**:
   - **Status 400**:
     - Error message if no index name is provided in the request.

3. **Server Error**:
   - **Status 500**:
     - Internal server error message if something goes wrong during the deletion process.

---
### 7. Search

**Endpoint**:  
**POST** `/search/:index`

---

#### **Description**:  
Performs a similarity search using Pinecone to retrieve the most relevant results based on a given query.

---

#### **Process**:  
1. The **query** is converted into an embedding using the **OpenAI Embedding model**.
2. The embedding is passed to the **Pinecone `index.query`** method along with arguments like the number of top matches to be fetched and other query parameters.
3. The results from Pinecone are then sent to the **OpenAI LLM (Large Language Model)**, along with the original query text, to generate a context-based response.

---

#### **Request Parameters**:  

1. **Path Parameter**:
   - `index` (string): The Pinecone index to search within.

2. **Body**:
   - `query` (string): The search query string for the similarity search.

---

#### **Response**:  

1. **Success**:
   - **Status 200**:
     - Returns the search results with context and generated answers based on the query.

2. **Client Error**:
   - **Status 400**:
     - Error message if the query is invalid or malformed.

3. **Server Error**:
   - **Status 500**:
     - Internal server error message if something goes wrong during the search or response generation process.

---


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


