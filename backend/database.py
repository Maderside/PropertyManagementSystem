from sqlmodel import Session, create_engine
from dotenv import load_dotenv
import os

load_dotenv()

# Database connection URL
DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Connecting to database at {DATABASE_URL}")

# Create the engine
engine = create_engine(DATABASE_URL)

# Dependency to get the database session
def get_session():
    with Session(engine) as session:
        yield session