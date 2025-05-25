from datetime import datetime, date
from sqlmodel import SQLModel, Field
from sqlalchemy import CheckConstraint
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel


# Define the SQLModel for the rental_properties table
class RentalProperty(SQLModel, table=True):
    __tablename__ = "rental_properties"
    id: int = Field(default=None, primary_key=True)
    name: str
    location: str
    landlord_id: int = Field(foreign_key="users.id")
    description: str | None = None

class User(SQLModel, table=True):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('landlord', 'tenant')", name="check_role_valid"),
    )
    id: int = Field(default=None, primary_key=True)
    name: str = Field(max_length=255, nullable=False)
    email: str = Field(max_length=255, unique=True, nullable=False)
    hashed_password: str = Field(nullable=False)
    role: str = Field(nullable=False)
    invite_code: str = Field(max_length=10, unique=True, nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

class Tenancy(SQLModel, table=True):
    __tablename__ = "tenancies"
    id: int = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="users.id")
    property_id: int = Field(foreign_key="rental_properties.id")
    lease_start: datetime = Field(nullable=False)
    lease_end: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

class Responsibility(SQLModel, table=True):
    __tablename__ = "responsibilities"

    id: int = Field(default=None, primary_key=True)
    property_id: int = Field(foreign_key="rental_properties.id", nullable=False)
    title: str = Field(max_length=255, nullable=False)
    description: Optional[str] = None
    due_date: Optional[date] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class Announcement(SQLModel, table=True):
    __tablename__ = "announcements"

    id: int = Field(default=None, primary_key=True)
    property_id: int = Field(foreign_key="rental_properties.id", nullable=False)
    title: str = Field(max_length=255, nullable=False)
    message: str = Field(nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class Transaction(SQLModel, table=True):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("payee_role IN ('tenant', 'landlord')", name="check_payee_role"),
    )

    id: int = Field(default=None, primary_key=True)
    property_id: int = Field(foreign_key="rental_properties.id", nullable=False)
    type: str = Field(max_length=100, nullable=False)
    amount: Decimal = Field(nullable=False)
    due_date: date = Field(nullable=False)
    payee_role: str = Field(nullable=False)
    is_visible_to_tenants: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class TransactionResolution(SQLModel, table=True):
    __tablename__ = "transaction_resolutions"
    __table_args__ = (
        CheckConstraint("status IN ('resolved', 'pending')", name="check_transaction_status"),
    )

    id: int = Field(default=None, primary_key=True)
    transaction_id: int = Field(foreign_key="transactions.id", nullable=False)
    user_id: int = Field(foreign_key="users.id", nullable=False)
    status: str = Field(default="pending", nullable=False)
    resolved_at: Optional[datetime] = None


class TenantRequest(SQLModel, table=True):
    __tablename__ = "tenant_requests"

    id: int = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="users.id", nullable=False)
    property_id: int = Field(foreign_key="rental_properties.id", nullable=False)
    title: str = Field(max_length=255, nullable=False)
    description: str = Field(nullable=False)
    request_date: date = Field(default_factory=date.today, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class RequestResolution(SQLModel, table=True):
    __tablename__ = "request_resolutions"
    __table_args__ = (
        CheckConstraint("status IN ('resolved', 'pending')", name="check_request_status"),
    )

    id: int = Field(default=None, primary_key=True)
    request_id: int = Field(foreign_key="tenant_requests.id", nullable=False)
    user_id: int = Field(foreign_key="users.id", nullable=False)
    status: str = Field(default="pending", nullable=False)
    resolved_at: Optional[datetime] = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    invite_code: str | None
    created_at: datetime

    class Config:
        from_attributes = True