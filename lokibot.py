import os
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

my_api_key = os.getenv("GROQ_API_KEY")

if not my_api_key:
    raise ValueError("API_KEY nhi hai.")

client = Groq(api_key=my_api_key)

model = "openai/gpt-oss-120b"


from pydantic import BaseModel
class Candidate(BaseModel):
    name: str
    education: str
    cgpa: float | None
    skills: list[str]
    projects: list[str]
    experience: list[str]
    achievements: list[str]
    certifications: list[str]
    social_links: dict[str, str]


candidate = Candidate(
    name="Lokesh Singh",
    education="B.Tech in Computer Science and Engineering (2027)",
    cgpa=8.39,
    skills=[
        "Java",
        "Python",
        "DSA",
        "JavaScript",
        "Node.js",
        "Express.js",
        "MongoDB",
        "SQL",
        "AWS (EC2, VPC, IAM, S3)",
        "Docker",
        "AI",
    ],
    projects=[
    "PayLocal - A Spring Boot backend for offline UPI payments using encrypted Bluetooth-style mesh networking, with packet routing, deduplication, and settlement simulation.",
    "LokiAI - A fully local AI system built with Python and FastAPI, featuring a custom vector database and RAG pipeline powered by Ollama."
],
    experience=[],
    achievements=["Orange Promptathon Winner 2026"],
    certifications=[],
    social_links={
        "github": "https://github.com/Lokesh-hub-coder",
        "linkedin": "",
        "leetcode": "https://leetcode.com/u/Lokesh_leetcoder/",
    },
)



system_prompt = (
    "You are the AI representative of this candidate. Answer only using the "
    "provided candidate information. Do not invent or infer facts. If the "
    "information is missing, clearly say you don't know. Be honest and "
    "Keep answers concise and professional."
  " Answer in a natural conversational manner."
)


