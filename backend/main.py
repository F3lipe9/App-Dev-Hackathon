import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import Response
from pydantic import ConfigDict, BaseModel, Field
from pydantic.functional_validators import BeforeValidator
from typing_extensions import Annotated
from fastapi.middleware.cors import CORSMiddleware

from bson import ObjectId
from pymongo import AsyncMongoClient
from pymongo import ReturnDocument
from dotenv import load_dotenv
import uuid

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL")

app = FastAPI()

# Add CORS middleware FIRST before any routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",  
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB setup
client = AsyncMongoClient(MONGO_URL)
db = client.habit_tracker_db

# Collections
users_collection = db.get_collection("users")
habits_collection = db.get_collection("habits")
affirmations_collection = db.get_collection("affirmations")
water_collection = db.get_collection("water_intake")

# Type for MongoDB ObjectId
PyObjectId = Annotated[str, BeforeValidator(str)]

# ---------------------------
# Models
# ---------------------------
class UserModel(BaseModel):
    id: PyObjectId | None = Field(alias="_id", default=None)
    username: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    model_config = ConfigDict(
        populate_by_name=True,
    )

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class HabitModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str = Field(...)
    title: str = Field(..., min_length=1)
    description: str = Field(default="")

class HabitCreate(BaseModel):
    username: str
    title: str
    description: str | None = ""

class AffirmationModel(BaseModel):
    id: PyObjectId | None = Field(alias="_id", default=None)
    text: str = Field(..., min_length=1)
    model_config = ConfigDict(
        populate_by_name=True,
    )

class AffirmationCreate(BaseModel):
    text: str

class WaterIntakeModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str = Field(...)
    bottleName: str = Field(..., min_length=1)
    bottleOz: int = Field(..., ge=1)
    dailyGoal: int = Field(..., ge=1)
    currentOz: int = Field(default=0, ge=0)

class WaterIntakeUpsert(BaseModel):
    username: str
    bottleName: str
    bottleOz: int
    dailyGoal: int
    currentOz: int | None = 0

# ---------------------------
# Helper Functions
# ---------------------------
async def initialize_default_affirmations():
    """Initialize default affirmations if collection is empty"""
    count = await affirmations_collection.count_documents({})
    if count == 0:
        defaults = [
            "I am capable of achieving my goals.",
            "I grow stronger and wiser every day.",
            "I choose progress over perfection.",
            "I embrace challenges and learn from them.",
            "I am worthy of success and happiness.",
            "I bring value to my work and my community.",
            "Today I will be kind to myself and others.",
            "My potential to succeed is infinite.",
            "I trust my intuition and make clear decisions.",
            "I am focused, persistent, and will never quit."
        ]
        
        for text in defaults:
            await affirmations_collection.insert_one({"text": text})

# ---------------------------
# ROUTES
# ---------------------------
@app.on_event("startup")
async def startup_event():
    """Initialize database with default data on startup"""
    await initialize_default_affirmations()

# REGISTER USER
@app.post(
    "/register",
    response_description="Register new user",
    status_code=status.HTTP_201_CREATED,
)
async def register_user(data: RegisterRequest):
    """
    Register a new user.
    """
    # Check if username already exists
    existing_user = await users_collection.find_one({"username": data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email already exists
    existing_email = await users_collection.find_one({"email": data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    new_user = {
        "username": data.username,
        "email": data.email,
        "password": data.password  # In production, hash this password!
    }
    
    result = await users_collection.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    
    return {"message": "User registered successfully", "user_id": str(result.inserted_id)}

# LOGIN USER
@app.post("/login")
async def login_user(data: LoginRequest):
    """
    Authenticate user with username and password.
    """
    user = await users_collection.find_one({
        "username": data.username,
        "password": data.password  # In production, compare hashed passwords!
    })
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    return {
        "message": f"Login successful for {data.username}",
        "user_id": str(user["_id"]),
        "username": user["username"]
    }

# HABITS endpoints
@app.get("/habits", response_description="Get user habits")
async def get_habits(username: str):
    """
    Get all habits for a specific user.
    """
    try:
        print(f"Fetching habits for username: {username}")
        habits = await habits_collection.find({"username": username}).to_list(1000)
        print(f"Found {len(habits)} habits")
        
        # Convert ObjectId to string for JSON serialization
        for habit in habits:
            if "_id" in habit:
                habit["_id"] = str(habit["_id"])
        
        return habits
    except Exception as e:
        print(f"Error fetching habits: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch habits: {str(e)}")

@app.post(
    "/habits",
    response_description="Create new habit",
    status_code=status.HTTP_201_CREATED,
)
async def create_habit(h: HabitCreate):
    """
    Create a new habit for a user.
    """
    try:
        # Generate UUID for the habit
        habit_id = str(uuid.uuid4())
        
        new_habit = {
            "id": habit_id,
            "username": h.username,
            "title": h.title,
            "description": h.description or ""
        }
        
        result = await habits_collection.insert_one(new_habit)
        new_habit["_id"] = str(result.inserted_id)
        
        return {
            "message": "Habit created successfully",
            "habit": new_habit
        }
    except Exception as e:
        print(f"Error creating habit: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create habit: {str(e)}")

# AFFIRMATIONS endpoints
@app.get("/affirmations", response_description="Get all affirmations")
async def get_affirmations():
    """
    Get all affirmations.
    """
    affirmations = await affirmations_collection.find().to_list(1000)
    
    # Extract just the text for backward compatibility
    # Or return full objects with IDs
    result = []
    for aff in affirmations:
        result.append({
            "id": str(aff["_id"]),
            "text": aff["text"]
        })
    
    return result

@app.post(
    "/affirmations",
    response_description="Create new affirmation",
    status_code=status.HTTP_201_CREATED,
)
async def create_affirmation(a: AffirmationCreate):
    """
    Create a new affirmation.
    """
    try:
        new_aff = {"text": a.text}
        result = await affirmations_collection.insert_one(new_aff)
        new_aff["_id"] = str(result.inserted_id)
        return {
            "message": "Affirmation created successfully",
            "affirmation": new_aff
        }
    except Exception as e:
        print(f"Error creating affirmation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create affirmation: {str(e)}")

# Delete habit endpoint
@app.delete("/habits/{habit_id}", response_description="Delete habit")
async def delete_habit(habit_id: str):
    """
    Delete a habit by ID.
    """
    delete_result = await habits_collection.delete_one({"id": habit_id})
    
    if delete_result.deleted_count == 1:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    
    raise HTTPException(status_code=404, detail=f"Habit {habit_id} not found")

# WATER INTAKE endpoints
@app.get("/water", response_description="Get water intake settings")
async def get_water(username: str):
    """Return water setup for a user."""
    try:
        doc = await water_collection.find_one({"username": username})
        if doc:
            doc["_id"] = str(doc.get("_id"))
            return doc
        return {
            "username": username,
            "bottleName": "",
            "bottleOz": 0,
            "dailyGoal": 0,
            "currentOz": 0,
        }
    except Exception as e:
        print(f"Error fetching water intake: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch water intake: {str(e)}")

@app.post("/water", response_description="Upsert water intake settings", status_code=status.HTTP_201_CREATED)
async def upsert_water(w: WaterIntakeUpsert):
    """Create or update water intake settings for a user."""
    try:
        payload = {
            "username": w.username,
            "bottleName": w.bottleName,
            "bottleOz": w.bottleOz,
            "dailyGoal": w.dailyGoal,
            "currentOz": w.currentOz or 0,
        }
        result = await water_collection.update_one(
            {"username": w.username},
            {"$set": payload},
            upsert=True,
        )

        if result.upserted_id:
            payload["_id"] = str(result.upserted_id)
        else:
            existing = await water_collection.find_one({"username": w.username})
            if existing:
                payload["_id"] = str(existing.get("_id"))

        return {"message": "Water intake saved", "water": payload}
    except Exception as e:
        print(f"Error saving water intake: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save water intake: {str(e)}")