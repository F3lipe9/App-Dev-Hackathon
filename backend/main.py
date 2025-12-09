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
from datetime import datetime

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
exercises_collection = db.get_collection("exercises")
exams_collection = db.get_collection("exams")
assignments_collection = db.get_collection("assignments")
courses_collection = db.get_collection("courses")

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

class ExerciseModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str = Field(...)
    name: str = Field(..., min_length=1)
    muscle: str = Field(default="Other")
    equipment: str = Field(default="Other")
    compound: bool = Field(default=False)
    category: str = Field(default="Strength")  # "Strength" | "Cardio"
    createdByUser: bool = Field(default=True)

class ExerciseCreate(BaseModel):
    username: str
    name: str
    muscle: str = "Other"
    equipment: str = "Other"
    compound: bool = False
    category: str = "Strength"

class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    muscle: Optional[str] = None
    equipment: Optional[str] = None
    compound: Optional[bool] = None
    category: Optional[str] = None

class ExamCreate(BaseModel):
    username: str
    course: str
    date: str
    planned_hours: int

# Assignment Models
class AssignmentBase(BaseModel):
    title: str
    course: str
    dueDate: str
    status: str = "pending"
    priority: str = "medium"
    type: str = "homework"
    points: str = "0"
    username: str = Field(...)  # Associate with user

class AssignmentCreate(AssignmentBase):
    pass

class Assignment(AssignmentBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class CourseBase(BaseModel):
    code: str
    name: str
    professor: str

class CourseCreate(CourseBase):
    pass

class Course(CourseBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ExamUpdate(BaseModel):
    course: str | None = None
    date: str | None = None
    planned_hours: int | None = None
    score: int | None = None
    done: bool | None = None

# ---------------------------
# Default Data
# ---------------------------
DEFAULT_STRENGTH_EXERCISES = [
    {"id": "bench", "name": "Barbell Bench Press", "muscle": "Chest", "equipment": "Barbell", "compound": True, "category": "Strength", "createdByUser": False},
    {"id": "squat", "name": "Back Squat", "muscle": "Legs", "equipment": "Barbell", "compound": True, "category": "Strength", "createdByUser": False},
    {"id": "deadlift", "name": "Deadlift", "muscle": "Legs", "equipment": "Barbell", "compound": True, "category": "Strength", "createdByUser": False},
    {"id": "ohp", "name": "Overhead Press", "muscle": "Shoulders", "equipment": "Barbell", "compound": True, "category": "Strength", "createdByUser": False},
    {"id": "row", "name": "Barbell Row", "muscle": "Back", "equipment": "Barbell", "compound": True, "category": "Strength", "createdByUser": False},
    {"id": "pullup", "name": "Pull-Ups", "muscle": "Back", "equipment": "Bodyweight", "compound": True, "category": "Strength", "createdByUser": False},
    {"id": "latpull", "name": "Lat Pulldown", "muscle": "Back", "equipment": "Cable", "compound": False, "category": "Strength", "createdByUser": False},
    {"id": "legpress", "name": "Leg Press", "muscle": "Legs", "equipment": "Machine", "compound": True, "category": "Strength", "createdByUser": False},
    {"id": "curl", "name": "Dumbbell Curl", "muscle": "Arms", "equipment": "Dumbbell", "compound": False, "category": "Strength", "createdByUser": False},
    {"id": "tricep", "name": "Triceps Pushdown", "muscle": "Arms", "equipment": "Cable", "compound": False, "category": "Strength", "createdByUser": False},
    {"id": "lateral", "name": "Lateral Raises", "muscle": "Shoulders", "equipment": "Dumbbell", "compound": False, "category": "Strength", "createdByUser": False},
]

DEFAULT_CARDIO_EXERCISES = [
    {"id": "tread", "name": "Treadmill Run", "muscle": "Cardio", "equipment": "Treadmill", "compound": False, "category": "Cardio", "createdByUser": False},
    {"id": "bike", "name": "Stationary Bike", "muscle": "Cardio", "equipment": "Bike", "compound": False, "category": "Cardio", "createdByUser": False},
    {"id": "rower", "name": "Rowing Machine", "muscle": "Cardio", "equipment": "Rower", "compound": False, "category": "Cardio", "createdByUser": False},
    {"id": "elliptical", "name": "Elliptical", "muscle": "Cardio", "equipment": "Elliptical", "compound": False, "category": "Cardio", "createdByUser": False},
    {"id": "stairs", "name": "Stair Climber", "muscle": "Cardio", "equipment": "Machine", "compound": False, "category": "Cardio", "createdByUser": False},
    {"id": "jumprope", "name": "Jump Rope", "muscle": "Cardio", "equipment": "Bodyweight", "compound": False, "category": "Cardio", "createdByUser": False},
]

DEFAULT_EXERCISES = DEFAULT_STRENGTH_EXERCISES + DEFAULT_CARDIO_EXERCISES

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

async def ensure_default_exercises(username: str):
    """Seed default exercises for this user if they don't already have any."""
    count = await exercises_collection.count_documents({"username": username})
    if count > 0:
        return

    docs = []
    for ex in DEFAULT_EXERCISES:
        docs.append({**ex, "username": username})
    if docs:
        await exercises_collection.insert_many(docs)


# ---------------------------
# ROUTES
# ---------------------------
@app.on_event("startup")
async def startup_event():
    """Initialize database with default data on startup"""
    await initialize_default_affirmations()
    # Removed: await initialize_sample_data()  # Don't auto-populate sample assignments

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
    
# EXERCISES endpoints
@app.get("/exercises", response_description="Get user exercises")
async def get_exercises(username: str):
    """
    Returns the exercise library for a user.
    Seeds defaults on first access.
    """
    try:
        await ensure_default_exercises(username)

        exercises = await exercises_collection.find({"username": username}).to_list(2000)

        for ex in exercises:
            if "_id" in ex:
                ex["_id"] = str(ex["_id"])

        return exercises
    except Exception as e:
        print(f"Error fetching exercises: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch exercises: {str(e)}")

@app.post("/exercises", response_description="Create custom exercise", status_code=status.HTTP_201_CREATED)
async def create_exercise(ex: ExerciseCreate):
    """
    Create a custom exercise for a user.
    """
    try:
        new_ex = {
            "id": str(uuid.uuid4()),
            "username": ex.username,
            "name": ex.name,
            "muscle": ex.muscle or "Other",
            "equipment": ex.equipment or "Other",
            "compound": bool(ex.compound) if ex.category == "Strength" else False,
            "category": ex.category or "Strength",
            "createdByUser": True,
        }

        result = await exercises_collection.insert_one(new_ex)
        new_ex["_id"] = str(result.inserted_id)

        return {"message": "Exercise created", "exercise": new_ex}
    except Exception as e:
        print(f"Error creating exercise: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create exercise: {str(e)}")

@app.put("/exercises/{exercise_id}", response_description="Update exercise")
async def update_exercise(exercise_id: str, patch: ExerciseUpdate):
    """
    Update an exercise by its 'id' field (not Mongo _id).
    Works for both defaults and custom exercises.
    """
    try:
        update_doc = {k: v for k, v in patch.model_dump().items() if v is not None}

        if "category" in update_doc and update_doc["category"] == "Cardio":
            update_doc["compound"] = False

        if not update_doc:
            raise HTTPException(status_code=400, detail="No fields provided to update")

        updated = await exercises_collection.find_one_and_update(
            {"id": exercise_id},
            {"$set": update_doc},
            return_document=ReturnDocument.AFTER,
        )

        if not updated:
            raise HTTPException(status_code=404, detail="Exercise not found")

        updated["_id"] = str(updated.get("_id"))
        return {"message": "Exercise updated", "exercise": updated}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating exercise: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update exercise: {str(e)}")

@app.delete("/exercises/{exercise_id}", response_description="Delete exercise")
async def delete_exercise(exercise_id: str):
    """
    Delete an exercise by its 'id' field.
    """
    try:
        delete_result = await exercises_collection.delete_one({"id": exercise_id})

        if delete_result.deleted_count == 1:
            return Response(status_code=status.HTTP_204_NO_CONTENT)

        raise HTTPException(status_code=404, detail="Exercise not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting exercise: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete exercise: {str(e)}")

# EXAMS endpoints
@app.post("/exams", response_description="Create exam", status_code=status.HTTP_201_CREATED)
async def create_exam(exam: ExamCreate):
    """
    Create an exam document in MongoDB.
    """
    try:
        doc = exam.model_dump()
        result = await exams_collection.insert_one(doc)
        return {"id": str(result.inserted_id), "message": "Exam created"}
    except Exception as e:
        print(f"Error creating exam: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create exam: {str(e)}")

@app.get("/exams", response_description="Get exams for user")
async def get_exams(username: str):
    """
    Get all exams for a specific user.
    """
    try:
        exams = await exams_collection.find({"username": username}).to_list(1000)
        for ex in exams:
            ex["_id"] = str(ex["_id"])
        return exams
    except Exception as e:
        print(f"Error fetching exams: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch exams: {str(e)}")

# -----------------------------------------------------------
# ASSIGNMENTS endpoints
# -----------------------------------------------------------
@app.get("/assignments", response_description="Get all assignments", response_model=List[Assignment])
async def get_assignments():
    """
    Get all assignments.
    """
    try:
        assignments = await assignments_collection.find().to_list(1000)
        return assignments
    except Exception as e:
        print(f"Error fetching assignments: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch assignments: {str(e)}")

@app.get("/assignments/user/{username}", response_description="Get assignments for user", response_model=List[Assignment])
async def get_user_assignments(username: str):
    """
    Get assignments for a specific user.
    """
    try:
        assignments = await assignments_collection.find({"username": username}).to_list(1000)
        return assignments
    except Exception as e:
        print(f"Error fetching user assignments: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch assignments: {str(e)}")

@app.get("/assignments/{assignment_id}", response_description="Get assignment by ID", response_model=Assignment)
async def get_assignment(assignment_id: str):
    """
    Get a specific assignment by ID.
    """
    try:
        assignment = await assignments_collection.find_one({"_id": ObjectId(assignment_id)})
        if assignment is None:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return assignment
    except Exception as e:
        print(f"Error fetching assignment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch assignment: {str(e)}")

@app.post("/assignments", response_description="Create new assignment", status_code=status.HTTP_201_CREATED, response_model=Assignment)
async def create_assignment(assignment: AssignmentCreate):
    """
    Create a new assignment.
    """
    try:
        assignment_dict = assignment.model_dump()
        result = await assignments_collection.insert_one(assignment_dict)
        created_assignment = await assignments_collection.find_one({"_id": result.inserted_id})
        return created_assignment
    except Exception as e:
        print(f"Error creating assignment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create assignment: {str(e)}")

@app.put("/assignments/{assignment_id}", response_description="Update assignment", response_model=Assignment)
async def update_assignment(assignment_id: str, assignment: AssignmentCreate):
    """
    Update an assignment.
    """
    try:
        assignment_dict = assignment.model_dump(exclude_unset=True)
        
        if len(assignment_dict) >= 1:
            update_result = await assignments_collection.update_one(
                {"_id": ObjectId(assignment_id)},
                {"$set": assignment_dict}
            )
            
            if update_result.modified_count == 0:
                raise HTTPException(status_code=404, detail="Assignment not found")
        
        updated_assignment = await assignments_collection.find_one({"_id": ObjectId(assignment_id)})
        if updated_assignment is None:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        return updated_assignment
    except Exception as e:
        print(f"Error updating assignment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update assignment: {str(e)}")

@app.delete("/assignments/{assignment_id}", response_description="Delete assignment")
async def delete_assignment(assignment_id: str):
    """
    Delete an assignment.
    """
    try:
        delete_result = await assignments_collection.delete_one({"_id": ObjectId(assignment_id)})
        
        if delete_result.deleted_count == 1:
            return {"success": True, "id": assignment_id}
        
        raise HTTPException(status_code=404, detail="Assignment not found")
    except Exception as e:
        print(f"Error deleting assignment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete assignment: {str(e)}")

# -----------------------------------------------------------
# COURSES endpoints
# -----------------------------------------------------------
@app.get("/courses", response_description="Get all courses", response_model=List[Course])
async def get_courses():
    """
    Get all courses.
    """
    try:
        courses = await courses_collection.find().to_list(1000)
        return courses
    except Exception as e:
        print(f"Error fetching courses: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch courses: {str(e)}")

@app.post("/courses", response_description="Create new course", status_code=status.HTTP_201_CREATED, response_model=Course)
async def create_course(course: CourseCreate):
    """
    Create a new course.
    """
    try:
        course_dict = course.model_dump()
        result = await courses_collection.insert_one(course_dict)
        created_course = await courses_collection.find_one({"_id": result.inserted_id})
        return created_course
    except Exception as e:
        print(f"Error creating course: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create course: {str(e)}")

@app.get("/courses/{course_code}", response_description="Get course by code", response_model=Course)
async def get_course_by_code(course_code: str):
    """
    Get a course by its code.
    """
    try:
        course = await courses_collection.find_one({"code": course_code})
        if course is None:
            raise HTTPException(status_code=404, detail="Course not found")
        return course
    except Exception as e:
        print(f"Error fetching course: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch course: {str(e)}")

# -----------------------------------------------------------
# ADMIN/UTILITY endpoints
# -----------------------------------------------------------
@app.delete("/admin/clear-assignments", response_description="Clear all assignments")
async def clear_all_assignments():
    """
    Delete all assignments from the database. USE WITH CAUTION.
    """
    try:
        result = await assignments_collection.delete_many({})
        return {"message": f"Deleted {result.deleted_count} assignments"}
    except Exception as e:
        print(f"Error clearing assignments: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear assignments: {str(e)}")

@app.delete("/admin/clear-courses", response_description="Clear all courses")
async def clear_all_courses():
    """
    Delete all courses from the database. USE WITH CAUTION.
    """
    try:
        result = await courses_collection.delete_many({})
        return {"message": f"Deleted {result.deleted_count} courses"}
    except Exception as e:
        print(f"Error clearing courses: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear courses: {str(e)}")
    
@app.put("/exams/{exam_id}", response_description="Update exam")
async def update_exam(exam_id: str, patch: ExamUpdate):
    """
    Update an exam document by Mongo _id.
    """
    try:
        update_doc = {k: v for k, v in patch.model_dump().items() if v is not None}
        if not update_doc:
            raise HTTPException(status_code=400, detail="No fields provided to update")

        updated = await exams_collection.find_one_and_update(
            {"_id": ObjectId(exam_id)},
            {"$set": update_doc},
            return_document=ReturnDocument.AFTER,
        )

        if not updated:
            raise HTTPException(status_code=404, detail="Exam not found")

        updated["_id"] = str(updated["_id"])
        return {"message": "Exam updated", "exam": updated}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating exam: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update exam: {str(e)}")