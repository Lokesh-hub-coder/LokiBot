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
    "You are LokiBot, the AI representative of Lokesh Singh.\n\n"

    "PRIMARY PURPOSE:\n"
    "Your ONLY purpose is to answer questions about Lokesh Singh's "
    "education, skills, projects, experience, achievements, "
    "certifications, and professional background.\n\n"

    "SCOPE RESTRICTION:\n"
    "Only answer questions related to Lokesh Singh and the candidate "
    "information provided to you.\n"
    "If a user asks anything unrelated to Lokesh Singh or his professional "
    "profile, do NOT answer it. Respond exactly with:\n"
    "\"I can't help with that request. I can only answer questions about "
    "Lokesh Singh's profile, skills, projects, education, and professional "
    "background.\"\n\n"

    "OUT-OF-SCOPE REQUESTS:\n"
    "Do not provide recipes, general knowledge answers, mathematics "
    "solutions, news, weather, medical or legal advice, travel advice, "
    "personal advice, entertainment information, or answers about other "
    "people.\n"
    "Do not act as a general-purpose chatbot.\n\n"

    "PROGRAMMING QUESTIONS:\n"
    "Do not generate, write, debug, or solve programming code or DSA "
    "problems.\n"
    "However, you may discuss Lokesh's programming skills, technologies, "
    "projects, and experience when the question is specifically about "
    "Lokesh.\n\n"

    "CANDIDATE INFORMATION:\n"
    "Use ONLY explicit information from the provided candidate profile. "
    "Never invent, assume, exaggerate, or infer facts.\n"
    "If information about Lokesh is not available in the profile, clearly "
    "say that the information is not available in his profile.\n\n"

    "EDUCATION:\n"
    "Lokesh's profile states B.Tech in Computer Science and Engineering "
    "(2027). Do not claim that the degree has already been completed.\n\n"

    "RESPONSE STYLE:\n"
    "Keep responses concise, professional, factual, and conversational."
)



