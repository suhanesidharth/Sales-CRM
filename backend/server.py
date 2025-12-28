from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'flux-crm-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
AVG_SCAN_SIZE_MB = 15  # Average scan size in MB

app = FastAPI(title="Flux CRM API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== COUNTRIES AND REGIONS ====================
COUNTRIES_DATA = {
    "India": {
        "regions": [
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
            "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
            "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
            "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
            "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
            "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh"
        ],
        "currency": "INR",
        "currency_symbol": "₹"
    },
    "United States": {
        "regions": [
            "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
            "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
            "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
            "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
            "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
            "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
            "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
            "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
            "West Virginia", "Wisconsin", "Wyoming"
        ],
        "currency": "USD",
        "currency_symbol": "$"
    },
    "United Kingdom": {
        "regions": [
            "England", "Scotland", "Wales", "Northern Ireland",
            "Greater London", "South East", "South West", "East of England",
            "West Midlands", "East Midlands", "Yorkshire", "North West", "North East"
        ],
        "currency": "GBP",
        "currency_symbol": "£"
    },
    "Germany": {
        "regions": [
            "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen",
            "Hamburg", "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern",
            "North Rhine-Westphalia", "Rhineland-Palatinate", "Saarland",
            "Saxony", "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia"
        ],
        "currency": "EUR",
        "currency_symbol": "€"
    },
    "Australia": {
        "regions": [
            "New South Wales", "Victoria", "Queensland", "Western Australia",
            "South Australia", "Tasmania", "Northern Territory", "Australian Capital Territory"
        ],
        "currency": "AUD",
        "currency_symbol": "A$"
    },
    "Canada": {
        "regions": [
            "Ontario", "Quebec", "British Columbia", "Alberta", "Manitoba",
            "Saskatchewan", "Nova Scotia", "New Brunswick", "Newfoundland and Labrador",
            "Prince Edward Island", "Northwest Territories", "Yukon", "Nunavut"
        ],
        "currency": "CAD",
        "currency_symbol": "C$"
    },
    "UAE": {
        "regions": [
            "Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain",
            "Ras Al Khaimah", "Fujairah"
        ],
        "currency": "AED",
        "currency_symbol": "د.إ"
    },
    "Singapore": {
        "regions": ["Central", "North", "North-East", "East", "West"],
        "currency": "SGD",
        "currency_symbol": "S$"
    },
    "Japan": {
        "regions": [
            "Hokkaido", "Tohoku", "Kanto", "Chubu", "Kinki",
            "Chugoku", "Shikoku", "Kyushu", "Okinawa"
        ],
        "currency": "JPY",
        "currency_symbol": "¥"
    },
    "Brazil": {
        "regions": [
            "São Paulo", "Rio de Janeiro", "Minas Gerais", "Bahia", "Paraná",
            "Rio Grande do Sul", "Pernambuco", "Ceará", "Pará", "Santa Catarina"
        ],
        "currency": "BRL",
        "currency_symbol": "R$"
    }
}

# For backward compatibility
INDIAN_STATES = COUNTRIES_DATA["India"]["regions"]

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str = "user"
    is_active: bool = True
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TeamMemberInvite(BaseModel):
    email: str
    name: str
    password: str
    role: str = "user"  # user, manager, viewer

class TeamMemberUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None

# Organization Type Models
class OrgTypeCreate(BaseModel):
    name: str
    color: str = "bg-slate-500/20 text-slate-400 border-slate-500/30"

class OrgTypeResponse(BaseModel):
    id: str
    name: str
    color: str
    is_default: bool = False

# Lead Stage Models (Custom Stages)
class LeadStageCreate(BaseModel):
    name: str
    order: int
    color: str = "bg-slate-500/20 text-slate-400 border-slate-500/30"

class LeadStageResponse(BaseModel):
    id: str
    name: str
    order: int
    color: str
    is_default: bool = False

# Organization Models
class OrganizationCreate(BaseModel):
    name: str
    type: str
    state: str
    city: str

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None

class OrganizationResponse(BaseModel):
    id: str
    name: str
    type: str
    state: str
    city: str
    created_at: str
    lead_count: int = 0

# Lead Models
class LeadCreate(BaseModel):
    lead_name: str
    organization_id: str
    product: str
    offered_price: Optional[float] = None
    agreed_price: Optional[float] = None
    expected_volume: Optional[int] = None  # scans per month
    stage: str = "IDENTIFIED"
    probability: int = 10
    status: str = "OPEN"
    expected_close_date: Optional[str] = None
    sales_owner: str
    source: Optional[str] = None
    remarks: Optional[str] = None

class LeadUpdate(BaseModel):
    lead_name: Optional[str] = None
    product: Optional[str] = None
    offered_price: Optional[float] = None
    agreed_price: Optional[float] = None
    expected_volume: Optional[int] = None
    stage: Optional[str] = None
    probability: Optional[int] = None
    status: Optional[str] = None
    expected_close_date: Optional[str] = None
    sales_owner: Optional[str] = None
    source: Optional[str] = None
    remarks: Optional[str] = None

class LeadResponse(BaseModel):
    id: str
    lead_code: str
    lead_name: str
    organization_id: str
    organization_name: Optional[str] = None
    organization_type: Optional[str] = None
    product: str
    offered_price: Optional[float] = None
    agreed_price: Optional[float] = None
    expected_volume: Optional[int] = None
    monthly_revenue: Optional[float] = None
    annual_revenue: Optional[float] = None
    daily_data_load_gb: Optional[float] = None
    monthly_data_load_gb: Optional[float] = None
    stage: str
    probability: int
    status: str
    expected_close_date: Optional[str] = None
    sales_owner: str
    source: Optional[str] = None
    remarks: Optional[str] = None
    created_at: str

# Lead Note Models
class LeadNoteCreate(BaseModel):
    lead_id: str
    content: str
    update_type: str = "GENERAL"

class LeadNoteResponse(BaseModel):
    id: str
    lead_id: str
    content: str
    update_type: str
    created_by: str
    created_at: str

# Milestone Models
class MilestoneCreate(BaseModel):
    lead_id: str
    name: str
    start_date: str
    end_date: str
    status: str = "PENDING"

class MilestoneUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None

class MilestoneResponse(BaseModel):
    id: str
    lead_id: str
    name: str
    start_date: str
    end_date: str
    status: str

# Document Models
class DocumentCreate(BaseModel):
    lead_id: str
    type: str
    custom_name: Optional[str] = None
    shared_at: Optional[str] = None
    signed_at: Optional[str] = None
    status: str = "DRAFT"

class DocumentUpdate(BaseModel):
    type: Optional[str] = None
    custom_name: Optional[str] = None
    shared_at: Optional[str] = None
    signed_at: Optional[str] = None
    status: Optional[str] = None

class DocumentResponse(BaseModel):
    id: str
    lead_id: str
    type: str
    custom_name: Optional[str] = None
    shared_at: Optional[str] = None
    signed_at: Optional[str] = None
    status: str

# Sales Flow Models
class SalesFlowCreate(BaseModel):
    player_type: str
    step_number: int
    description: str
    owner: str
    output: str

class SalesFlowUpdate(BaseModel):
    step_number: Optional[int] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    output: Optional[str] = None

class SalesFlowResponse(BaseModel):
    id: str
    player_type: str
    step_number: int
    description: str
    owner: str
    output: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if not user.get("is_active", True):
            raise HTTPException(status_code=403, detail="Account deactivated")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== REVENUE & DATA CALCULATION ====================

def calculate_revenue_and_load(price: float, volume: int):
    """Calculate monthly/annual revenue and data load"""
    monthly_revenue = price * volume if price and volume else 0
    annual_revenue = monthly_revenue * 12
    daily_scans = volume / 30 if volume else 0
    daily_data_load_gb = (daily_scans * AVG_SCAN_SIZE_MB) / 1024
    monthly_data_load_gb = (volume * AVG_SCAN_SIZE_MB) / 1024 if volume else 0
    return {
        "monthly_revenue": round(monthly_revenue, 2),
        "annual_revenue": round(annual_revenue, 2),
        "daily_data_load_gb": round(daily_data_load_gb, 2),
        "monthly_data_load_gb": round(monthly_data_load_gb, 2)
    }

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # First user becomes admin
    user_count = await db.users.count_documents({})
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "role": "admin" if user_count == 0 else "user",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, email=user.email, name=user.name, role=user_doc["role"], is_active=True, created_at=user_doc["created_at"])
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not db_user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account deactivated")
    
    token = create_token(db_user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=db_user["id"], email=db_user["email"], name=db_user["name"],
            role=db_user.get("role", "user"), is_active=db_user.get("is_active", True),
            created_at=db_user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"], email=user["email"], name=user["name"],
        role=user.get("role", "user"), is_active=user.get("is_active", True),
        created_at=user["created_at"]
    )

# ==================== TEAM MANAGEMENT ROUTES ====================

@api_router.get("/team", response_model=List[UserResponse])
async def get_team_members(user: dict = Depends(require_admin)):
    members = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(
        id=m["id"], email=m["email"], name=m["name"],
        role=m.get("role", "user"), is_active=m.get("is_active", True),
        created_at=m["created_at"]
    ) for m in members]

@api_router.post("/team/invite", response_model=UserResponse)
async def invite_team_member(member: TeamMemberInvite, user: dict = Depends(require_admin)):
    existing = await db.users.find_one({"email": member.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    member_id = str(uuid.uuid4())
    member_doc = {
        "id": member_id,
        "email": member.email,
        "password": hash_password(member.password),
        "name": member.name,
        "role": member.role,
        "is_active": True,
        "invited_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(member_doc)
    return UserResponse(
        id=member_id, email=member.email, name=member.name,
        role=member.role, is_active=True, created_at=member_doc["created_at"]
    )

@api_router.put("/team/{member_id}", response_model=UserResponse)
async def update_team_member(member_id: str, update: TeamMemberUpdate, user: dict = Depends(require_admin)):
    if member_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot modify your own account")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data")
    
    result = await db.users.update_one({"id": member_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    updated = await db.users.find_one({"id": member_id}, {"_id": 0, "password": 0})
    return UserResponse(
        id=updated["id"], email=updated["email"], name=updated["name"],
        role=updated.get("role", "user"), is_active=updated.get("is_active", True),
        created_at=updated["created_at"]
    )

@api_router.delete("/team/{member_id}")
async def remove_team_member(member_id: str, user: dict = Depends(require_admin)):
    if member_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": member_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member removed"}

# ==================== ORG TYPES & LEAD STAGES ====================

DEFAULT_ORG_TYPES = [
    {"id": "default-hospital", "name": "HOSPITAL", "color": "bg-blue-500/20 text-blue-400 border-blue-500/30", "is_default": True},
    {"id": "default-ngo", "name": "NGO", "color": "bg-green-500/20 text-green-400 border-green-500/30", "is_default": True},
    {"id": "default-govt", "name": "GOVT", "color": "bg-amber-500/20 text-amber-400 border-amber-500/30", "is_default": True},
    {"id": "default-corporate", "name": "CORPORATE", "color": "bg-purple-500/20 text-purple-400 border-purple-500/30", "is_default": True},
]

DEFAULT_LEAD_STAGES = [
    {"id": "stage-identified", "name": "IDENTIFIED", "order": 1, "color": "bg-slate-500/20 text-slate-400 border-slate-500/30", "is_default": True},
    {"id": "stage-qualified", "name": "QUALIFIED", "order": 2, "color": "bg-blue-500/20 text-blue-400 border-blue-500/30", "is_default": True},
    {"id": "stage-demo", "name": "DEMO", "order": 3, "color": "bg-purple-500/20 text-purple-400 border-purple-500/30", "is_default": True},
    {"id": "stage-pilot", "name": "PILOT", "order": 4, "color": "bg-amber-500/20 text-amber-400 border-amber-500/30", "is_default": True},
    {"id": "stage-commercial", "name": "COMMERCIAL", "order": 5, "color": "bg-teal-500/20 text-teal-400 border-teal-500/30", "is_default": True},
    {"id": "stage-closed", "name": "CLOSED", "order": 6, "color": "bg-green-500/20 text-green-400 border-green-500/30", "is_default": True},
]

@api_router.get("/org-types", response_model=List[OrgTypeResponse])
async def get_org_types(user: dict = Depends(get_current_user)):
    custom_types = await db.org_types.find({}, {"_id": 0}).to_list(1000)
    all_types = DEFAULT_ORG_TYPES + [{"is_default": False, **t} for t in custom_types]
    return [OrgTypeResponse(**t) for t in all_types]

@api_router.post("/org-types", response_model=OrgTypeResponse)
async def create_org_type(org_type: OrgTypeCreate, user: dict = Depends(get_current_user)):
    existing = await db.org_types.find_one({"name": org_type.name.upper()})
    if existing or any(t["name"] == org_type.name.upper() for t in DEFAULT_ORG_TYPES):
        raise HTTPException(status_code=400, detail="Type already exists")
    
    type_id = str(uuid.uuid4())
    type_doc = {"id": type_id, "name": org_type.name.upper(), "color": org_type.color}
    await db.org_types.insert_one(type_doc)
    return OrgTypeResponse(**type_doc, is_default=False)

@api_router.delete("/org-types/{type_id}")
async def delete_org_type(type_id: str, user: dict = Depends(get_current_user)):
    if type_id.startswith("default-"):
        raise HTTPException(status_code=400, detail="Cannot delete default type")
    result = await db.org_types.delete_one({"id": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Type not found")
    return {"message": "Type deleted"}

@api_router.get("/lead-stages", response_model=List[LeadStageResponse])
async def get_lead_stages(user: dict = Depends(get_current_user)):
    custom_stages = await db.lead_stages.find({}, {"_id": 0}).to_list(1000)
    all_stages = DEFAULT_LEAD_STAGES + [{"is_default": False, **s} for s in custom_stages]
    return sorted([LeadStageResponse(**s) for s in all_stages], key=lambda x: x.order)

@api_router.post("/lead-stages", response_model=LeadStageResponse)
async def create_lead_stage(stage: LeadStageCreate, user: dict = Depends(get_current_user)):
    existing = await db.lead_stages.find_one({"name": stage.name.upper()})
    if existing or any(s["name"] == stage.name.upper() for s in DEFAULT_LEAD_STAGES):
        raise HTTPException(status_code=400, detail="Stage already exists")
    
    stage_id = str(uuid.uuid4())
    stage_doc = {"id": stage_id, "name": stage.name.upper(), "order": stage.order, "color": stage.color}
    await db.lead_stages.insert_one(stage_doc)
    return LeadStageResponse(**stage_doc, is_default=False)

@api_router.delete("/lead-stages/{stage_id}")
async def delete_lead_stage(stage_id: str, user: dict = Depends(get_current_user)):
    if stage_id.startswith("stage-"):
        raise HTTPException(status_code=400, detail="Cannot delete default stage")
    result = await db.lead_stages.delete_one({"id": stage_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stage not found")
    return {"message": "Stage deleted"}

# ==================== INDIAN STATES ====================

@api_router.get("/indian-states")
async def get_indian_states(user: dict = Depends(get_current_user)):
    return {"states": INDIAN_STATES}

# ==================== ORGANIZATION ROUTES ====================

@api_router.post("/organizations", response_model=OrganizationResponse)
async def create_organization(org: OrganizationCreate, user: dict = Depends(get_current_user)):
    org_id = str(uuid.uuid4())
    org_doc = {
        "id": org_id, "name": org.name, "type": org.type,
        "state": org.state, "city": org.city,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.organizations.insert_one(org_doc)
    return OrganizationResponse(**org_doc, lead_count=0)

@api_router.get("/organizations", response_model=List[OrganizationResponse])
async def get_organizations(type: Optional[str] = None, state: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if type and type != "all":
        query["type"] = type
    if state and state != "all":
        query["state"] = state
    
    orgs = await db.organizations.find(query, {"_id": 0}).to_list(1000)
    for org in orgs:
        org["lead_count"] = await db.leads.count_documents({"organization_id": org["id"]})
    return [OrganizationResponse(**org) for org in orgs]

@api_router.get("/organizations/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: str, user: dict = Depends(get_current_user)):
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org["lead_count"] = await db.leads.count_documents({"organization_id": org_id})
    return OrganizationResponse(**org)

@api_router.put("/organizations/{org_id}", response_model=OrganizationResponse)
async def update_organization(org_id: str, org: OrganizationUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in org.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data")
    
    result = await db.organizations.update_one({"id": org_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    updated = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    updated["lead_count"] = await db.leads.count_documents({"organization_id": org_id})
    return OrganizationResponse(**updated)

@api_router.delete("/organizations/{org_id}")
async def delete_organization(org_id: str, user: dict = Depends(get_current_user)):
    result = await db.organizations.delete_one({"id": org_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
    return {"message": "Organization deleted"}

# ==================== LEAD ROUTES ====================

def generate_lead_code():
    return f"LEAD-{str(uuid.uuid4())[:8].upper()}"

def enrich_lead_response(lead: dict, org: dict = None) -> dict:
    """Add computed fields to lead response"""
    price = lead.get("agreed_price") or lead.get("offered_price") or 0
    volume = lead.get("expected_volume") or 0
    computed = calculate_revenue_and_load(price, volume)
    
    return {
        **lead,
        "organization_name": org["name"] if org else None,
        "organization_type": org["type"] if org else None,
        **computed
    }

@api_router.post("/leads", response_model=LeadResponse)
async def create_lead(lead: LeadCreate, user: dict = Depends(get_current_user)):
    org = await db.organizations.find_one({"id": lead.organization_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    lead_id = str(uuid.uuid4())
    lead_doc = {
        "id": lead_id, "lead_code": generate_lead_code(),
        "lead_name": lead.lead_name, "organization_id": lead.organization_id,
        "product": lead.product, "offered_price": lead.offered_price,
        "agreed_price": lead.agreed_price, "expected_volume": lead.expected_volume,
        "stage": lead.stage, "probability": lead.probability, "status": lead.status,
        "expected_close_date": lead.expected_close_date, "sales_owner": lead.sales_owner,
        "source": lead.source, "remarks": lead.remarks,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.leads.insert_one(lead_doc)
    return LeadResponse(**enrich_lead_response(lead_doc, org))

@api_router.get("/leads", response_model=List[LeadResponse])
async def get_leads(stage: Optional[str] = None, status: Optional[str] = None, organization_id: Optional[str] = None, sales_owner: Optional[str] = None, state: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if stage:
        query["stage"] = stage
    if status:
        query["status"] = status
    if organization_id:
        query["organization_id"] = organization_id
    if sales_owner:
        query["sales_owner"] = sales_owner
    
    # Filter by state (through organization)
    if state and state != "all":
        orgs_in_state = await db.organizations.find({"state": state}, {"id": 1, "_id": 0}).to_list(1000)
        org_ids = [o["id"] for o in orgs_in_state]
        query["organization_id"] = {"$in": org_ids}
    
    leads = await db.leads.find(query, {"_id": 0}).to_list(1000)
    
    result = []
    for lead in leads:
        org = await db.organizations.find_one({"id": lead["organization_id"]}, {"_id": 0})
        result.append(LeadResponse(**enrich_lead_response(lead, org)))
    return result

@api_router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    org = await db.organizations.find_one({"id": lead["organization_id"]}, {"_id": 0})
    return LeadResponse(**enrich_lead_response(lead, org))

@api_router.put("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, lead: LeadUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in lead.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data")
    
    result = await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    org = await db.organizations.find_one({"id": updated["organization_id"]}, {"_id": 0})
    return LeadResponse(**enrich_lead_response(updated, org))

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user: dict = Depends(get_current_user)):
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.milestones.delete_many({"lead_id": lead_id})
    await db.documents.delete_many({"lead_id": lead_id})
    await db.lead_notes.delete_many({"lead_id": lead_id})
    return {"message": "Lead deleted"}

# ==================== LEAD NOTES ROUTES ====================

@api_router.post("/lead-notes", response_model=LeadNoteResponse)
async def create_lead_note(note: LeadNoteCreate, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": note.lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    note_id = str(uuid.uuid4())
    note_doc = {
        "id": note_id, "lead_id": note.lead_id, "content": note.content,
        "update_type": note.update_type, "created_by": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.lead_notes.insert_one(note_doc)
    return LeadNoteResponse(**note_doc)

@api_router.get("/lead-notes", response_model=List[LeadNoteResponse])
async def get_lead_notes(lead_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"lead_id": lead_id} if lead_id else {}
    notes = await db.lead_notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [LeadNoteResponse(**n) for n in notes]

@api_router.delete("/lead-notes/{note_id}")
async def delete_lead_note(note_id: str, user: dict = Depends(get_current_user)):
    result = await db.lead_notes.delete_one({"id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}

# ==================== MILESTONE ROUTES ====================

@api_router.post("/milestones", response_model=MilestoneResponse)
async def create_milestone(milestone: MilestoneCreate, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": milestone.lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    milestone_id = str(uuid.uuid4())
    milestone_doc = {
        "id": milestone_id, "lead_id": milestone.lead_id, "name": milestone.name,
        "start_date": milestone.start_date, "end_date": milestone.end_date, "status": milestone.status
    }
    await db.milestones.insert_one(milestone_doc)
    return MilestoneResponse(**milestone_doc)

@api_router.get("/milestones", response_model=List[MilestoneResponse])
async def get_milestones(lead_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"lead_id": lead_id} if lead_id else {}
    milestones = await db.milestones.find(query, {"_id": 0}).to_list(1000)
    return [MilestoneResponse(**m) for m in milestones]

@api_router.put("/milestones/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(milestone_id: str, milestone: MilestoneUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in milestone.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data")
    
    result = await db.milestones.update_one({"id": milestone_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    updated = await db.milestones.find_one({"id": milestone_id}, {"_id": 0})
    return MilestoneResponse(**updated)

@api_router.delete("/milestones/{milestone_id}")
async def delete_milestone(milestone_id: str, user: dict = Depends(get_current_user)):
    result = await db.milestones.delete_one({"id": milestone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return {"message": "Milestone deleted"}

# ==================== DOCUMENT ROUTES ====================

@api_router.post("/documents", response_model=DocumentResponse)
async def create_document(doc: DocumentCreate, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": doc.lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    doc_id = str(uuid.uuid4())
    doc_data = {
        "id": doc_id, "lead_id": doc.lead_id, "type": doc.type,
        "custom_name": doc.custom_name, "shared_at": doc.shared_at,
        "signed_at": doc.signed_at, "status": doc.status
    }
    await db.documents.insert_one(doc_data)
    return DocumentResponse(**doc_data)

@api_router.get("/documents", response_model=List[DocumentResponse])
async def get_documents(lead_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"lead_id": lead_id} if lead_id else {}
    docs = await db.documents.find(query, {"_id": 0}).to_list(1000)
    return [DocumentResponse(**d) for d in docs]

@api_router.put("/documents/{doc_id}", response_model=DocumentResponse)
async def update_document(doc_id: str, doc: DocumentUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in doc.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data")
    
    result = await db.documents.update_one({"id": doc_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    updated = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    return DocumentResponse(**updated)

@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    result = await db.documents.delete_one({"id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted"}

# ==================== SALES FLOW ROUTES ====================

@api_router.post("/sales-flow", response_model=SalesFlowResponse)
async def create_sales_flow(flow: SalesFlowCreate, user: dict = Depends(get_current_user)):
    flow_id = str(uuid.uuid4())
    flow_doc = {
        "id": flow_id, "player_type": flow.player_type, "step_number": flow.step_number,
        "description": flow.description, "owner": flow.owner, "output": flow.output
    }
    await db.sales_flow.insert_one(flow_doc)
    return SalesFlowResponse(**flow_doc)

@api_router.get("/sales-flow", response_model=List[SalesFlowResponse])
async def get_sales_flow(player_type: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"player_type": player_type} if player_type else {}
    flows = await db.sales_flow.find(query, {"_id": 0}).sort("step_number", 1).to_list(1000)
    return [SalesFlowResponse(**f) for f in flows]

@api_router.put("/sales-flow/{flow_id}", response_model=SalesFlowResponse)
async def update_sales_flow(flow_id: str, flow: SalesFlowUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in flow.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data")
    
    result = await db.sales_flow.update_one({"id": flow_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sales flow not found")
    
    updated = await db.sales_flow.find_one({"id": flow_id}, {"_id": 0})
    return SalesFlowResponse(**updated)

@api_router.delete("/sales-flow/{flow_id}")
async def delete_sales_flow(flow_id: str, user: dict = Depends(get_current_user)):
    result = await db.sales_flow.delete_one({"id": flow_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sales flow not found")
    return {"message": "Sales flow deleted"}

# ==================== ANALYTICS / GEOGRAPHY ROUTES ====================

@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(user: dict = Depends(get_current_user)):
    total_leads = await db.leads.count_documents({})
    total_orgs = await db.organizations.count_documents({})
    
    # Leads by stage
    all_stages = await get_lead_stages(user)
    stage_names = [s.name for s in all_stages]
    leads_by_stage = {}
    for stage in stage_names:
        leads_by_stage[stage] = await db.leads.count_documents({"stage": stage})
    
    # Leads by status
    leads_by_status = {s: await db.leads.count_documents({"status": s}) for s in ["OPEN", "WON", "LOST"]}
    
    # Leads by org type
    all_org_types = await db.organizations.distinct("type")
    leads_by_org_type = {}
    for org_type in all_org_types:
        orgs = await db.organizations.find({"type": org_type}, {"id": 1, "_id": 0}).to_list(1000)
        org_ids = [o["id"] for o in orgs]
        leads_by_org_type[org_type] = await db.leads.count_documents({"organization_id": {"$in": org_ids}}) if org_ids else 0
    
    # Pipeline value (offered_price for open leads)
    pipeline = db.leads.aggregate([
        {"$match": {"status": "OPEN", "offered_price": {"$ne": None}}},
        {"$group": {"_id": None, "total": {"$sum": "$offered_price"}}}
    ])
    pipeline_result = await pipeline.to_list(1)
    pipeline_value = pipeline_result[0]["total"] if pipeline_result else 0
    
    # Revenue calculations
    revenue_pipeline = db.leads.aggregate([
        {"$match": {"status": "WON"}},
        {"$group": {
            "_id": None,
            "won_offered": {"$sum": {"$ifNull": ["$offered_price", 0]}},
            "won_agreed": {"$sum": {"$ifNull": ["$agreed_price", 0]}},
            "total_volume": {"$sum": {"$ifNull": ["$expected_volume", 0]}}
        }}
    ])
    revenue_result = await revenue_pipeline.to_list(1)
    won_offered = revenue_result[0]["won_offered"] if revenue_result else 0
    won_agreed = revenue_result[0]["won_agreed"] if revenue_result else 0
    total_volume = revenue_result[0]["total_volume"] if revenue_result else 0
    
    # Monthly/Annual revenue (agreed_price * volume)
    monthly_revenue_pipeline = db.leads.aggregate([
        {"$match": {"status": "WON", "agreed_price": {"$ne": None}, "expected_volume": {"$ne": None}}},
        {"$project": {"monthly": {"$multiply": ["$agreed_price", "$expected_volume"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$monthly"}}}
    ])
    monthly_result = await monthly_revenue_pipeline.to_list(1)
    monthly_revenue = monthly_result[0]["total"] if monthly_result else 0
    annual_revenue = monthly_revenue * 12
    
    # Data load calculation
    monthly_data_load_gb = (total_volume * AVG_SCAN_SIZE_MB) / 1024
    daily_data_load_gb = monthly_data_load_gb / 30
    
    # Win rate
    total_closed = leads_by_status.get("WON", 0) + leads_by_status.get("LOST", 0)
    win_rate = (leads_by_status.get("WON", 0) / total_closed * 100) if total_closed > 0 else 0
    
    # Avg probability
    avg_prob = db.leads.aggregate([
        {"$match": {"status": "OPEN"}},
        {"$group": {"_id": None, "avg": {"$avg": "$probability"}}}
    ])
    avg_result = await avg_prob.to_list(1)
    avg_probability = avg_result[0]["avg"] if avg_result else 0
    
    return {
        "total_leads": total_leads,
        "total_organizations": total_orgs,
        "leads_by_stage": leads_by_stage,
        "leads_by_status": leads_by_status,
        "leads_by_org_type": leads_by_org_type,
        "pipeline_value": pipeline_value,
        "won_offered": won_offered,
        "won_agreed": won_agreed,
        "monthly_revenue": round(monthly_revenue, 2),
        "annual_revenue": round(annual_revenue, 2),
        "total_volume": total_volume,
        "daily_data_load_gb": round(daily_data_load_gb, 2),
        "monthly_data_load_gb": round(monthly_data_load_gb, 2),
        "win_rate": round(win_rate, 1),
        "avg_probability": round(avg_probability, 1) if avg_probability else 0
    }

@api_router.get("/analytics/geography")
async def get_geography_analytics(user: dict = Depends(get_current_user)):
    """State-wise aggregation for map visualization"""
    state_data = {}
    
    for state in INDIAN_STATES:
        orgs = await db.organizations.find({"state": state}, {"id": 1, "_id": 0}).to_list(1000)
        org_ids = [o["id"] for o in orgs]
        
        if org_ids:
            lead_count = await db.leads.count_documents({"organization_id": {"$in": org_ids}})
            org_count = len(org_ids)
            
            # Revenue for this state
            revenue_pipeline = db.leads.aggregate([
                {"$match": {"organization_id": {"$in": org_ids}, "status": "WON", "agreed_price": {"$ne": None}, "expected_volume": {"$ne": None}}},
                {"$project": {"monthly": {"$multiply": ["$agreed_price", "$expected_volume"]}}},
                {"$group": {"_id": None, "total": {"$sum": "$monthly"}}}
            ])
            revenue_result = await revenue_pipeline.to_list(1)
            monthly_revenue = revenue_result[0]["total"] if revenue_result else 0
            
            state_data[state] = {
                "organizations": org_count,
                "leads": lead_count,
                "monthly_revenue": round(monthly_revenue, 2)
            }
        else:
            state_data[state] = {"organizations": 0, "leads": 0, "monthly_revenue": 0}
    
    return state_data

@api_router.get("/")
async def root():
    return {"message": "Flux CRM API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
