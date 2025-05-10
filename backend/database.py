from sqlmodel import Session, create_engine, select
# Database connection URL
DATABASE_URL = "postgresql://postgres.ofafdftoqihnwfcxnkmf:Maderside3248@aws-0-eu-north-1.pooler.supabase.com:6543/postgres"

# Create the engine
engine = create_engine(DATABASE_URL)

# Dependency to get the database session
def get_session():
    with Session(engine) as session:
        yield session