from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import properties, users, transactions, responsibilities, announcements, tenant_requests
from database import engine

# Create the FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3000/Profile"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    with engine.connect() as connection:
        print("Connection successful!")
except Exception as e:
    print(f"Failed to connect: {e}")

# Include all routers
app.include_router(properties.router)
app.include_router(users.router)
app.include_router(transactions.router)
app.include_router(responsibilities.router)
app.include_router(announcements.router)
app.include_router(tenant_requests.router)

