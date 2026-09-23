import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings

AGENT_DIR = Path(__file__).resolve().parents[1]
# Load local .env or fallback to parent workspace .env
load_dotenv(AGENT_DIR / ".env")
load_dotenv(AGENT_DIR.parent / ".env")

DATA_DIR = AGENT_DIR / "data"
CHROMA_DIR = str(AGENT_DIR / "chroma_db")
COLLECTION = os.getenv("VECTOR_COLLECTION", "sri-lanka-infrastructure-bsr")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")


def get_api_key() -> str:
    """Retrieve Google Gemini API key from environment."""
    key = os.getenv("GOOGLE_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
    return key.strip()


def get_embeddings() -> Optional[GoogleGenerativeAIEmbeddings]:
    """Initialize Google Gemini embedding function if API key is present."""
    api_key = get_api_key()
    if not api_key or "YOUR_" in api_key:
        return None
    return GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        google_api_key=api_key,
    )


def get_vector_store() -> Optional[Chroma]:
    """Get persistent Chroma vector store."""
    embeddings = get_embeddings()
    if embeddings is None:
        return None
    return Chroma(
        collection_name=COLLECTION,
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
    )


@lru_cache(maxsize=1)
def get_bm25_retriever() -> Optional[BM25Retriever]:
    """
    Keyword retriever using BM25.
    Works 100% offline without needing any API key.
    Extracts chunks directly from raw markdown data or Chroma store.
    """
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    docs = []
    # If data directory exists, load markdown files directly
    if DATA_DIR.exists():
        for p in sorted(DATA_DIR.glob("*.md")):
            text = p.read_text(encoding="utf-8")
            docs.append(Document(page_content=text,
                        metadata={"source": p.stem}))

    if not docs:
        return None

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=750,
        chunk_overlap=120,
        separators=["\n## ", "\n### ", "\n\n", "\n", " "],
    )
    chunks = splitter.split_documents(docs)
    if not chunks:
        return None

    retriever = BM25Retriever.from_documents(chunks)
    retriever.k = 8
    return retriever


def hybrid_search(query: str, k: int = 4) -> list[Document]:
    """
    Hybrid Search combining BM25 keyword matching and Chroma Vector Search
    fused with Reciprocal Rank Fusion (RRF: 1 / (60 + rank)).

    If Vector Search is unavailable (e.g. no Gemini API key yet configured),
    falls back cleanly to BM25 keyword search.
    """
    vector_hits: list[Document] = []
    vector_store = get_vector_store()
    if vector_store is not None:
        try:
            vector_hits = vector_store.similarity_search(query, k=8)
        except Exception as ex:
            print(f"[Retriever] Vector search warning: {ex}")

    keyword_hits: list[Document] = []
    bm25 = get_bm25_retriever()
    if bm25 is not None:
        try:
            keyword_hits = bm25.invoke(query)
        except Exception as ex:
            print(f"[Retriever] BM25 search warning: {ex}")

    # If neither returned, return empty list
    if not vector_hits and not keyword_hits:
        return []

    # If only BM25 or only vector hits available, return directly
    if not vector_hits:
        return keyword_hits[:k]
    if not keyword_hits:
        return vector_hits[:k]

    # Reciprocal Rank Fusion (RRF)
    scores: dict[str, float] = {}
    by_key: dict[str, Document] = {}

    for hits in (vector_hits, keyword_hits):
        for rank, doc in enumerate(hits):
            # Key identifier based on first 90 characters
            key = doc.page_content[:90].strip()
            by_key[key] = doc
            scores[key] = scores.get(key, 0.0) + 1.0 / (60.0 + rank)

    # Sort descending by fused RRF score
    ranked_keys = sorted(scores, key=scores.__getitem__, reverse=True)
    return [by_key[k_] for k_ in ranked_keys[:k]]


def format_docs(docs: list[Document]) -> str:
    """Format retrieved document chunks for prompt injection."""
    if not docs:
        return "No relevant Sri Lanka BSR or technical specification documents found."
    return "\n\n".join(
        f"[{d.metadata.get('source', 'sri-lanka-bsr')}]\n{d.page_content.strip()}"
        for d in docs
    )


def search_formatted(query: str, k: int = 4) -> str:
    """Convenience function: Hybrid search + markdown formatting."""
    return format_docs(hybrid_search(query, k))
