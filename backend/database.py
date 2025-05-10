from sqlmodel import Session, create_engine
import os
# Database connection URL
DATABASE_URL = os.getenv("DATABASE_URL")

# Create the engine
engine = create_engine(DATABASE_URL)

# Dependency to get the database session
def get_session():
    with Session(engine) as session:
        yield session