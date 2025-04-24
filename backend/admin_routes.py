from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
import database
from app import get_current_admin

admin_router = APIRouter()

# Models
class DomainCreate(BaseModel):
    name: str

class QuestionCreate(BaseModel):
    domain_id: str
    text: str

# Create a new domain
@admin_router.post("/create-domain")
async def create_domain(domain: DomainCreate, current_admin=Depends(get_current_admin)):
    if database.get_domain(domain.name):
        raise HTTPException(status_code=400, detail="Domain already exists")
    return database.create_domain(domain.name)

# Add questions to a domain
@admin_router.post("/add-question")
async def add_question(question: QuestionCreate, current_admin=Depends(get_current_admin)):
    if not database.get_domain_by_id(question.domain_id):
        raise HTTPException(status_code=404, detail="Domain not found")
    return database.add_question(question.domain_id, question.text)

# Get all domains
@admin_router.get("/domains", response_model=List[dict])
async def get_domains(current_admin=Depends(get_current_admin)):
    return database.get_all_domains()

# Get all questions
@admin_router.get("/all-questions", response_model=List[dict])
async def get_all_questions(current_admin=Depends(get_current_admin)):
    return database.get_all_questions()

# Get all responses
@admin_router.get("/all-responses", response_model=List[dict])
async def get_all_responses(current_admin=Depends(get_current_admin)):
    return database.get_all_responses()