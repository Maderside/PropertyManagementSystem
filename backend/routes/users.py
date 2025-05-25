from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from models import Tenancy, User, UserResponse
from database import get_session
from auth import get_current_user, authenticate_user, create_access_token, Token, hash_password
import string
from random import choices

router = APIRouter()

@router.get("/get-tenants-for-property/{property_id}", response_model=List[User])
async def get_tenants_for_property(property_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = (
    select(User)
    .join(Tenancy, Tenancy.tenant_id == User.id)
    .where(Tenancy.property_id == property_id)
    .where(User.role == "tenant")
    )
    results = session.exec(statement)
    return results.all()
 
@router.post("/register", response_model=UserResponse)
async def register_user(user: User, session: Session = Depends(get_session)):
    # Check if the email is already registered
    statement = select(User).where(User.email == user.email)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered")

    # Hash the password before saving
    user.hashed_password = hash_password(user.hashed_password)

    # Add the user to the database
    session.add(user)
    session.commit()
    session.refresh(user)

    return user  # Return the user object, which will be serialized as UserResponse

@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = authenticate_user(form_data.username, form_data.password, session)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    access_token = create_access_token(data={"email": form_data.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="User not authenticated")
    return current_user

@router.put("/users/me/invite-code")
async def regenerate_invite_code(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="User not authenticated")

    # Generate a new random invite code
    new_invite_code = ''.join(choices(string.ascii_letters + string.digits, k=10))

    # Update the user's invite code
    current_user.invite_code = new_invite_code
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return {"message": "Invite code regenerated successfully", "invite_code": new_invite_code}