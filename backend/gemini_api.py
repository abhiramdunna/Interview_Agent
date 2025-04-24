import google.generativeai as genai
from config import GEMINI_API_KEY
from typing import Dict, List
import json

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

def evaluate_enhanced_response(evaluation_data: Dict) -> Dict:
    prompt = f"""
    You are a professional interview evaluation system. Analyze this candidate's performance considering:
    
    1. **Technical Response**: {evaluation_data['response']}
    2. **User Behavior During Test**:
       - {chr(10).join(evaluation_data['test_log'])}
       - Photo verification: {evaluation_data['photo_metadata']}
    3. **Candidate Profile**: {evaluation_data['user']}
    
    **Evaluation Criteria**:
    - Technical Accuracy (40%)
    - Response Quality (30%)
    - Test Integrity (20%) - based on behavior logs
    - Overall Impression (10%)
    
    **Provide Detailed Analysis**:
    1. Score (1-10) with breakdown
    2. Technical assessment
    3. Behavior analysis (any red flags?)
    4. Suggested improvements
    5. Recommended follow-up questions
    
    Return as JSON with: score, technical_feedback, behavior_analysis, improvements, follow_up_questions
    """
    
    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        return {"error": str(e)}

def analyze_interview_responses(interview_data: Dict) -> Dict:
    """Analyze full interview responses using Gemini API"""
    try:
        movement_analysis = ""
        if 'movementAnalysis' in interview_data and interview_data['movementAnalysis']:
            movements = interview_data['movementAnalysis']
            significant_movements = sum(1 for m in movements if m.get('movement') == 'significant')
            movement_percentage = (significant_movements / len(movements)) * 100 if movements else 0
            
            movement_analysis = f"""
            MOVEMENT ANALYSIS:
            - Total movement events: {len(movements)}
            - Significant movements: {significant_movements} ({movement_percentage:.1f}%)
            - Movement pattern: {'High' if movement_percentage > 30 else 'Moderate' if movement_percentage > 15 else 'Low'} activity
            - Suggested feedback: {'Consider maintaining more stillness during interviews' if movement_percentage > 30 else 'Good posture control' if movement_percentage < 10 else 'Minor adjustments to body language could help'}
            """

        prompt = f"""
        You are an expert interview coach analyzing an interview for a {interview_data.get('jobTitle', 'professional')} position.

        Analyze each response and provide:
        1. Specific feedback on content, delivery, and effectiveness
        2. A score from 1-10
        3. Suggestions for improvement

        {movement_analysis if movement_analysis else ""}

        Then provide overall feedback as valid JSON.

        Be sure to always return:
        - "strongPoints": list of strengths. Do not leave it empty. If unsure, use inferred positives like "", "Showed basic understanding".
        - "bodyLanguageFeedback": must be a dictionary with score, summary, strengths, and improvements.


        Format your response as JSON with these fields:
        {{
            "overallFeedback": "comprehensive feedback",
            ""strongPoints": "clear and specific strengths such as confidence, technical clarity, or concise answers",
            "improvementAreas": ["list", "of", "improvements"],
            "bodyLanguageFeedback": "analysis of body language",
            "overallScore": numeric_score,
            "questionAnalysis": [
                {{
                    "questionText": "question text",
                    "userResponse": "user's response",
                    "feedback": "detailed feedback",
                    "score": numeric_score,
                    "improvements": "suggestions"
                }},
                ...
            ]
        }}

        Interview responses:
        """
        
        for response in interview_data.get('responses', []):
            prompt += f"\n\nQuestion: {response['questionText']}\nResponse: {response['userResponse']}"
        
        response = model.generate_content(prompt)
        
        try:
            analysis = json.loads(response.text)
            # Ensure required arrays exist
            analysis['strongPoints'] = analysis.get('strongPoints', [])
            analysis['improvementAreas'] = analysis.get('improvementAreas', [])
            analysis['bodyLanguageFeedback'] = analysis.get('bodyLanguageFeedback', 
                "No body language data available" if not movement_analysis else "")
            return analysis
        except json.JSONDecodeError:            
            text = response.text
            try:
                json_start = text.find('{')
                json_end = text.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = text[json_start:json_end]
                    return json.loads(json_str)
            except:
                pass
                
            return {
                "overallFeedback": text,
                "strongPoints": [],
                "improvementAreas": [],
                "questionAnalysis": []
            }
            
    except Exception as e:
        return {
            "error": str(e),
            "overallFeedback": "An error occurred during analysis.",
            "strongPoints": [],
            "improvementAreas": [],
            "bodyLanguageFeedback": "",
            "questionAnalysis": []
        }