import os
key = os.getenv("OPENAI_API_KEY", "")
print("head:", key[:10], "len:", len(key))
