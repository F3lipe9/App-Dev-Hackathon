from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import csv
from typing import List
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware


# CREATE A VIRTUAL ENVIRONMENT AND INSTALL THE REQUIRED FASTAPI PACKAGES

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",  
    "http://localhost:3000",   
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ---------------------------
# CSV "Database" Setup
# ---------------------------
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

USERS_CSV = DATA_DIR / "users.csv"
HABITS_CSV = DATA_DIR / "habits.csv"
AFFIRMATIONS_CSV = DATA_DIR / "affirmations.csv"


# Ensure CSV files exist with headers
if not USERS_CSV.exists():
    with open(USERS_CSV, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["username", "email", "password"])  # Only username and email

if not HABITS_CSV.exists():
    with open(HABITS_CSV, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["username", "id", "title", "description"])  # habits per user

if not AFFIRMATIONS_CSV.exists():
    # create with some default affirmations
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
    with open(AFFIRMATIONS_CSV, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["text"])
        for a in defaults:
            writer.writerow([a])



# ---------------------------
# Models
# ---------------------------
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class HabitCreate(BaseModel):
    username: str
    title: str
    description: str | None = ""

# ---------------------------
# Helper Functions
# ---------------------------
def read_csv(path: Path) -> List[dict]:
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        return list(reader)

def append_csv(path: Path, row: dict):
    with open(path, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=row.keys())
        writer.writerow(row)

# ---------------------------
# ROUTES
# ---------------------------
# REGISTER USER
@app.post("/register")
def register_user(data: RegisterRequest):
    users = read_csv(USERS_CSV)

    # Check if username or email already exists
    for u in users:
        if u["username"] == data.username:
            raise HTTPException(status_code=400, detail="Username already exists")
        if u["email"] == data.email:
            raise HTTPException(status_code=400, detail="Email already registered")

    append_csv(USERS_CSV, data.dict())
    return {"message": "User registered successfully"}

# LOGIN USER
@app.post("/login")
def login_user(data: LoginRequest):
    users = read_csv(USERS_CSV)
    user = next((u for u in users if u["username"] == data.username and u["password"] == data.password), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"Login successful for {data.username}"}

# HABITS endpoints
@app.get("/habits")
def get_habits(username: str):
    # return list of habits for a username
    habits = read_csv(HABITS_CSV)
    user_habits = [h for h in habits if h["username"] == username]
    return user_habits


@app.post("/habits")
def create_habit(h: HabitCreate):
    # generate a simple id
    import uuid
    hid = str(uuid.uuid4())
    row = {"username": h.username, "id": hid, "title": h.title, "description": h.description or ""}
    append_csv(HABITS_CSV, row)
    return {"message": "Habit created", "habit": row}


# AFFIRMATIONS endpoints
@app.get("/affirmations")
def get_affirmations():
    # read the affirmations.csv and return list of text
    with open(AFFIRMATIONS_CSV, newline="") as f:
        reader = csv.DictReader(f)
        return [r["text"] for r in reader]


class AffirmationCreate(BaseModel):
    text: str


