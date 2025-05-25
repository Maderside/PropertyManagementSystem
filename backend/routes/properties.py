from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from models import RentalProperty, User, Tenancy
from database import get_session
from auth import get_current_user
from datetime import datetime

router = APIRouter()

# Protect the rental properties endpoint
@router.get("/rental-properties", response_model=List[RentalProperty])
async def get_rental_properties(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):  
    if not current_user:
        raise HTTPException(status_code=401, detail="User not authenticated")
    if current_user.role == "landlord":
        statement = select(RentalProperty).where(RentalProperty.landlord_id == current_user.id)
    else:
        statement = (
            select(RentalProperty)
            .join(Tenancy, Tenancy.property_id == RentalProperty.id)
            .where(Tenancy.tenant_id == current_user.id)
        )
    results = session.exec(statement)
    return results.all()

@router.get("/property/{property_id}", response_model=RentalProperty)
async def get_property(property_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(RentalProperty).where(RentalProperty.id == property_id)
    property = session.exec(statement).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    return property

@router.post("/add-property", response_model=RentalProperty)
async def add_property(
    property: RentalProperty,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can add you to properties")

    # Assign the landlord ID to the property
    property.landlord_id = current_user.id

    # Add the property to the database
    session.add(property)
    session.commit()
    session.refresh(property)

    return property

@router.delete("/delete-property/{property_id}")
async def delete_property(
    property_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can delete properties")

    # Fetch the property to be deleted
    property_statement = select(RentalProperty).where(
        RentalProperty.id == property_id,
        RentalProperty.landlord_id == current_user.id
    )
    property = session.exec(property_statement).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found or does not belong to you")

    # Delete the property
    session.delete(property)
    session.commit()

    return {"message": "Property deleted successfully"}

@router.post("/add-tenant-to-property/{property_id}/{invite_code}", response_model=User)
async def add_tenant_to_property(
    property_id: int,
    invite_code: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):  
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can add tenants to properties")

    # Check if the property exists and belongs to the current landlord
    property_statement = select(RentalProperty).where(
        RentalProperty.id == property_id,
        RentalProperty.landlord_id == current_user.id
    )
    property = session.exec(property_statement).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found or does not belong to you")

    # Find the tenant by invite_code
    tenant_statement = select(User).where(User.invite_code == invite_code, User.role == "tenant")
    tenant = session.exec(tenant_statement).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant with the given invite code not found or invalid role")

    # Check if the tenant is already associated with the property
    tenancy_statement = select(Tenancy).where(
        Tenancy.property_id == property_id,
        Tenancy.tenant_id == tenant.id
    )
    existing_tenancy = session.exec(tenancy_statement).first()
    if existing_tenancy:
        raise HTTPException(status_code=400, detail="Tenant is already associated with this property")

    # Create a new tenancy record
    new_tenancy = Tenancy(
        tenant_id=tenant.id,
        property_id=property_id,
        lease_start=datetime.utcnow()
    )
    session.add(new_tenancy)

    # Create a copy of the tenant object before committing
    added_tenant = tenant.model_dump()  # Convert to a dictionary if using SQLModel

    session.commit()
    session.refresh(new_tenancy)
    
    return added_tenant

@router.delete("/remove-tenant-from-property/{property_id}/{tenant_id}")
async def remove_tenant_from_property(
    property_id: int,
    tenant_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can remove tenants from properties")

    # Check if the property exists and belongs to the current landlord
    property_statement = select(RentalProperty).where(
        RentalProperty.id == property_id,
        RentalProperty.landlord_id == current_user.id
    )
    property = session.exec(property_statement).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found or does not belong to you")

    # Check if the tenant is associated with the property
    tenancy_statement = select(Tenancy).where(
        Tenancy.property_id == property_id,
        Tenancy.tenant_id == tenant_id
    )
    tenancy = session.exec(tenancy_statement).first()
    if not tenancy:
        raise HTTPException(status_code=404, detail="Tenant is not associated with this property")

    # Delete the tenancy record
    session.delete(tenancy)
    session.commit()

    return {"message": "Tenant removed from property successfully"}

@router.delete("/leave-property/{property_id}")
async def leave_property(
    property_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is a tenant
    if current_user.role != "tenant":
        raise HTTPException(status_code=403, detail="Only tenants can leave properties")

    # Check if the tenant is associated with the property
    tenancy_statement = select(Tenancy).where(
        Tenancy.property_id == property_id,
        Tenancy.tenant_id == current_user.id
    )
    tenancy = session.exec(tenancy_statement).first()
    if not tenancy:
        raise HTTPException(status_code=404, detail="You are not associated with this property")

    # Delete the tenancy record
    session.delete(tenancy)
    session.commit()

    return {"message": "You have successfully left the property"}