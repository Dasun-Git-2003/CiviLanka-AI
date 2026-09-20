"""Ingestion script: Loads Sri Lanka BSR documents, chunks them, and builds Chroma vector DB."""

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.documents import Document
from langchain_chroma import Chroma
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

AGENT_DIR = Path(__file__).resolve().parent
load_dotenv(AGENT_DIR / ".env")
load_dotenv(AGENT_DIR.parent / ".env")


DATA_DIR = AGENT_DIR / "data"
CHROMA_DIR = str(AGENT_DIR / "chroma_db")
COLLECTION = os.getenv("VECTOR_COLLECTION", "sri-lanka-infrastructure-bsr")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")


def ingest_documents() -> int:
    api_key = os.getenv("GOOGLE_API_KEY", "") or os.getenv(
        "GEMINI_API_KEY", "")
    if not api_key or "YOUR_" in api_key:
        print(
            "[Ingest Notice] GOOGLE_API_KEY is not set. Offline BM25 keyword search is active.")
        print("To enable vector embeddings, add GOOGLE_API_KEY to CiviLanka.Agent/.env.")
        return 0

    embeddings = GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        google_api_key=api_key,
    )

    vector_store = Chroma(
        collection_name=COLLECTION,
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
    )

    docs = []
    for path in sorted(DATA_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        docs.append(Document(page_content=text,
                    metadata={"source": path.stem}))

    print(f"Loaded {len(docs)} markdown files from {DATA_DIR}")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=750,
        chunk_overlap=120,
        separators=["\n## ", "\n### ", "\n\n", "\n", " "],
    )
    chunks = splitter.split_documents(docs)
    print(f"Generated {len(chunks)} text chunks for embedding.")

    # Reset collection if exists to avoid duplicates
    try:
        existing = vector_store.get()["ids"]
        if existing:
            vector_store.delete(ids=existing)
    except Exception:
        pass

    vector_store.add_documents(chunks)
    print(
        f"Successfully embedded {len(chunks)} chunks into Chroma vector store: {CHROMA_DIR}")
    return len(chunks)


if __name__ == "__main__":
    count = ingest_documents()
    print(f"Ingestion complete: {count} chunks indexed.")
