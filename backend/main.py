from fastapi import FastAPI, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, create_engine, select
from typing import List
from models import RentalProperty, User, Tenancy, Responsibility, Announcement, Transaction, TransactionResolution, TenantRequest, RequestResolution  # Import the models from models.py
from database import get_session, engine  # Import the session dependency from database.py
from fastapi import FastAPI, Depends
from auth import authenticate_user, create_access_token, get_current_user, hash_password, Token, OAuth2PasswordRequestForm
from datetime import datetime


# Create the FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3000/Profile"],  # Allow requests from your frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

try:
    with engine.connect() as connection:
        print("Connection successful!")
except Exception as e:
    print(f"Failed to connect: {e}")

# for password in ["password1", "password2", "password3", "password4", "password5"]:
#     hashed_password = hash_password(password)
#     print(f"Password: {password}, Hashed: {hashed_password}")


# Protect the rental properties endpoint
@app.get("/rental-properties", response_model=List[RentalProperty])
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

@app.get("/property/{property_id}", response_model=RentalProperty)
async def get_property(property_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(RentalProperty).where(RentalProperty.id == property_id)
    property = session.exec(statement).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    return property


@app.get("/get-users", response_model=List[User])
async def get_users(
    session: Session = Depends(get_session)
):
    statement = select(User)
    results = session.exec(statement)
    return results.all()

@app.get("/get-tenants-for-property/{property_id}", response_model=List[User])
async def get_tenants_for_property(property_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = (
    select(User)
    .join(Tenancy, Tenancy.tenant_id == User.id)
    .where(Tenancy.property_id == property_id)
    .where(User.role == "tenant")
    )
    results = session.exec(statement)
    return results.all()



@app.post("/register", response_model=User)
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

    return user

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = authenticate_user(form_data.username, form_data.password, session)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    access_token = create_access_token(data={"email": form_data.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="User not authenticated")
    return current_user

@app.get("/responsibilities/{property_id}", response_model=List[Responsibility])
async def get_responsibilities(property_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Responsibility).where(Responsibility.property_id == property_id)
    responsibilities = session.exec(statement).all()
    if not responsibilities:
        raise HTTPException(status_code=404, detail="Responsibilities not found")
    return responsibilities

@app.get("/announcements/{property_id}", response_model=List[Announcement])
async def get_announcements(property_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Announcement).where(Announcement.property_id == property_id)
    announcements = session.exec(statement).all()
    if not announcements:
        raise HTTPException(status_code=404, detail="Announcements not found")
    return announcements

@app.get("/transactions/{property_id}", response_model=List[Transaction])
async def get_transactions(property_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="User not authenticated")
    if current_user.role == "tenant":
        statement = (
            select(Transaction)
            .where(Transaction.property_id == property_id)
            .where(Transaction.is_visible_to_tenants == True)
        )    
    else:
        statement = select(Transaction).where(Transaction.property_id == property_id)
    transactions = session.exec(statement).all()
    if not transactions:
        raise HTTPException(status_code=404, detail="Transactions not found")
    return transactions

@app.get("/all-resolved-transactions", response_model=List[Transaction])
async def get_all_transactions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can view all transactions for their properties")

    # Get all properties owned by the landlord
    property_statement = select(RentalProperty.id).where(RentalProperty.landlord_id == current_user.id)
    property_ids = session.exec(property_statement).all()
    if not property_ids:
        return []

    # Get all transactions for these properties
    transaction_statement = select(Transaction).where(Transaction.property_id.in_(property_ids))
    transactions = session.exec(transaction_statement).all()

    # Filter transactions: only those where all resolutions are "resolved"
    resolved_transactions = []
    for transaction in transactions:
        resolutions = session.exec(
            select(TransactionResolution.status).where(TransactionResolution.transaction_id == transaction.id)
        ).all()
        if resolutions and all(status == "resolved" for status in resolutions):
            resolved_transactions.append(transaction)
        # If there are no resolutions, do not include the transaction

    return resolved_transactions

@app.post("/add-transaction/{property_id}", response_model=Transaction)
async def create_transaction(
    property_id: int,
    transaction: Transaction,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can create transactions for properties")

    # Check if the property exists and belongs to the current landlord
    property_statement = select(RentalProperty).where(
        RentalProperty.id == property_id,
        RentalProperty.landlord_id == current_user.id
    )
    property = session.exec(property_statement).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found or does not belong to you")

    # Create a new transaction
    new_transaction = Transaction(
        property_id=property_id,
        type=transaction.type,
        amount=transaction.amount,
        due_date=transaction.due_date,
        payee_role=transaction.payee_role,
        is_visible_to_tenants=transaction.is_visible_to_tenants
    )

    session.add(new_transaction)
    session.commit()
    session.refresh(new_transaction)

    return new_transaction

@app.put("/update-transaction/{transaction_id}", response_model=Transaction)
async def update_transaction(
    transaction_id: int,
    updated_transaction: Transaction,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can update transactions")

    # Fetch the transaction to be updated
    transaction_statement = select(Transaction).where(Transaction.id == transaction_id)
    transaction = session.exec(transaction_statement).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Check if the property belongs to the current landlord
    property_statement = select(RentalProperty).where(
        RentalProperty.id == transaction.property_id,
        RentalProperty.landlord_id == current_user.id
    )
    property = session.exec(property_statement).first()
    if not property:
        raise HTTPException(status_code=403, detail="You do not have permission to update this transaction")

    # Update transaction fields
    transaction.type = updated_transaction.type
    transaction.amount = updated_transaction.amount
    transaction.due_date = updated_transaction.due_date
    transaction.payee_role = updated_transaction.payee_role
    transaction.is_visible_to_tenants = updated_transaction.is_visible_to_tenants

    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    return transaction



@app.get("/transaction-resolutions/{transaction_id}", response_model=List[dict])
async def get_transaction_resolutions(transaction_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(TransactionResolution, User.name, User.role).join(User, TransactionResolution.user_id == User.id).where(TransactionResolution.transaction_id == transaction_id)
    results = session.exec(statement).all()
    if not results:
        raise HTTPException(status_code=404, detail="Transaction resolutions not found")
    
    # Format the response to include resolution details along with user names and roles
    response = [
        {
            "resolution_id": resolution.id,
            "transaction_id": resolution.transaction_id,
            "user_id": resolution.user_id,
            "status": resolution.status,
            "resolved_at": resolution.resolved_at,
            "user_name": name,
            "user_role": role
        }
        for resolution, name, role in results
    ]
    return response

@app.post("/add-transaction-resolution", response_model=dict)
async def add_transaction_resolution(
    resolution: TransactionResolution,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can add transaction resolutions")

    # Ensure the resolution status is valid
    if resolution.status not in ["resolved", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid resolution status")

    # Check if the transaction exists
    transaction_statement = select(Transaction).where(Transaction.id == resolution.transaction_id)
    transaction = session.exec(transaction_statement).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Check if the specified user exists
    user_statement = select(User).where(User.id == resolution.user_id)
    user = session.exec(user_statement).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if there is already a resolution for this user and transaction
    resolution_statement = select(TransactionResolution).where(
        TransactionResolution.transaction_id == resolution.transaction_id,
        TransactionResolution.user_id == resolution.user_id
    )
    existing_resolution = session.exec(resolution_statement).first()
    if existing_resolution:
        raise HTTPException(status_code=400, detail="Resolution already exists for this transaction and user")

    # Create a new resolution
    new_resolution = TransactionResolution(
        transaction_id=resolution.transaction_id,
        user_id=resolution.user_id,
        status=resolution.status,
        resolved_at=datetime.utcnow() if resolution.status == "resolved" else None
    )

    session.add(new_resolution)
    session.commit()
    session.refresh(new_resolution)

    return {"message": "Transaction resolution added successfully", "resolution_id": new_resolution.id}



@app.delete("/remove-transaction-resolution/{transaction_id}/{user_id}")
async def remove_transaction_resolution(
    transaction_id: int,
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can remove transaction resolutions")

    # Check if the transaction resolution exists
    resolution_statement = select(TransactionResolution).where(
        TransactionResolution.transaction_id == transaction_id,
        TransactionResolution.user_id == user_id
    )
    resolution = session.exec(resolution_statement).first()
    if not resolution:
        raise HTTPException(status_code=404, detail="Transaction resolution not found")

    # Delete the transaction resolution
    session.delete(resolution)
    session.commit()

    return {"message": "Transaction resolution removed successfully"}

@app.delete("/delete-transaction/{transaction_id}")
async def delete_transaction(
    transaction_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is a landlord
    if current_user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can delete transactions")

    # Fetch the transaction to be deleted
    transaction_statement = select(Transaction).where(Transaction.id == transaction_id)
    transaction = session.exec(transaction_statement).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Check if the property belongs to the current landlord
    property_statement = select(RentalProperty).where(
        RentalProperty.id == transaction.property_id,
        RentalProperty.landlord_id == current_user.id
    )
    property = session.exec(property_statement).first()
    if not property:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this transaction")

    # Delete all resolutions associated with the transaction
    resolution_statement = select(TransactionResolution).where(TransactionResolution.transaction_id == transaction_id)
    resolutions = session.exec(resolution_statement).all()
    for resolution in resolutions:
        session.delete(resolution)

    # Delete the transaction
    session.delete(transaction)
    session.commit()

    return {"message": "Transaction and its resolutions deleted successfully"}


@app.get("/request-resolutions/{request_id}", response_model=List[dict])
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

@app.post("/add-tenant-to-property/{property_id}/{tenant_email}", response_model=User)
async def add_tenant_to_property(
    property_id: int,
    tenant_email: str,
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

    # Find the tenant by email
    tenant_statement = select(User).where(User.email == tenant_email, User.role == "tenant")
    tenant = session.exec(tenant_statement).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant with the given email not found")

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



@app.delete("/remove-tenant-from-property/{property_id}/{tenant_id}")
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

@app.post("/add-announcement/{property_id}", response_model=Announcement)
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

@app.put("/update-announcement/{announcement_id}", response_model=Announcement)
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

@app.delete("/delete-announcement/{announcement_id}")
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

@app.post("/add-property", response_model=RentalProperty)
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

@app.delete("/delete-property/{property_id}")
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

@app.post("/add-responsibility/{property_id}", response_model=Responsibility)
async def add_responsibility(
    property_id: int,
    responsibility: Responsibility,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
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

@app.put("/update-responsibility/{responsibility_id}", response_model=Responsibility)
async def update_responsibility(
    responsibility_id: int,
    updated_responsibility: Responsibility,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
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

@app.delete("/delete-responsibility/{responsibility_id}")
async def delete_responsibility(
    responsibility_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
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

@app.put("/resolve-transaction/{transaction_id}")
async def resolve_transaction(
    transaction_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure the current user is authenticated
    if not current_user:
        raise HTTPException(status_code=401, detail="User not authenticated")

    # Check if the transaction exists
    transaction_statement = select(Transaction).where(Transaction.id == transaction_id)
    transaction = session.exec(transaction_statement).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Find the resolution for the current user and transaction
    resolution_statement = select(TransactionResolution).where(
        TransactionResolution.transaction_id == transaction_id,
        TransactionResolution.user_id == current_user.id
    )
    resolution = session.exec(resolution_statement).first()
    if not resolution:
        raise HTTPException(status_code=404, detail="Resolution not found for this transaction and user")

    # Toggle the resolution status between "pending" and "resolved"
    if resolution.status == "pending":
        resolution.status = "resolved"
        resolution.resolved_at = datetime.now()
        session.add(resolution)
        session.commit()
        session.refresh(resolution)
        return {"message": "Transaction resolution updated to resolved", "resolution_id": resolution.id}
    else:
        resolution.status = "pending"
        resolution.resolved_at = None
        session.add(resolution)
        session.commit()
        session.refresh(resolution)
        return {"message": "Transaction resolution updated to pending", "resolution_id": resolution.id}

@app.put("/resolve-tenant-request/{request_id}")
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


@app.get("/tenant-request/{property_id}", response_model=List[TenantRequest])
async def get_tenant_requests(property_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(TenantRequest).where(TenantRequest.property_id == property_id)
    requests = session.exec(statement).all()
    if not requests:
        raise HTTPException(status_code=404, detail="Tenant requests not found")
    return requests

@app.post("/add-tenant-request/{property_id}", response_model=TenantRequest)
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

@app.put("/update-tenant-request/{request_id}", response_model=TenantRequest)
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

@app.delete("/delete-tenant-request/{request_id}")
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


@app.post("/add-request-resolution", response_model=dict)
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

@app.delete("/remove-request-resolution/{request_id}/{user_id}")
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

