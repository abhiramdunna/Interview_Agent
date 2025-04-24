from bson import ObjectId
from fastapi import FastAPI, Depends, HTTPException, Query, status
import re
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel,validator
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
import smtplib
from email.mime.text import MIMEText
import gemini_api
import database
from config import (
    SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES,
    SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, EMAIL_FROM,
    DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD
)

app = FastAPI()

# Update your CORS middleware to include your frontend's exact URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["*"],
    max_age=600  # 10 minutes
)
# Models
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str  # Add this field

class TokenData(BaseModel):
    username: str
    role: str

class User(BaseModel):
    username: str
    email: str
    role: str
    verified: bool

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    confirmPassword: str

    @validator('username')
    def validate_username(cls, v):
        if not v.isalpha():
            raise ValueError("Username must contain only alphabets")
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters long")
        return v

    @validator('email')
    def validate_email(cls, v):
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, v):
            raise ValueError("Invalid email format")
        return v

    @validator('confirmPassword')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError("Passwords do not match")
        return v
    
class VerifyOTP(BaseModel):
    email: str
    otp: str

class AdminRequest(BaseModel):
    email: str
    message: str
    full_name: str
    phone: str
    password: str  # Add this field
    # Remove otp field since we're verifying it before submission

class GrantAdminRequest(BaseModel):
    email: str
    


# Add this to your models section in app.py
class AdminRequestResponse(BaseModel):
    id: str
    email: str
    message: str
    full_name: str
    phone: str
    status: str
    requested_at: datetime
    processed_at: Optional[datetime] = None
    processed_by: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            ObjectId: lambda v: str(v),
        }
        
        
# In app.py
def initialize_default_admin():
    admin = database.users.find_one({"email": DEFAULT_ADMIN_EMAIL})
    if not admin:
        # Create admin user
        admin_id = database.create_user(
            username="admin",
            email=DEFAULT_ADMIN_EMAIL,
            password=DEFAULT_ADMIN_PASSWORD,
            role="admin"
        )
        
        if admin_id:
            # Ensure verified is set to True
            database.users.update_one(
                {"_id": admin_id}, 
                {"$set": {"verified": True}}
            )
            print(f"Created default admin with ID: {admin_id}")
        else:
            # Check if user exists despite create_user returning None
            admin = database.users.find_one({"email": DEFAULT_ADMIN_EMAIL})
            if admin:
                # Update the user to be verified and an admin
                database.users.update_one(
                    {"email": DEFAULT_ADMIN_EMAIL},
                    {"$set": {"verified": True, "role": "admin"}}
                )
                print(f"Updated existing admin user: {admin['username']}")
            else:
                print("Failed to create default admin")
    else:
        # Ensure existing admin is verified and update password
        update_data = {
            "verified": True,
            "role": "admin",
            "password_hash": database.get_password_hash(DEFAULT_ADMIN_PASSWORD)
        }
        database.users.update_one(
            {"email": DEFAULT_ADMIN_EMAIL},
            {"$set": update_data}
        )
        print("✅ Updated default admin credentials")

# Run on startup
initialize_default_admin()

# Auth Utilities
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = database.users.find_one({"username": username})
    if user is None:
        raise credentials_exception
    
    return User(
        username=user["username"],
        email=user["email"],
        role=user["role"],
        verified=user.get("verified", False)
    )

async def get_current_admin(current_user: User = Depends(get_current_user)):
    print(f"Admin check for user: {current_user.username}, role: {current_user.role}")
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

# Email Service
def send_email(to_email: str, subject: str, body: str) -> bool:
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = EMAIL_FROM
    msg['To'] = to_email
    
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Email send error: {e}")
        return False
    
@app.post("/signup")
async def signup(user: UserCreate):
    # Check if username contains only alphabets (already handled by validator)
    # Check if username and email are different
    if user.username.lower() == user.email.split('@')[0].lower():
        raise HTTPException(
            status_code=400,
            detail="Username should not match email name part"
        )
    
    # Check if user exists
    if database.users.find_one({"$or": [{"username": user.username}, {"email": user.email}]}):
        raise HTTPException(
            status_code=400,
            detail="Username or email already exists"
        )
    
    # Verify OTP first
    otp_record = database.otps.find_one({"email": user.email, "verified": True})
    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="Email not verified. Please verify your email first."
        )
    
    # Create user
    user_id = database.create_user(
        username=user.username,
        email=user.email,
        password=user.password,
        role="user"
    )
    
    if not user_id:
        raise HTTPException(
            status_code=500,
            detail="Failed to create user"
        )
    
    # Delete the used OTP
    database.otps.delete_one({"email": user.email})
    
    return {"message": "User created successfully. You can now login."}

# Auth Endpoints
# Fix the token endpoint to always include role
@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = database.users.find_one({
        "$or": [
            {"username": form_data.username},
            {"email": form_data.username}
        ]
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    if not database.verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    # Check if user has pending admin request
    if user.get("admin_request_pending", False):
        raise HTTPException(
            status_code=400,
            detail="Your admin request is still pending approval"
        )
    
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "email": user["email"]
    }
    

@app.get("/check-admin-request")
async def check_admin_request(
    email: str = Query(..., description="Email to check"),
    current_user: User = Depends(get_current_user)
):
    """Check if there's a pending admin request for this email"""
    # Only allow checking your own status
    if current_user.email != email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only check your own status"
        )
    
    pending_request = database.admin_requests.find_one({
        "email": email,
        "status": "pending"
    })
    
    return {"pending": pending_request is not None}


@app.get("/admin/posts", response_model=list[dict])
async def get_admin_posts(current_user: User = Depends(get_current_user)):  # Changed from get_current_admin
    """Get admin posts (accessible to all authenticated users)"""
    try:
        posts = database.get_all_admin_posts()
        return posts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/requests", response_model=list[AdminRequestResponse])
async def get_admin_requests(admin: User = Depends(get_current_admin)):
    """Get all pending admin requests (only for default admin)"""
    print(f"Checking admin requests for: {admin.email} (default: {DEFAULT_ADMIN_EMAIL})")
    if admin.email != DEFAULT_ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the default admin can view admin requests"
        )
    try:
        requests = database.get_pending_admin_requests()
        print(f"Found {len(requests)} admin requests")
        return requests
    except Exception as e:
        print(f"Error getting admin requests: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/check-email")
async def check_email(email: str = Query(..., description="Email to check")):
    """Check if email exists in the database"""
    user = database.users.find_one({"email": email})
    return {"exists": user is not None}

@app.post("/send-otp")
async def send_otp(email: str = Query(..., description="Email address to send OTP to")):
    try:
        # Validate email format
        if not email or "@" not in email:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Valid email address is required"
            )

        # Generate and store OTP
        otp = database.create_otp(email)
        
        # Send email
        email_sent = send_email(
            email,
            "Your Verification OTP",
            f"Your OTP code is: {otp}\nThis code will expire in 5 minutes."
        )
        
        if not email_sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email"
            )
        
        return {"message": "OTP sent successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.post("/verify-otp")
async def verify_otp(otp_data: VerifyOTP):
    # Check if OTP record exists
    record = database.otps.find_one({"email": otp_data.email})
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No OTP requested for this email"
        )
    
    # Check if OTP is expired
    if datetime.utcnow() > record["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired"
        )
    
    # Check if OTP matches
    if record["otp"] != otp_data.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP"
        )
    
    # Mark OTP as verified
    database.otps.update_one(
        {"email": otp_data.email},
        {"$set": {"verified": True}}
    )
    
    return {"message": "Email verified successfully"}

# Admin Endpoints
@app.post("/request-admin-access")
async def request_admin_access(request: AdminRequest):
    # Verify the email was verified through OTP
    otp_record = database.otps.find_one({"email": request.email, "verified": True})
    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="Email not verified. Please verify your email first."
        )
    
    # Check for existing admin request
    existing_request = database.admin_requests.find_one({
        "email": request.email,
        "status": "pending"
    })
    if existing_request:
        raise HTTPException(
            status_code=400,
            detail="Admin request already pending for this email"
        )
    
    # Create new request with all fields
    success = database.request_admin_access(
        email=request.email,
        message=request.message,
        full_name=request.full_name,
        phone=request.phone,
        password=request.password
    )
    
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Failed to create admin request"
        )
    
    return {"message": "Admin request submitted successfully"}

# In app.py
@app.post("/admin/grant-access")
async def grant_admin_access(
    request: GrantAdminRequest,
    admin: User = Depends(get_current_admin)
):
    try:
        print(f"Processing admin grant request for: {request.email}")
        
        if admin.email != DEFAULT_ADMIN_EMAIL:
            raise HTTPException(
                status_code=403,
                detail="Only the default admin can grant admin access"
            )
            
        # Get the pending admin request
        admin_request = database.admin_requests.find_one({
            "email": request.email,
            "status": "pending"
        })
        
        if not admin_request:
            raise HTTPException(
                status_code=404,
                detail="No pending admin request found for this email"
            )
            
        # Grant admin access - this will now handle user creation if needed
        success = database.grant_admin_access(
            email=request.email,
            processed_by=admin.email
        )
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail="Failed to grant admin access"
            )
        
        return {"message": f"Admin access granted to {request.email}"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in grant_admin_access: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Server error: {str(e)}"
        )                
# User Endpoints
@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    user = database.users.find_one({"username": current_user.username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "username": user["username"],
        "email": user["email"],
        "role": user["role"],
        "verified": user.get("verified", False)
    }

@app.get("/")
async def root():
    return {"message": "Interview Practice API"}


# In app.py, add these models and endpoints:

# Domain Management Models
class DomainCreate(BaseModel):
    name: str

class DomainResponse(BaseModel):
    id: str
    name: str
    created_at: Optional[datetime] = None  # ✅ Add this

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class QuestionCreate(BaseModel):
    domain_id: str
    text: str
    time_limit: int = 60 

class QuestionResponse(BaseModel):
    id: str
    domain_id: str
    text: str
    time_limit: int  # Add this field
    created_at: Optional[datetime] = None  # Add this field

class UserResponseCreate(BaseModel):
    question_id: str
    user_response: str
    test_log: Optional[List[str]] = None
    photo: Optional[str] = None

class UserResponseResponse(BaseModel):
    id: str
    question_id: str
    user_id: str
    user_response: str
    created_at: datetime
    
class AdminPostCreate(BaseModel):
    content: str

# For AdminPostResponse model
class AdminPostResponse(BaseModel):
    id: str
    admin_name: str
    content: str
    created_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
            ObjectId: lambda v: str(v),
        }

# Similarly update other response models that include dates

# Domain Management Endpoints
@app.post("/admin/create-domain", response_model=DomainResponse)
async def create_domain(
    domain: DomainCreate,
    admin: User = Depends(get_current_admin)
):
    """Create a new domain (category) for interview questions"""
    domain_id = database.create_domain(domain.name, admin.email)
    if not domain_id:
        raise HTTPException(status_code=400, detail="Failed to create domain")
    return {
    "id": str(domain_id.get("id")),
    "name": domain_id.get("name"),
    "created_at": domain_id.get("created_at")  
}


@app.post("/admin/create-post", response_model=AdminPostResponse)
async def create_admin_post(
    post: AdminPostCreate,
    admin: User = Depends(get_current_admin)
):
    """Create a new admin post"""
    post_data = {
        "admin_id": admin.username,
        "admin_name": admin.username,  # or get full name if available
        "content": post.content,
        "created_at": datetime.utcnow()
    }
    post_id = database.create_admin_post(post_data)
    return {**post_data, "id": str(post_id)}

@app.get("/admin/posts", response_model=List[AdminPostResponse])
async def get_admin_posts(admin: User = Depends(get_current_admin)):
    """Get all admin posts"""
    posts = database.get_all_admin_posts()
    return posts


@app.get("/admin/domains", response_model=list[DomainResponse])
async def get_domains(admin: User = Depends(get_current_admin)):
    """Get all available domains for the current admin"""
    try:
        domains = database.get_all_domains(admin.email)
        return domains
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/domains/{admin_email}", response_model=list[DomainResponse])
async def get_domains_by_admin(
    admin_email: str,
    current_user: User = Depends(get_current_user)
):
    """Get all domains created by a specific admin"""
    try:
        # Verify the admin exists
        admin = database.users.find_one({"email": admin_email, "role": "admin"})
        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")
        
        # Get domains using admin's email
        domains = database.get_all_domains(admin_email)
        return domains
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
            
# Question Management Endpoints
@app.post("/admin/add-question", response_model=QuestionResponse)
async def add_question(
    question: QuestionCreate,
    admin: User = Depends(get_current_admin)
):
    """Add a new question to a specific domain"""
    question_id = database.add_question(
        question.domain_id, 
        question.text, 
        admin.email,
        question.time_limit
    )
    if not question_id:
        raise HTTPException(status_code=400, detail="Failed to add question")
    return {
        "id": str(question_id),
        "domain_id": question.domain_id,
        "text": question.text,
        "time_limit": question.time_limit
    }
    
    
@app.get("/admin/questions", response_model=list[QuestionResponse])
async def get_all_questions(admin: User = Depends(get_current_admin)):
    """Get all questions for the current admin"""
    questions = database.get_all_questions(admin.email)
    return questions

@app.get("/questions/{domain_id}", response_model=list[QuestionResponse])
async def get_public_questions_by_domain(domain_id: str):
    """Get all questions for a specific domain (public endpoint)"""
    print(f"Fetching questions for domain: {domain_id}")  # Add logging
    questions = database.get_questions_by_domain(domain_id)
    if questions is None:
        print("No questions found or domain not found")  # Add logging
        raise HTTPException(status_code=404, detail="Domain not found")
    print(f"Found {len(questions)} questions")  # Add logging
    return questions

@app.delete("/admin/questions/{question_id}")
async def delete_question(
    question_id: str,
    admin: User = Depends(get_current_admin)
):
    """Delete a specific question"""
    success = database.delete_question(question_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question deleted successfully"}

# User Response Endpoints
@app.post("/user/submit-response")
async def submit_response(
    response: UserResponseCreate,
    current_user: User = Depends(get_current_user)
):
    """Submit user response to a question with enhanced monitoring data"""
    try:
        # Validate question exists
        question = database.questions.find_one({"_id": ObjectId(response.question_id)})
        if not question:
            raise HTTPException(
                status_code=404,
                detail="Question not found"
            )

        # Save the response
        response_data = {
            "question_id": response.question_id,
            "user_id": current_user.username,
            "user_response": response.user_response,
            "test_log": response.test_log or [],
            "photo": response.photo,
            "created_at": datetime.utcnow()
        }

        response_id = database.responses.insert_one(response_data).inserted_id
        
        # If there's monitoring data, send to GPT for evaluation
        if response.test_log or response.photo:
            evaluation_data = {
                "question": question.get("text", ""),
                "response": response.user_response,
                "user": current_user.email,
                "test_log": response.test_log or [],
                "photo_metadata": "present" if response.photo else "none"
            }
            
            gpt_evaluation = gemini_api.evaluate_enhanced_response(evaluation_data)
            
            database.save_evaluation(
                response_id=str(response_id),
                evaluation=gpt_evaluation
            )
            
        return {"message": "Response submitted successfully"}
    except Exception as e:
        print(f"Error submitting response: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
        
        
@app.get("/admin/responses", response_model=list[UserResponseResponse])
async def get_all_responses(admin: User = Depends(get_current_admin)):
    """Get all user responses for the current admin's questions"""
    try:
        # Get all questions by this admin first
        admin_questions = database.get_all_questions(admin.email)
        question_ids = [q["id"] for q in admin_questions]
        
        # Then get all responses for these questions
        responses = []
        for qid in question_ids:
            q_responses = database.get_responses_by_question(qid)
            if q_responses:
                responses.extend(q_responses)
                
        return responses
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/responses/{question_id}", response_model=list[UserResponseResponse])
async def get_responses_by_question(
    question_id: str,
    admin: User = Depends(get_current_admin)
):
    """Get all user responses for a specific question"""
    responses = database.get_responses_by_question(question_id)
    if responses is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return responses

@app.get("/user/my-responses", response_model=list[UserResponseResponse])
async def get_user_responses(current_user: User = Depends(get_current_user)):
    """Get all responses submitted by the current user"""
    responses = database.get_responses_by_user(current_user.username)
    return responses

# Public endpoints
@app.get("/domains", response_model=list[DomainResponse])
async def get_public_domains():
    """Get all available domains (public endpoint)"""
    domains = database.get_all_domains()
    return domains

@app.get("/questions/{domain_id}", response_model=list[QuestionResponse])
async def get_public_questions_by_domain(domain_id: str):
    """Get all questions for a specific domain (public endpoint)"""
    questions = database.get_questions_by_domain(domain_id)
    if questions is None:
        raise HTTPException(status_code=404, detail="Domain not found")
    return questions

class InterviewCompleteRequest(BaseModel):
    answers: list[UserResponseCreate]

@app.post("/user/complete-interview")
async def complete_interview(
    request: InterviewCompleteRequest,
    current_user: User = Depends(get_current_user)
):
    """Submit all interview answers at once"""
    try:
        # Save all responses
        for answer in request.answers:
            database.add_user_response(
                question_id=answer.question_id,
                user_id=current_user.username,
                user_response=answer.user_response
            )
        
        # Generate a simple report (you can enhance this)
        report = {
            "total_questions": len(request.answers),
            "average_score": 7.5,  # Replace with actual scoring logic
            "detailed_feedback": [
                {
                    "question": "Sample question",  # Get actual question text
                    "response": answer.user_response,
                    "score": 8,  # Replace with actual scoring
                    "feedback": "Good answer!"  # Replace with actual feedback
                }
                for answer in request.answers
            ]
        }
        return report
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
# Update the get_admin_users endpoint
@app.get("/admin/users", response_model=list[User])
async def get_admin_users(current_user: User = Depends(get_current_user)):  # Changed from get_current_admin
    """Get all admin users (accessible to all authenticated users)"""
    try:
        users = list(database.users.find({"role": "admin"}))
        for user in users:
            user["id"] = str(user["_id"])
            del user["_id"]
            del user["password_hash"]
            user["verified"] = user.get("verified", False)
        return users
    except Exception as e:
        print(f"Error getting admin users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Add this to app.py
# In app.py, modify the get_all_users endpoint
@app.get("/admin/all-users", response_model=list[User])
async def get_all_users(admin: User = Depends(get_current_admin)):
    """Get all non-admin users (excluding users with pending admin requests)"""
    try:
        users = list(database.users.find({
            "role": "user",
            "$or": [
                {"admin_request_pending": {"$exists": False}},
                {"admin_request_pending": False}
            ]
        }))
        for user in users:
            user["id"] = str(user["_id"])
            del user["_id"]
            del user["password_hash"]
            user["verified"] = user.get("verified", False)
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

    
    
@app.delete("/admin/domains/{domain_id}")
async def delete_domain(
    domain_id: str,
    admin: User = Depends(get_current_admin)
):
    """Delete a domain and all its questions"""
    try:
        # Convert string ID to ObjectId
        from bson import ObjectId
        try:
            domain_obj_id = ObjectId(domain_id)
        except:
            raise HTTPException(
                status_code=400,
                detail="Invalid domain ID format"
            )

        # First verify the domain exists and belongs to this admin
        domain = database.domains.find_one({
            "_id": domain_obj_id,
            "created_by": admin.email
        })
        
        if not domain:
            raise HTTPException(
                status_code=404,
                detail="Domain not found or you don't have permission to delete it"
            )

        # Delete the domain
        success = database.delete_domain(domain_obj_id)
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to delete domain"
            )
            
        return {"message": "Domain deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )    
    


@app.delete("/admin/users/{email}")
async def delete_user(
    email: str,
    admin: User = Depends(get_current_admin)
):
    """Delete a user by email"""
    result = database.users.delete_one({"email": email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

class CurrentUserResponse(BaseModel):
    username: str
    email: str
    role: str
    verified: bool

@app.get("/current-user", response_model=CurrentUserResponse)
async def get_current_user_details(current_user: User = Depends(get_current_user)):
    user = database.users.find_one({"username": current_user.username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "username": user["username"],
        "email": user["email"],
        "role": user["role"],
        "verified": user.get("verified", False)
    }
    
@app.post("/admin/bulk-add-questions")
async def bulk_add_questions(
    request: dict,
    admin: User = Depends(get_current_admin)
):
    """Add multiple questions at once"""
    try:
        question_ids = []
        for question_data in request["questions"]:
            question_id = database.add_question(
                question_data["domain_id"],
                question_data["text"],
                request["admin_email"]
            )
            if question_id:
                question_ids.append(str(question_id))
        
        return {"message": f"Added {len(question_ids)} questions", "ids": question_ids}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@app.get("/verify-token")
async def verify_token(current_user: User = Depends(get_current_user)):
    return {"valid": True, "role": current_user.role}


@app.post("/analyze-interview")
async def analyze_interview(
    interview_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Analyze interview responses using Gemini API"""
    try:
        # Send data to Gemini API for analysis
        analysis = gemini_api.analyze_interview_responses(interview_data)
        
        # Save the analysis to database
        database.save_interview_analysis(
            user_id=current_user.username,
            interview_data=interview_data,
            analysis=analysis
        )
        
        return analysis
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing interview: {str(e)}"
        )
        
@app.get("/admin/admin-users", response_model=list[User])
async def get_admin_users(current_user: User = Depends(get_current_user)):
    """Get all admin users (only accessible to default admin)"""
    try:
        # Check if the requesting user is the default admin
        if current_user.email != DEFAULT_ADMIN_EMAIL:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the default admin can view admin users"
            )
        
        # Get all admin users
        users = list(database.users.find({"role": "admin"}))
        for user in users:
            user["id"] = str(user["_id"])
            del user["_id"]
            del user["password_hash"]
            user["verified"] = user.get("verified", False)
        return users
    except Exception as e:
        print(f"Error getting admin users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
@app.delete("/admin/posts/{post_id}")
async def delete_admin_post(
    post_id: str,
    admin: User = Depends(get_current_admin)
):
    """Delete an admin post (only allowed for default admin)"""
    try:
        # Check if the requesting user is the default admin
        if admin.email != DEFAULT_ADMIN_EMAIL:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the default admin can delete posts"
            )
            
        # Convert string ID to ObjectId
        from bson import ObjectId
        try:
            post_obj_id = ObjectId(post_id)
        except:
            raise HTTPException(
                status_code=400,
                detail="Invalid post ID format"
            )
            
        # Delete the post
        result = database.admin_posts.delete_one({"_id": post_obj_id})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=404,
                detail="Post not found"
            )
            
        return {"message": "Post deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )