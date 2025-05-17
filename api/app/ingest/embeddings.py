import os
# from openai import OpenAI # Use AsyncOpenAI for async FastAPI
from openai import AsyncOpenAI # Corrected import

# TODO: Initialize OpenAI client (ideally once, globally or passed in)
# client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def get_embedding(text: str, model="text-embedding-3-small") -> list[float]:
    """Generates an embedding for a single text string using OpenAI."""
    if not os.getenv("OPENAI_API_KEY"):
        print("Warning: OPENAI_API_KEY not set. Returning dummy embedding.")
        # Fallback to a dummy embedding of the correct dimension (1536 for text-embedding-3-small)
        return [0.0] * 1536 
    
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY")) # Re-init client per call for now, or manage globally
    try:
        text = text.replace("\n", " ") # OpenAI recommends replacing newlines with spaces
        response = await client.embeddings.create(input=[text], model=model)
        return response.data[0].embedding
    except Exception as e:
        print(f"Error generating embedding for text: '{text[:100]}...': {e}")
        # Fallback to a dummy embedding or handle error as appropriate
        return [0.0] * 1536 # Dimension for text-embedding-3-small

async def generate_embeddings_for_chunks(chunk_texts: list[str], model="text-embedding-3-small") -> list[list[float]]:
    """Generates embeddings for a list of text chunks."""
    embeddings = []
    # TODO: Consider batching if OpenAI API supports it for this client or if beneficial.
    # The current client.embeddings.create takes a list for `input`, so it handles batching implicitly.

    if not os.getenv("OPENAI_API_KEY"):
        print(f"Warning: OPENAI_API_KEY not set. Returning dummy embeddings for {len(chunk_texts)} chunks.")
        return [[0.0] * 1536 for _ in chunk_texts]

    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY")) # Re-init client per call for now
    try:
        # Replace newlines in all chunk texts
        processed_chunk_texts = [text.replace("\n", " ") for text in chunk_texts]
        
        if not processed_chunk_texts:
            return []
            
        response = await client.embeddings.create(input=processed_chunk_texts, model=model)
        embeddings = [data.embedding for data in response.data]
        print(f"Successfully generated {len(embeddings)} embeddings.")
        return embeddings
    except Exception as e:
        print(f"Error generating embeddings for batch of {len(chunk_texts)} chunks: {e}")
        # Fallback to dummy embeddings for all chunks in batch on error
        return [[0.0] * 1536 for _ in chunk_texts]

# Example usage:
# async def main():
#     texts = ["Hello world", "This is a test sentence."]
#     embeddings = await generate_embeddings_for_chunks(texts)
#     for text, emb in zip(texts, embeddings):
#         print(f"Text: {text}, Embedding dim: {len(emb)}")
#         # print(f"Embedding: {emb[:5]}...") # Print first 5 dims

# if __name__ == '__main__':
#     import asyncio
#     asyncio.run(main()) 