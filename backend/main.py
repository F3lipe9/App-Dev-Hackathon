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
    "http://127.0.0.1:5173",  # Add this too
    "http://localhost:3000",   # React default port
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
TWEETS_CSV = DATA_DIR / "tweets.csv"

# Ensure CSV files exist with headers
if not USERS_CSV.exists():
    with open(USERS_CSV, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["username", "email"])  # Only username and email

if not TWEETS_CSV.exists():
    with open(TWEETS_CSV, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["username", "image_link", "description", "likes"])

# ---------------------------
# Models
# ---------------------------
class LoginRequest(BaseModel):
    username: str

class RegisterRequest(BaseModel):
    username: str
    email: str

class TweetRequest(BaseModel):
    username: str
    image_link: str
    description: str
    likes: int = 0  # default to 0

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
# 1. REGISTER USER
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

# 2. GET ALL TWEETS (FEED)
@app.get("/feed")
def get_feed():
    tweets = read_csv(TWEETS_CSV)
    # Convert likes to int
    for t in tweets:
        t["likes"] = int(t.get("likes", 0))
    return tweets

# 3. CREATE A NEW TWEET
@app.post("/tweet")
def create_tweet(data: TweetRequest):
    users = read_csv(USERS_CSV)
    if data.username not in [u["username"] for u in users]:
        raise HTTPException(status_code=400, detail="User does not exist")

    append_csv(TWEETS_CSV, data.dict())
    return {"message": "Tweet posted"}

# 4. GET USER PROFILE
@app.get("/profile/{username}")
def get_profile(username: str):
    users = read_csv(USERS_CSV)
    tweets = read_csv(TWEETS_CSV)

    user = next((u for u in users if u["username"] == username), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_tweets = [t for t in tweets if t["username"] == username]
    for t in user_tweets:
        t["likes"] = int(t.get("likes", 0))

    return {
        "user": user,      # Includes username and email
        "tweets": user_tweets
    }

# 5. LOGIN USER
@app.post("/login")
def login_user(data: LoginRequest):
    users = read_csv(USERS_CSV)
    user = next((u for u in users if u["username"] == data.username), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"Login successful for {data.username}"}