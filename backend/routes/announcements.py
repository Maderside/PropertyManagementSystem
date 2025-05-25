from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from models import Announcement, User, RentalProperty
from database import get_session
from auth import get_current_user
from typing import List

router = APIRouter()

@router.get("/announcements/{property_id}", response_model=List[Announcement])
async def get_announcements(property_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Announcement).where(Announcement.property_id == property_id)
    announcements = session.exec(statement).all()
    if not announcements:
        raise HTTPException(status_code=404, detail="Announcements not found")
    return announcements

@router.post("/add-announcement/{property_id}", response_model=Announcement)
async def add_announcement(
    property_id: int,
    announcement: Announcement,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can add announcements")

    # Check if the property exists and belongs to the current landlord
    property_statement = select(RentalProperty).where(
        RentalProperty.id == property_id,
        RentalProperty.landlord_id == current_user.id
    )
    property = session.exec(property_statement).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found or does not belong to you")

    # Create a new announcement
    new_announcement = Announcement(
        property_id=property_id,
        title=announcement.title,
        message=announcement.message
    )

    session.add(new_announcement)
    session.commit()
    session.refresh(new_announcement)

    return new_announcement

@router.put("/update-announcement/{announcement_id}", response_model=Announcement)
async def update_announcement(
    announcement_id: int,
    updated_announcement: Announcement,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can update announcements")

    # Fetch the announcement to be updated
    announcement_statement = select(Announcement).where(Announcement.id == announcement_id)
    announcement = session.exec(announcement_statement).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    # Check if the property belongs to the current landlord
    property_statement = select(RentalProperty).where(
        RentalProperty.id == announcement.property_id,
        RentalProperty.landlord_id == current_user.id
    )
    property = session.exec(property_statement).first()
    if not property:
        raise HTTPException(status_code=403, detail="You do not have permission to update this announcement")

    # Update announcement fields
    announcement.title = updated_announcement.title
    announcement.message = updated_announcement.message

    session.add(announcement)
    session.commit()
    session.refresh(announcement)

    return announcement

@router.delete("/delete-announcement/{announcement_id}")
async def delete_announcement(
    announcement_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can delete announcements")

    # Fetch the announcement to be deleted
    announcement_statement = select(Announcement).where(Announcement.id == announcement_id)
    announcement = session.exec(announcement_statement).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    # Check if the property belongs to the current landlord
    property_statement = select(RentalProperty).where(
        RentalProperty.id == announcement.property_id,
        RentalProperty.landlord_id == current_user.id
    )
    property = session.exec(property_statement).first()
    if not property:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this announcement")

    # Delete the announcement
    session.delete(announcement)
    session.commit()

    return {"message": "Announcement deleted successfully"}