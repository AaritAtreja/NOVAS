import os
import time
import hashlib
import pickle
import base64
import logging
import requests
import asyncio
import crawl4ai
from crawl4ai import *
from crawl4ai.install import run_doctor
from azure.storage.blob import BlobServiceClient
from dotenv import load_dotenv
from langchain_openai import AzureOpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from openai import AzureOpenAI
from googleapiclient.discovery import build
import nest_asyncio
import streamlit as st
import streamlit.components.v1 as components

# Apply nest_asyncio for nested event loops in Streamlit
nest_asyncio.apply()

# Set up logging and environment variables
logger = logging.getLogger(__name__)
load_dotenv("azure.env")

# Initialize the event loop
loop = asyncio.get_event_loop()

# Set up Azure OpenAI clients and embeddings
mini_client = AzureOpenAI(
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

embeddings = AzureOpenAIEmbeddings(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_deployment="text-embedding-3-large",
    openai_api_version=os.getenv("AZURE_OPENAI_TEXTEMBEDDER_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_TEXTEMBEDDER_ENDPOINT")
)

client = AzureOpenAI(
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

vector_store = QdrantVectorStore.from_existing_collection(
    embedding=embeddings,
    collection_name="Nova",
    url=os.getenv("QDRANT_URL"),
    prefer_grpc=True,
    api_key=os.getenv("QDRANT_API_KEY")
)

google_api_key = os.getenv("GOOGLE_API_KEY")
google_search_engine_id = os.getenv("GOOGLE_SEARCH_ENGINE_ID")

# --- Helper Functions (same as your original code) ---

def encode_image(image_path, ext=".jpeg"):
    if image_path.startswith("http://") or image_path.startswith("https://"):
        response = requests.get(image_path)
        response.raise_for_status()
        return base64.b64encode(response.content).decode("utf-8")
    else:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")

def retrieve_relevant_chunks(query_embed):
    results = vector_store.similarity_search(query_embed, k=5)
    return results

def append_images_to_user_messages(image_paths):
    messages = []
    for image_path in image_paths:
        base64_image = encode_image(image_path)
        message = {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Below is an image paired with my question. Please consider it in your answer."
                },
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                }
            ]
        }
        messages.append(message)
    return messages

def load_cache_from_blob(blob_name: str) -> dict:
    blob_service_client = BlobServiceClient.from_connection_string(os.getenv("AZURE_STORAGE_CONNECTION_STRING"))
    container_client = blob_service_client.get_container_client("cache")
    try:
        blob_client = container_client.get_blob_client(blob_name)
        data = blob_client.download_blob().readall()
        return pickle.loads(data)
    except Exception:
        return {}

def save_cache_to_blob(cache: dict, blob_name: str):
    blob_service_client = BlobServiceClient.from_connection_string(os.getenv("AZURE_STORAGE_CONNECTION_STRING"))
    container_client = blob_service_client.get_container_client("cache")
    try:
        container_client.create_container()
    except Exception:
        pass
    blob_client = container_client.get_blob_client(blob_name)
    blob_client.upload_blob(pickle.dumps(cache), overwrite=True)

def get_cached_summaries():
    data = load_cache_from_blob("summaries_cache.pkl")
    return data.get("last_update"), data.get("summaries")

def update_summaries_cache(summaries_text: str):
    data = {"last_update": time.time(), "summaries": summaries_text}
    save_cache_to_blob(data, "summaries_cache.pkl")

def get_content_hash(content: str) -> str:
    return hashlib.md5(content.encode("utf-8")).hexdigest()

def google_search(query):
    service = build("customsearch", "v1", developerKey=google_api_key)
    res = service.cse().list(q=query, cx=google_search_engine_id, num=5).execute()
    websites = []
    if "items" in res:
        for item in res["items"]:
            websites.append({
                "name": item.get("title"),
                "url": item.get("link"),
                "snippet": item.get("snippet")
            })
    return websites

async def scrape_site(url: str):
    try:
        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(url=url)
            return result.markdown
    except Exception as e:
        return f"{e}"

async def scrape_all_websites(websites: list, cache_blob="scraped_cache.pkl"):
    cache = load_cache_from_blob(cache_blob)
    tasks = []
    for site in websites:
        url = site["url"]
        use_cached = False
        if url in cache:
            timestamp, cached_content = cache[url]
            if time.time() - timestamp < 604800:
                tasks.append(asyncio.sleep(0, result=cached_content))
                use_cached = True
        if not use_cached:
            tasks.append(scrape_site(url))
    scraped_results = await asyncio.gather(*tasks)
    for site, content in zip(websites, scraped_results):
        url = site["url"]
        cache[url] = (time.time(), content)
    save_cache_to_blob(cache, cache_blob)
    return {site["url"]: content for site, content in zip(websites, scraped_results)}

def summarize_all_websites(scraped_data, cache_blob="local_summaries_cache.pkl"):
    cache = load_cache_from_blob(cache_blob)
    website_summaries = []
    for url, content in scraped_data.items():
        if not content.strip():
            continue
        content_hash = get_content_hash(content)
        cache_key = f"{url}_{content_hash}"
        use_cached = False
        if cache_key in cache:
            ts, cached_summary = cache[cache_key]
            if time.time() - ts < 604800:
                summary = cached_summary
                use_cached = True
        if not use_cached:
            combined_text = f"Website URL: {url}\nContent:\n{content}"
            try:
                response = mini_client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are an AI that provides concise text summaries of website content. "
                                "Summarize the key points from each website. For each website, include its URL and a brief summary. "
                                "If the content is not related to healthcare, medicine, fitness, or obesity, output 'N/A'."
                            )
                        },
                        {
                            "role": "user",
                            "content": f"Summarize the following website content:\n\n{combined_text}"
                        }
                    ],
                    model="gpt-4o",
                    temperature=0.2,
                    max_tokens=300
                )
                summary = response.choices[0].message.content.strip()
                cache[cache_key] = (time.time(), summary)
            except Exception as e:
                summary = ""
        website_summaries.append(summary)
    save_cache_to_blob(cache, cache_blob)
    return "\n\n".join(website_summaries)

async def get_context_chunks_and_metadata(question: str, clinician: bool):
    matches = await asyncio.to_thread(retrieve_relevant_chunks, question)
    context_chunks = []
    system_image_paths = []
    clinician_metadata_lines = []
    seen_metadata = set()
    
    for match in matches:
        full_text = match.page_content  
        context_chunks.append(full_text)
        pdf_name = match.metadata.get("pdf_name", "unknown")
        index = match.metadata.get("index", "unknown")
        url = match.metadata.get("url", "nAn")
        if clinician:
            meta_key = f"{pdf_name}-{index}-{url}"
            if meta_key not in seen_metadata:
                seen_metadata.add(meta_key)
                clinician_metadata_lines.append(f"PDF: {pdf_name}, Index: {index}, URL: {url}")
        if url != "nAn":
            system_image_paths.append(url)
                    
    context_text = "\n\n".join(context_chunks)
    return context_text, system_image_paths, clinician_metadata_lines

async def get_website_summaries(question: str):
    try:
        last_update, cached_summaries = await asyncio.to_thread(get_cached_summaries)
        if cached_summaries is not None and (time.time() - last_update < 604800):
            website_summaries_text = cached_summaries
            websites_metadata_text = ""
        else:
            websites = await asyncio.to_thread(google_search, question)
            if websites:
                scraped_data = await scrape_all_websites(websites)
                website_summaries_text = await asyncio.to_thread(summarize_all_websites, scraped_data)
                await asyncio.to_thread(update_summaries_cache, website_summaries_text)
                websites_info = []
                for site in websites:
                    name = site.get("name", "unknown")
                    url = site["url"]
                    snippet = site.get("snippet", "")
                    websites_info.append(f"Name: {name}\nURL: {url}\nSnippet: {snippet}")
                websites_metadata_text = "\n\n".join(websites_info)
            else:
                website_summaries_text = ""
                websites_metadata_text = ""
        return website_summaries_text, websites_metadata_text
    except Exception:
        return "", ""

async def prepare_image_messages(system_image_paths, user_image_paths, clinician):
    messages = []
    if system_image_paths:
        msgs = await asyncio.to_thread(append_images_to_user_messages, system_image_paths)
        messages.extend(msgs)
    if clinician and user_image_paths:
        msgs = await asyncio.to_thread(append_images_to_user_messages, user_image_paths)
        messages.extend(msgs)
    return messages

# Global conversation history (for demonstration purposes)
conversation_history = []

async def answer_question(question: str, user_image_paths, clinician: bool = False):
    context_task = asyncio.create_task(get_context_chunks_and_metadata(question, clinician))
    website_task = asyncio.create_task(get_website_summaries(question))
    
    context_text, system_image_paths, clinician_metadata_lines = await context_task
    website_summaries_text, websites_metadata_text = await website_task
    
    if website_summaries_text:
        context_text += "\nWebsite Summaries:\n" + website_summaries_text

    # system_messages = [{
    #     "role": "system",
    #     "content": (
    #         "You are an AI assistant designed to help patients by providing accurate and reliable answers. "
    #         "Your responses should be based strictly on the information available in the vector store. "
    #         "If the required information is not found, respond with: 'I do not have the necessary context in my knowledge base. "
    #         "Please contact customer support for further assistance.'\n"
    #         "Use the following retrieved context to answer the patient's question:\n\n" + context_text
    #     )
    # }]

    # user_messages = [{
    #     "role": "user",
    #     "content": (
    #         f"Here is my question/thoughts:\n{question}\n\n"
    #         "Please answer only using the context above, and if applicable our prior conversation."
    #     )
    # }]

    system_messages = [{
        "role": "system",
        "content": (
            "You are an AI assistant designed to help providing accurate and reliable answers. "
            "Your responses should be based strictly on the information available in the vector store. "
            "You can answer questions about the prior conversation you're having with the user too only if you're asked. "
            "If the required information is not found, respond with: 'I do not have the necessary context in my knowledge base. "
            "Please contact customer support for further assistance.'\n"
            "Use the following retrieved context to answer the patient's question:\n\n" + context_text
        )
    }]
    user_messages = [{
        "role": "user",
        "content": (
            f"Here is my question/thoughts:\n{question}\n\n"
            "Please answer only using the context above, and if applicable our prior conversation."
        )
    }]
    
    image_messages = await prepare_image_messages(system_image_paths, user_image_paths, clinician)
    user_messages.extend(image_messages)
    
    prompt = conversation_history + system_messages + user_messages

    loop = asyncio.get_running_loop()
    chat_completion = await loop.run_in_executor(
        None,
        lambda: client.chat.completions.create(
            messages=prompt,
            model="gpt-4o",
            temperature=0.35,
            max_tokens=4096
        )
    )
    
    answer_text = chat_completion.choices[0].message.content
    metadata = ""
    
    if clinician and clinician_metadata_lines:
        metadata_str = "\n".join(clinician_metadata_lines)
        metadata += "RAG Metadata:\n" + metadata_str

    if websites_metadata_text:
        metadata += "\n\nWebsite Metadata:\n" + websites_metadata_text

    conversation_history.extend(user_messages)
    conversation_history.append({"role": "assistant", "content": answer_text})
    
    return answer_text, metadata



st.title("NOVA Chatbot")

# Set up Streamlit session state for conversation messages
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display previous chat messages
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# Chat input for user prompt
if prompt := st.chat_input("Enter your question"):
    # Add user's message to the conversation history
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)
    
    # Process the question asynchronously. Here we assume no additional user images and clinician flag is False.
    try:
        answer_text, metadata = asyncio.run(answer_question(prompt, user_image_paths=[], clinician=False))
    except Exception as e:
        answer_text = f"Error processing your request: {e}"
        metadata = ""
    
    # Display assistant's answer
    with st.chat_message("assistant"):
        #st.markdown(answer_text)
        def stream_response():
            for word in answer_text.split(" "):
                yield word + " "
                time.sleep(0.02)
        st.write_stream(stream_response)

        if metadata:
            st.markdown(f"**Metadata:**\n{metadata}")
    
    # Update session messages with assistant's response
    st.session_state.messages.append({"role": "assistant", "content": answer_text})
