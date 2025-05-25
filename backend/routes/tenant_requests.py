from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from models import TenantRequest, RequestResolution, User
from database import get_session
from auth import get_current_user
from typing import List
from datetime import datetime

router = APIRouter()

@router.get("/tenant-request/{property_id}", response_model=List[TenantRequest])
async def get_tenant_requests(property_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(TenantRequest).where(TenantRequest.property_id == property_id)
    requests = session.exec(statement).all()
    if not requests:
        raise HTTPException(status_code=404, detail="Tenant requests not found")
    return requests

@router.get("/request-resolutions/{request_id}", response_model=List[dict])
async def get_request_resolutions(request_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = (
        select(RequestResolution, User.name, User.role)
        .join(User, RequestResolution.user_id == User.id)
        .where(RequestResolution.request_id == request_id)
    )
    results = session.exec(statement).all()
    if not results:
        raise HTTPException(status_code=404, detail="Request resolutions not found")
    
    # Format the response to include resolution details along with user names and roles
    response = [
        {
            "resolution_id": resolution.id,
            "request_id": resolution.request_id,
            "user_id": resolution.user_id,
            "status": resolution.status,
            "resolved_at": resolution.resolved_at,
            "user_name": name,
            "user_role": role
        }
        for resolution, name, role in results
    ]
    return response

@router.post("/add-tenant-request/{property_id}", response_model=TenantRequest)
async def add_tenant_request(
    property_id: int,
    tenant_request: TenantRequest = Body(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Only tenants can add requests
    if current_user.role != "tenant":
        raise HTTPException(status_code=403, detail="Only tenants can add requests")

    # Create a new tenant request
    new_request = TenantRequest(
        tenant_id=current_user.id,
        property_id=property_id,
        title=tenant_request.title,
        description=tenant_request.description,
        request_date=tenant_request.request_date if tenant_request.request_date else datetime.utcnow().date()
    )
    session.add(new_request)
    session.commit()
    session.refresh(new_request)
    return new_request

@router.put("/update-tenant-request/{request_id}", response_model=TenantRequest)
async def update_tenant_request(
    request_id: int,
    updated_request: TenantRequest = Body(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Only tenants can update their own requests
    if current_user.role != "tenant":
        raise HTTPException(status_code=403, detail="Only tenants can update requests")

    request_statement = select(TenantRequest).where(TenantRequest.id == request_id)
    tenant_request = session.exec(request_statement).first()
    if not tenant_request:
        raise HTTPException(status_code=404, detail="Tenant request not found")
    if tenant_request.tenant_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own requests")

    tenant_request.title = updated_request.title
    tenant_request.description = updated_request.description
    tenant_request.request_date = updated_request.request_date

    session.add(tenant_request)
    session.commit()
    session.refresh(tenant_request)
    return tenant_request

@router.delete("/delete-tenant-request/{request_id}")
async def delete_tenant_request(
    request_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Only tenants can delete their own requests
    if current_user.role != "tenant":
        raise HTTPException(status_code=403, detail="Only tenants can delete requests")

    request_statement = select(TenantRequest).where(TenantRequest.id == request_id)
    tenant_request = session.exec(request_statement).first()
    if not tenant_request:
        raise HTTPException(status_code=404, detail="Tenant request not found")
    if tenant_request.tenant_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own requests")

    # Delete all resolutions associated with the request
    resolution_statement = select(RequestResolution).where(RequestResolution.request_id == request_id)
    resolutions = session.exec(resolution_statement).all()
    for resolution in resolutions:
        session.delete(resolution)

    session.delete(tenant_request)
    session.commit()
    return {"message": "Tenant request and its resolutions deleted successfully"}


@router.post("/add-request-resolution", response_model=dict)
async def add_request_resolution(
    resolution: RequestResolution,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Only tenants can add request resolutions
    if current_user.role != "tenant":
        raise HTTPException(status_code=403, detail="Only tenants can add request resolutions")

    # Ensure the resolution status is valid
    if resolution.status not in ["resolved", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid resolution status")

    # Check if the request exists
    request_statement = select(TenantRequest).where(TenantRequest.id == resolution.request_id)
    tenant_request = session.exec(request_statement).first()
    if not tenant_request:
        raise HTTPException(status_code=404, detail="Tenant request not found")

    # Check if there is already a resolution for this user and request
    resolution_statement = select(RequestResolution).where(
        RequestResolution.request_id == resolution.request_id,
        RequestResolution.user_id == resolution.user_id
    )
    existing_resolution = session.exec(resolution_statement).first()
    if existing_resolution:
        raise HTTPException(status_code=400, detail="Resolution already exists for this request and user")

    # Create a new resolution
    new_resolution = RequestResolution(
        request_id=resolution.request_id,
        user_id=resolution.user_id,
        status=resolution.status,
        resolved_at=datetime.utcnow() if resolution.status == "resolved" else None
    )

    session.add(new_resolution)
    session.commit()
    session.refresh(new_resolution)

    return {"message": "Request resolution added successfully", "resolution_id": new_resolution.id}

@router.delete("/remove-request-resolution/{request_id}/{user_id}")
async def remove_request_resolution(
    request_id: int,
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Only tenants can remove their own request resolutions
    if current_user.role != "tenant":
        raise HTTPException(status_code=403, detail="Only tenants can remove request resolutions")

    # Check if the request resolution exists and belongs to the current user
    resolution_statement = select(RequestResolution).where(
        RequestResolution.request_id == request_id,
        RequestResolution.user_id == user_id
    )
    resolution = session.exec(resolution_statement).first()
    if not resolution:
        raise HTTPException(status_code=404, detail="Request resolution not found")

    # Delete the request resolution
    session.delete(resolution)
    session.commit()

    return {"message": "Request resolution removed successfully"}

@router.put("/resolve-tenant-request/{request_id}")
async def resolve_tenant_request(
    request_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is authenticated
    if not current_user:
        raise HTTPException(status_code=401, detail="User not authenticated")

    # Check if the tenant request exists
    from models import TenantRequest, RequestResolution  # Ensure import if not already
    request_statement = select(TenantRequest).where(TenantRequest.id == request_id)
    tenant_request = session.exec(request_statement).first()
    if not tenant_request:
        raise HTTPException(status_code=404, detail="Tenant request not found")

    # Find the resolution for the current user and request
    resolution_statement = select(RequestResolution).where(
        RequestResolution.request_id == request_id,
        RequestResolution.user_id == current_user.id
    )
    resolution = session.exec(resolution_statement).first()
    if not resolution:
        raise HTTPException(status_code=404, detail="Resolution not found for this request and user")

    # Toggle the resolution status between "pending" and "resolved"
    if resolution.status == "pending":
        resolution.status = "resolved"
        resolution.resolved_at = datetime.now()
        session.add(resolution)
        session.commit()
        session.refresh(resolution)
        return {"message": "Request resolution updated to resolved", "resolution_id": resolution.id}
    else:
        resolution.status = "pending"
        resolution.resolved_at = None
        session.add(resolution)
        session.commit()
        session.refresh(resolution)
        return {"message": "Request resolution updated to pending", "resolution_id": resolution.id}