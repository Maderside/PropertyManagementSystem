from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from models import Responsibility, User, RentalProperty
from database import get_session
from auth import get_current_user
from typing import List

router = APIRouter()

@router.get("/responsibilities/{property_id}", response_model=List[Responsibility])
async def get_responsibilities(property_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Responsibility).where(Responsibility.property_id == property_id)
    responsibilities = session.exec(statement).all()
    if not responsibilities:
        raise HTTPException(status_code=404, detail="Responsibilities not found")
    return responsibilities

@router.post("/add-responsibility/{property_id}", response_model=Responsibility)
async def add_responsibility(property_id: int, responsibility: Responsibility, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can add responsibilities")

    # Check if the property exists and belongs to the current landlord
    property_statement = select(RentalProperty).where(
        RentalProperty.id == property_id,
        RentalProperty.landlord_id == current_user.id
    )
    property = session.exec(property_statement).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found or does not belong to you")

    # Create a new responsibility
    new_responsibility = Responsibility(
        property_id=property_id,
        title=responsibility.title,
        description=responsibility.description,
        due_date=responsibility.due_date
    )

    session.add(new_responsibility)
    session.commit()
    session.refresh(new_responsibility)

    return new_responsibility

@router.put("/update-responsibility/{responsibility_id}", response_model=Responsibility)
async def update_responsibility(responsibility_id: int, updated_responsibility: Responsibility, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can update responsibilities")

    # Fetch the responsibility to be updated
    responsibility_statement = select(Responsibility).where(Responsibility.id == responsibility_id)
    responsibility = session.exec(responsibility_statement).first()
    if not responsibility:
        raise HTTPException(status_code=404, detail="Responsibility not found")

    # Check if the property belongs to the current landlord
    property_statement = select(RentalProperty).where(
        RentalProperty.id == responsibility.property_id,
        RentalProperty.landlord_id == current_user.id
    )
    property = session.exec(property_statement).first()
    if not property:
        raise HTTPException(status_code=403, detail="You do not have permission to update this responsibility")

    # Update responsibility fields
    responsibility.title = updated_responsibility.title
    responsibility.description = updated_responsibility.description
    responsibility.due_date = updated_responsibility.due_date

    session.add(responsibility)
    session.commit()
    session.refresh(responsibility)

    return responsibility

@router.delete("/delete-responsibility/{responsibility_id}")
async def delete_responsibility(responsibility_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can delete responsibilities")

    # Fetch the responsibility to be deleted
    responsibility_statement = select(Responsibility).where(Responsibility.id == responsibility_id)
    responsibility = session.exec(responsibility_statement).first()
    if not responsibility:
        raise HTTPException(status_code=404, detail="Responsibility not found")

    # Check if the property belongs to the current landlord
    property_statement = select(RentalProperty).where(
        RentalProperty.id == responsibility.property_id,
        RentalProperty.landlord_id == current_user.id
    )
    property = session.exec(property_statement).first()
    if not property:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this responsibility")

    # Delete the responsibility
    session.delete(responsibility)
    session.commit()

    return {"message": "Responsibility deleted successfully"}