from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from models import Transaction, TransactionResolution, User, RentalProperty
from database import get_session
from auth import get_current_user
from typing import List
from datetime import datetime

router = APIRouter()

@router.get("/transactions/{property_id}", response_model=List[Transaction])
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

@router.get("/all-resolved-transactions", response_model=List[Transaction])
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

@router.get("/transaction-resolutions/{transaction_id}", response_model=List[dict])
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

@router.post("/add-transaction/{property_id}", response_model=Transaction)
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

@router.put("/update-transaction/{transaction_id}", response_model=Transaction)
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

@router.delete("/delete-transaction/{transaction_id}")
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

@router.post("/add-transaction-resolution", response_model=dict)
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

@router.delete("/remove-transaction-resolution/{transaction_id}/{user_id}")
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

@router.put("/resolve-transaction/{transaction_id}")
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