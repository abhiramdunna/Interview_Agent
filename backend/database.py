from urllib.parse import quote_plus
from bson import ObjectId
from pymongo import MongoClient, ASCENDING, IndexModel
from pymongo.errors import OperationFailure, CollectionInvalid
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os
import random
import string
from config import (
    MONGO_URI, DB_NAME, 
    DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD
)


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# MongoDB Connection
try:
    client = MongoClient(os.getenv("MONGO_URI", MONGO_URI))
    db = client[os.getenv("DB_NAME", DB_NAME)]
    print("✅ Connected to MongoDB")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    raise


# Collections
users = db.users
otps = db.otps
admin_requests = db.admin_requests# In database.py, make sure this is at the top level with other collections
evaluations = db.evaluations


def save_evaluation(response_id, evaluation):
    try:
        result = evaluations.insert_one({
            "response_id": response_id,
            "evaluation": evaluation,
            "created_at": datetime.utcnow()
        })
        return result.inserted_id is not None
    except Exception as e:
        print(f"Error saving evaluation: {e}")
        return False

# User Management
def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# In database.py, update the create_user function
def create_user(username, email, password, role="user"):
    try:
        # Check for existing email (new requirement)
        if users.find_one({"email": email}):
            return None

        user = {
            "username": username,
            "email": email,
            "password_hash": get_password_hash(password),
            "role": role,
            "created_at": datetime.utcnow()
        }
        return users.insert_one(user).inserted_id
    except Exception as e:
        print(f"Error creating user: {e}")
        return None    
    
def create_collections():
    collections_config = {
        "users": {
            "indexes": [
                {"name": "unique_username", "key": [("username", ASCENDING)], "unique": True},
                {"name": "unique_email", "key": [("email", ASCENDING)], "unique": True},
                {"name": "role_index", "key": [("role", ASCENDING)]}
            ],
            "validator": {
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": ["username", "email", "password_hash", "role"],
                    "properties": {
                        "username": {"bsonType": "string"},
                        "email": {"bsonType": "string"},
                        "password_hash": {"bsonType": "string"},
                        "role": {"bsonType": "string", "enum": ["admin", "user"]},
                        "verified": {"bsonType": "bool"},
                        "created_at": {"bsonType": "date"}
                    }
                }
            }
        },
        "admin_requests": {
            "indexes": [
                {"name": "unique_pending_email", "key": [("email", ASCENDING)], 
                 "unique": True, 
                 "partialFilterExpression": {"status": "pending"}},
                {"name": "status_index", "key": [("status", ASCENDING)]}
            ]
        },
        "otps": {
            "indexes": [
                {"name": "otp_email_index", "key": [("email", ASCENDING)]},
                {"name": "otp_expiry_index", "key": [("expires_at", ASCENDING)]}
            ]
        }
    }

    for col_name, config in collections_config.items():
        try:
            # Create collection if it doesn't exist
            if col_name not in db.list_collection_names():
                db.create_collection(col_name, validator=config.get("validator"))
                print(f"✅ Created collection: {col_name}")

            collection = db[col_name]
            
            # Get existing indexes
            existing_indexes = collection.index_information()
            
            # Create or update indexes
            for index_def in config["indexes"]:
                index_name = index_def["name"]
                try:
                    # Drop existing index if it exists
                    if index_name in existing_indexes:
                        collection.drop_index(index_name)
                        print(f"♻️ Dropped existing index: {index_name}")
                    
                    # Create new index
                    collection.create_index(
                        index_def["key"],
                        name=index_name,
                        unique=index_def.get("unique", False),
                        partialFilterExpression=index_def.get("partialFilterExpression", None)
                    )
                    print(f"✅ Created index: {index_name}")
                except Exception as index_error:
                    print(f"⚠️ Failed to create index {index_name}: {index_error}")
                    
        except Exception as e:
            print(f"❌ Error setting up {col_name}: {e}")

    print("✅ All collections and indexes initialized")
               
def get_user_by_email(email):
    return users.find_one({"email": email})

def grant_admin_access(email, processed_by=None):
    try:
        # Find the admin request
        request = admin_requests.find_one({
            "email": email,
            "status": "pending"
        })
        
        if not request:
            print(f"No pending admin request found for email: {email}")
            return False

        # Check if user exists
        user = users.find_one({"email": email})
        
        if user:
            # Update existing user to admin
            result = users.update_one(
                {"email": email},
                {
                    "$set": {
                        "role": "admin",
                        "verified": True,
                        "admin_request_pending": False
                    }
                }
            )
        else:
            # If user doesn't exist, create them as admin with the password from the request
            # Note: You'll need to modify request_admin_access to store the hashed password
            create_user(
                username=email.split('@')[0],
                email=email,
                password=request.get('password_hash', str(ObjectId())),  # Use stored password or random
                role="admin"
            )
            users.update_one(
                {"email": email},
                {"$set": {"verified": True}}
            )

        # Update the admin request status
        admin_requests.update_one(
            {"_id": request["_id"]},
            {
                "$set": {
                    "status": "approved",
                    "processed_at": datetime.utcnow(),
                    "processed_by": processed_by
                }
            }
        )
        
        return True
    except Exception as e:
        print(f"Error granting admin access: {e}")
        return False
    
    
# OTP Management
def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

def create_otp(email, expires_minutes=5):
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=expires_minutes)
    otps.update_one(
        {"email": email},
        {"$set": {"otp": otp, "expires_at": expires_at, "verified": False}},
        upsert=True
    )
    return otp

def verify_otp(email, otp):
    record = otps.find_one({"email": email})
    if not record or datetime.utcnow() > record["expires_at"]:
        return False
    if record["otp"] == otp and not record["verified"]:
        otps.update_one({"email": email}, {"$set": {"verified": True}})
        return True
    return False

# Admin Management
def create_default_admin():
    if not users.find_one({"email": DEFAULT_ADMIN_EMAIL}):
        create_user(
            username="admin",
            email=DEFAULT_ADMIN_EMAIL,
            password=DEFAULT_ADMIN_PASSWORD,
            role="admin"
        )
        users.update_one(
            {"email": DEFAULT_ADMIN_EMAIL},
            {"$set": {"is_default_admin": True, "verified": True}}
        )



def request_admin_access(email, message, full_name, phone, password):
    try:
        # First create or update the user account
        user = users.find_one({"email": email})
        
        if not user:
            # Create new user with admin_request_pending flag
            user_data = {
                "username": email.split('@')[0],
                "email": email,
                "password_hash": get_password_hash(password),  # Store hashed password
                "role": "user",
                "admin_request_pending": True,
                "created_at": datetime.utcnow()
            }
            users.insert_one(user_data)
        else:
            # Update existing user
            users.update_one(
                {"email": email},
                {
                    "$set": {
                        "admin_request_pending": True,
                        "password_hash": get_password_hash(password)  # Update password if needed
                    }
                }
            )
        
        # Create the admin request (store hashed password for reference)
        result = admin_requests.insert_one({
            "email": email,
            "message": message,
            "full_name": full_name,
            "phone": phone,
            "password_hash": get_password_hash(password),  # Store hashed password
            "status": "pending",
            "requested_at": datetime.utcnow(),
            "processed_at": None,
            "processed_by": None
        })
        
        return result.inserted_id is not None
    except Exception as e:
        print(f"Error creating admin request: {e}")
        return False                
def get_pending_admin_requests():
    try:
        # Only get requests with "pending" status
        requests = list(admin_requests.find({"status": "pending"}))
        print(f"Found {len(requests)} pending requests in database")
        for req in requests:
            req["id"] = str(req["_id"])
            del req["_id"]
        return requests
    except Exception as e:
        print(f"Error getting admin requests: {e}")
        return []

# In database.py:
# Add these collections
domains = db.domains
questions = db.questions
responses = db.responses

def create_domain(name, admin_email=None):
    try:
        domain = {
            "name": name,
            "created_at": datetime.utcnow(),
            "created_by": admin_email
        }
        result = domains.insert_one(domain)
        domain['_id'] = result.inserted_id
        domain['id'] = str(result.inserted_id)
        return domain  # Return the full domain object
    except Exception as e:
        print(f"Error creating domain: {e}")
        return None
    
def add_question(domain_id, text, admin_email=None, time_limit=60):  # Add time_limit parameter
    try:
        question = {
            "domain_id": domain_id,
            "text": text,
            "time_limit": time_limit,  # Add this field
            "created_at": datetime.utcnow(),
            "created_by": admin_email
        }
        return questions.insert_one(question).inserted_id
    except Exception as e:
        print(f"Error adding question: {e}")
        return None

def get_all_domains(admin_email=None):
    try:
        query = {}
        if admin_email:
            query["created_by"] = admin_email
            
        domains_list = list(domains.find(query))
        
        formatted_domains = []
        for domain in domains_list:
            created_at = domain.get("created_at")
            if isinstance(created_at, datetime):
                created_at = created_at.isoformat()
            elif created_at is None:
                created_at = datetime.utcnow().isoformat()
                
            formatted_domain = {
                "id": str(domain["_id"]),
                "name": domain.get("name", "Unnamed Domain"),
                "created_at": created_at,
                "created_by": domain.get("created_by")
            }
            formatted_domains.append(formatted_domain)
            
        return formatted_domains
    except Exception as e:
        print(f"Error retrieving domains: {e}")
        raise
    
    
def get_all_questions(admin_email=None):
    try:
        query = {}
        if admin_email:
            query["created_by"] = admin_email
            
        questions_list = list(questions.find(query))
        for question in questions_list:
            question["id"] = str(question["_id"])
            del question["_id"]
            question["domain_id"] = str(question["domain_id"])
            # Ensure time_limit exists, default to 60 if not
            question["time_limit"] = question.get("time_limit", 60)
        return questions_list
    except Exception as e:
        print(f"Error retrieving questions: {e}")
        return []

def get_questions_by_domain(domain_id):
    try:
        # Convert string ID to ObjectId if necessary
        from bson import ObjectId
        try:
            q_id = ObjectId(domain_id) if isinstance(domain_id, str) else domain_id
            # Check if domain exists
            domain = domains.find_one({"_id": q_id})
            if not domain:
                print(f"Domain with ID {domain_id} not found")
                return None
        except:
            print(f"Invalid domain ID format: {domain_id}")
            return None
            
        # Use string ID for query since we're storing as string
        domain_questions = list(questions.find({"domain_id": str(domain_id)}))
        print(f"Found {len(domain_questions)} questions for domain {domain_id}")  # Add logging
        
        for question in domain_questions:
            question["id"] = str(question["_id"])
            del question["_id"]
            question["domain_id"] = str(question["domain_id"])
            # Ensure time_limit exists
            question["time_limit"] = question.get("time_limit", 60)
        return domain_questions
    except Exception as e:
        print(f"Error retrieving questions by domain: {e}")
        return None

def delete_domain(domain_id):
    try:
        # domain_id should already be ObjectId at this point
        # Delete the domain
        result = domains.delete_one({"_id": domain_id})
        if result.deleted_count == 0:
            return False
            
        # Delete all questions associated with this domain
        # Note we're using the string representation here
        questions.delete_many({"domain_id": str(domain_id)})
        
        return True
    except Exception as e:
        print(f"Error deleting domain: {e}")
        return False
    
    
def delete_question(question_id):
    try:
        # Convert string ID to ObjectId if necessary
        if isinstance(question_id, str):
            from bson import ObjectId
            try:
                question_id = ObjectId(question_id)
            except:
                print(f"Invalid question ID format: {question_id}")
                return False
                
        # Delete the question
        result = questions.delete_one({"_id": question_id})
        if result.deleted_count == 0:
            return False
            
        # Delete all responses associated with this question
        responses.delete_many({"question_id": question_id})
        
        return True
    except Exception as e:
        print(f"Error deleting question: {e}")
        return False

def add_user_response(question_id, user_id, user_response, test_log=None, photo=None):
    try:
        response = {
            "question_id": str(question_id),
            "user_id": user_id,
            "user_response": user_response,
            "test_log": test_log or [],
            "photo": photo,
            "created_at": datetime.utcnow()
        }
        result = responses.insert_one(response)
        return str(result.inserted_id)
    except Exception as e:
        print(f"Error adding response: {e}")
        return None

def get_all_responses(admin_email=None):
    try:
        query = {}
        if admin_email:
            # Get all questions created by this admin
            admin_questions = questions.find({"created_by": admin_email}, {"_id": 1})
            question_ids = [str(q["_id"]) for q in admin_questions]
            query["question_id"] = {"$in": question_ids}
            
        responses_list = list(responses.find(query))
        for response in responses_list:
            response["id"] = str(response["_id"])
            del response["_id"]
        return responses_list
    except Exception as e:
        print(f"Error retrieving responses: {e}")
        return []

def get_responses_by_question(question_id):
    try:
        # Use string ID directly since we're storing as string
        question_responses = list(responses.find({"question_id": str(question_id)}))
        for response in question_responses:
            response["id"] = str(response["_id"])
            del response["_id"]
            # Ensure all required fields are present
            response.setdefault("user_response", "")
            response.setdefault("created_at", datetime.utcnow())
        return question_responses
    except Exception as e:
        print(f"Error retrieving responses by question: {e}")
        return []

def get_responses_by_user(user_id):
    try:
        user_responses = list(responses.find({"user_id": user_id}))
        for response in user_responses:
            response["id"] = str(response["_id"])
            del response["_id"]
        return user_responses
    except Exception as e:
        print(f"Error retrieving responses by user: {e}")
        return []
    
    
# Add this collection with others
admin_posts = db.admin_posts

def create_admin_post(post_data):
    try:
        return admin_posts.insert_one(post_data).inserted_id
    except Exception as e:
        print(f"Error creating admin post: {e}")
        return None

def get_all_admin_posts():
    try:
        posts = list(admin_posts.find().sort("created_at", -1))
        for post in posts:
            post["id"] = str(post["_id"])
            del post["_id"]
        return posts
    except Exception as e:
        print(f"Error getting admin posts: {e}")
        return []
    
import PyPDF2
from io import BytesIO

def extract_questions_from_pdf(pdf_file):
    try:
        questions = []
        pdf_reader = PyPDF2.PdfReader(BytesIO(pdf_file.read()))
        
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                # Split by question markers (adjust as needed)
                lines = text.split('\n')
                current_question = []
                
                for line in lines:
                    line = line.strip()
                    if line:
                        if line.startswith(('Q:', 'Question', 'Q.', 'Q ')) and current_question:
                            questions.append(' '.join(current_question))
                            current_question = [line]
                        else:
                            current_question.append(line)
                
                if current_question:
                    questions.append(' '.join(current_question))
                    
        return questions
    except Exception as e:
        print(f"Error extracting questions from PDF: {e}")
        return []
    
def save_interview_analysis(user_id, interview_data, analysis):
    try:
        result = db.interview_analyses.insert_one({
            "user_id": user_id,
            "interview_data": interview_data,
            "analysis": analysis,
            "analyzed_at": datetime.utcnow()
        })
        return result.inserted_id
    except Exception as e:
        print(f"Error saving interview analysis: {e}")
        return None