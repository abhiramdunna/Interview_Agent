from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import database
from app import get_current_user
from gemini_api import evaluate_response

user_router = APIRouter()

class InterviewStart(BaseModel):
    domain_id: str  # Changed from int to str for MongoDB

class AnswerSubmit(BaseModel):
    question_id: str  # Changed from int to str
    response: str

class InterviewReport(BaseModel):
    question_id: str
    question: str
    response: str
    score: float
    feedback: str
    improvements: str

class CompleteInterviewReport(BaseModel):
    total_questions: int
    average_score: float
    detailed_feedback: List[dict]

@user_router.get("/domains", response_model=List[dict])
async def get_domains(current_user=Depends(get_current_user)):
    return database.get_all_domains()

@user_router.post("/start-interview")
async def start_interview(interview: InterviewStart, current_user=Depends(get_current_user)):
    if not database.get_domain_by_id(interview.domain_id):
        raise HTTPException(status_code=404, detail="Domain not found")
    return database.get_questions_by_domain(interview.domain_id)

@user_router.post("/submit-answer", response_model=InterviewReport)
async def submit_answer(answer: AnswerSubmit, current_user=Depends(get_current_user)):
    question = database.get_question_by_id(answer.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    database.save_user_response(current_user.username, answer.question_id, answer.response)
    evaluation = evaluate_response(question["text"], answer.response)

    return {
        "question_id": answer.question_id,
        "question": question["text"],
        "response": answer.response,
        "score": evaluation["score"],
        "feedback": evaluation["feedback"],
        "improvements": evaluation["improvements"]
    }

@user_router.post("/complete-interview", response_model=CompleteInterviewReport)
async def complete_interview(answers: List[AnswerSubmit], current_user=Depends(get_current_user)):
    feedbacks = []
    total_score = 0
    
    for answer in answers:
        question = database.get_question_by_id(answer.question_id)
        evaluation = evaluate_response(question["text"], answer.response)
        feedbacks.append({
            "question": question["text"],
            "response": answer.response,
            "score": evaluation["score"],
            "feedback": evaluation["feedback"]
        })
        total_score += evaluation["score"]
        
        database.save_user_response(
            current_user.username,
            answer.question_id,
            answer.response
        )
    
    return {
        "total_questions": len(answers),
        "average_score": total_score / len(answers) if answers else 0,
        "detailed_feedback": feedbacks
    }