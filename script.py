import sys
import json
from langchain_community.document_loaders import PyPDFLoader

def load_pdf(file_path):
    """Load PDF file and print output"""
    print(f"Received file path: {file_path}")  # Log the file path
    try:
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        print(f"Loaded documents: {documents}")  # Log the loaded documents
        return documents
    except Exception as e:
        print(f"Error loading PDF: {e}")
        return []

# This function is intended to be called from Node.js
def load_pdf_from_nodejs(file_path):
    """
    Handles receiving the file path from Node.js and loading the PDF.

    Args:
        file_path: Path to the PDF file received from Node.js.

    Returns:
        A JSON string representing the loaded documents.
    """
    documents = load_pdf(file_path)
    return file_path

# Read the file path passed from Node.js via stdin
if __name__ == "__main__":
    file_path = sys.stdin.read().strip()  # Read file path passed from Node.js
    print(f"File path received in script: {file_path}")
    result = load_pdf_from_nodejs(file_path)
    print(result)  # Return the JSON result
