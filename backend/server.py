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

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'flux-crm-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

app = FastAPI(title="Flux CRM API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Organization Models
class OrganizationCreate(BaseModel):
    name: str
    type: str  # HOSPITAL, NGO, GOVT, CORPORATE
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

# Organization Type Models (Custom Types)
class OrgTypeCreate(BaseModel):
    name: str
    color: str = "bg-slate-500/20 text-slate-400 border-slate-500/30"

class OrgTypeResponse(BaseModel):
    id: str
    name: str
    color: str
    is_default: bool = False

# Lead Models
class LeadCreate(BaseModel):
    lead_name: str
    organization_id: str
    product: str
    offered_price: Optional[float] = None  # Price we offer
    agreed_price: Optional[float] = None   # Final agreed price
    expected_volume: Optional[int] = None
    stage: str = "IDENTIFIED"  # IDENTIFIED, QUALIFIED, DEMO, PILOT, COMMERCIAL, CLOSED
    probability: int = 10
    status: str = "OPEN"  # OPEN, WON, LOST
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
    stage: str
    probability: int
    status: str
    expected_close_date: Optional[str] = None
    sales_owner: str
    source: Optional[str] = None
    remarks: Optional[str] = None
    created_at: str

# Lead Update/Notes Models (for daily/weekly updates)
class LeadNoteCreate(BaseModel):
    lead_id: str
    content: str
    update_type: str = "GENERAL"  # GENERAL, DAILY, WEEKLY, CALL, MEETING, EMAIL

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
    shared_at: Optional[str] = None
    signed_at: Optional[str] = None
    status: str = "DRAFT"

class DocumentUpdate(BaseModel):
    type: Optional[str] = None
    shared_at: Optional[str] = None
    signed_at: Optional[str] = None
    status: Optional[str] = None

class DocumentResponse(BaseModel):
    id: str
    lead_id: str
    type: str
    shared_at: Optional[str] = None
    signed_at: Optional[str] = None
    status: str

# Sales Flow Models
class SalesFlowCreate(BaseModel):
    player_type: str  # HOSPITAL, NGO, GOVT, CORPORATE
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
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, email=user.email, name=user.name, created_at=user_doc["created_at"])
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(db_user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=db_user["id"], email=db_user["email"], name=db_user["name"], created_at=db_user["created_at"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])

# ==================== ORGANIZATION TYPES ROUTES ====================

DEFAULT_ORG_TYPES = [
    {"id": "default-hospital", "name": "HOSPITAL", "color": "bg-blue-500/20 text-blue-400 border-blue-500/30", "is_default": True},
    {"id": "default-ngo", "name": "NGO", "color": "bg-green-500/20 text-green-400 border-green-500/30", "is_default": True},
    {"id": "default-govt", "name": "GOVT", "color": "bg-amber-500/20 text-amber-400 border-amber-500/30", "is_default": True},
    {"id": "default-corporate", "name": "CORPORATE", "color": "bg-purple-500/20 text-purple-400 border-purple-500/30", "is_default": True},
]

@api_router.get("/org-types", response_model=List[OrgTypeResponse])
async def get_org_types(user: dict = Depends(get_current_user)):
    # Get custom types from DB
    custom_types = await db.org_types.find({}, {"_id": 0}).to_list(1000)
    # Combine with defaults
    all_types = DEFAULT_ORG_TYPES + [OrgTypeResponse(**t).model_dump() for t in custom_types]
    return [OrgTypeResponse(**t) for t in all_types]

@api_router.post("/org-types", response_model=OrgTypeResponse)
async def create_org_type(org_type: OrgTypeCreate, user: dict = Depends(get_current_user)):
    # Check if type name already exists
    existing = await db.org_types.find_one({"name": org_type.name.upper()})
    if existing or any(t["name"] == org_type.name.upper() for t in DEFAULT_ORG_TYPES):
        raise HTTPException(status_code=400, detail="Organization type already exists")
    
    type_id = str(uuid.uuid4())
    type_doc = {
        "id": type_id,
        "name": org_type.name.upper(),
        "color": org_type.color,
        "is_default": False
    }
    await db.org_types.insert_one(type_doc)
    return OrgTypeResponse(**type_doc)

@api_router.delete("/org-types/{type_id}")
async def delete_org_type(type_id: str, user: dict = Depends(get_current_user)):
    # Can't delete default types
    if type_id.startswith("default-"):
        raise HTTPException(status_code=400, detail="Cannot delete default organization type")
    
    result = await db.org_types.delete_one({"id": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Organization type not found")
    return {"message": "Organization type deleted"}

# ==================== ORGANIZATION ROUTES ====================

@api_router.post("/organizations", response_model=OrganizationResponse)
async def create_organization(org: OrganizationCreate, user: dict = Depends(get_current_user)):
    org_id = str(uuid.uuid4())
    org_doc = {
        "id": org_id,
        "name": org.name,
        "type": org.type,
        "state": org.state,
        "city": org.city,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.organizations.insert_one(org_doc)
    return OrganizationResponse(**org_doc, lead_count=0)

@api_router.get("/organizations", response_model=List[OrganizationResponse])
async def get_organizations(
    type: Optional[str] = None,
    state: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if type:
        query["type"] = type
    if state:
        query["state"] = state
    
    orgs = await db.organizations.find(query, {"_id": 0}).to_list(1000)
    
    # Get lead counts for each org
    for org in orgs:
        lead_count = await db.leads.count_documents({"organization_id": org["id"]})
        org["lead_count"] = lead_count
    
    return [OrganizationResponse(**org) for org in orgs]

@api_router.get("/organizations/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: str, user: dict = Depends(get_current_user)):
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    lead_count = await db.leads.count_documents({"organization_id": org_id})
    return OrganizationResponse(**org, lead_count=lead_count)

@api_router.put("/organizations/{org_id}", response_model=OrganizationResponse)
async def update_organization(org_id: str, org: OrganizationUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in org.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.organizations.update_one({"id": org_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    updated = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    lead_count = await db.leads.count_documents({"organization_id": org_id})
    return OrganizationResponse(**updated, lead_count=lead_count)

@api_router.delete("/organizations/{org_id}")
async def delete_organization(org_id: str, user: dict = Depends(get_current_user)):
    result = await db.organizations.delete_one({"id": org_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
    return {"message": "Organization deleted"}

# ==================== LEAD ROUTES ====================

def generate_lead_code():
    return f"LEAD-{str(uuid.uuid4())[:8].upper()}"

@api_router.post("/leads", response_model=LeadResponse)
async def create_lead(lead: LeadCreate, user: dict = Depends(get_current_user)):
    # Verify organization exists
    org = await db.organizations.find_one({"id": lead.organization_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    lead_id = str(uuid.uuid4())
    lead_doc = {
        "id": lead_id,
        "lead_code": generate_lead_code(),
        "lead_name": lead.lead_name,
        "organization_id": lead.organization_id,
        "product": lead.product,
        "offered_price": lead.offered_price,
        "agreed_price": lead.agreed_price,
        "expected_volume": lead.expected_volume,
        "stage": lead.stage,
        "probability": lead.probability,
        "status": lead.status,
        "expected_close_date": lead.expected_close_date,
        "sales_owner": lead.sales_owner,
        "source": lead.source,
        "remarks": lead.remarks,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.leads.insert_one(lead_doc)
    
    return LeadResponse(
        **lead_doc,
        organization_name=org["name"],
        organization_type=org["type"]
    )

@api_router.get("/leads", response_model=List[LeadResponse])
async def get_leads(
    stage: Optional[str] = None,
    status: Optional[str] = None,
    organization_id: Optional[str] = None,
    sales_owner: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if stage:
        query["stage"] = stage
    if status:
        query["status"] = status
    if organization_id:
        query["organization_id"] = organization_id
    if sales_owner:
        query["sales_owner"] = sales_owner
    
    leads = await db.leads.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with organization data
    result = []
    for lead in leads:
        org = await db.organizations.find_one({"id": lead["organization_id"]}, {"_id": 0})
        lead["organization_name"] = org["name"] if org else None
        lead["organization_type"] = org["type"] if org else None
        result.append(LeadResponse(**lead))
    
    return result

@api_router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    org = await db.organizations.find_one({"id": lead["organization_id"]}, {"_id": 0})
    lead["organization_name"] = org["name"] if org else None
    lead["organization_type"] = org["type"] if org else None
    
    return LeadResponse(**lead)

@api_router.put("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, lead: LeadUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in lead.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    org = await db.organizations.find_one({"id": updated["organization_id"]}, {"_id": 0})
    updated["organization_name"] = org["name"] if org else None
    updated["organization_type"] = org["type"] if org else None
    
    return LeadResponse(**updated)

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user: dict = Depends(get_current_user)):
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    # Also delete related milestones, documents and notes
    await db.milestones.delete_many({"lead_id": lead_id})
    await db.documents.delete_many({"lead_id": lead_id})
    await db.lead_notes.delete_many({"lead_id": lead_id})
    return {"message": "Lead deleted"}

# ==================== LEAD NOTES/UPDATES ROUTES ====================

@api_router.post("/lead-notes", response_model=LeadNoteResponse)
async def create_lead_note(note: LeadNoteCreate, user: dict = Depends(get_current_user)):
    # Verify lead exists
    lead = await db.leads.find_one({"id": note.lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    note_id = str(uuid.uuid4())
    note_doc = {
        "id": note_id,
        "lead_id": note.lead_id,
        "content": note.content,
        "update_type": note.update_type,
        "created_by": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.lead_notes.insert_one(note_doc)
    return LeadNoteResponse(**note_doc)

@api_router.get("/lead-notes", response_model=List[LeadNoteResponse])
async def get_lead_notes(lead_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
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
    # Verify lead exists
    lead = await db.leads.find_one({"id": milestone.lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    milestone_id = str(uuid.uuid4())
    milestone_doc = {
        "id": milestone_id,
        "lead_id": milestone.lead_id,
        "name": milestone.name,
        "start_date": milestone.start_date,
        "end_date": milestone.end_date,
        "status": milestone.status
    }
    await db.milestones.insert_one(milestone_doc)
    return MilestoneResponse(**milestone_doc)

@api_router.get("/milestones", response_model=List[MilestoneResponse])
async def get_milestones(lead_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
    milestones = await db.milestones.find(query, {"_id": 0}).to_list(1000)
    return [MilestoneResponse(**m) for m in milestones]

@api_router.put("/milestones/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(milestone_id: str, milestone: MilestoneUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in milestone.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
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
    # Verify lead exists
    lead = await db.leads.find_one({"id": doc.lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    doc_id = str(uuid.uuid4())
    doc_data = {
        "id": doc_id,
        "lead_id": doc.lead_id,
        "type": doc.type,
        "shared_at": doc.shared_at,
        "signed_at": doc.signed_at,
        "status": doc.status
    }
    await db.documents.insert_one(doc_data)
    return DocumentResponse(**doc_data)

@api_router.get("/documents", response_model=List[DocumentResponse])
async def get_documents(lead_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
    docs = await db.documents.find(query, {"_id": 0}).to_list(1000)
    return [DocumentResponse(**d) for d in docs]

@api_router.put("/documents/{doc_id}", response_model=DocumentResponse)
async def update_document(doc_id: str, doc: DocumentUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in doc.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
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
        "id": flow_id,
        "player_type": flow.player_type,
        "step_number": flow.step_number,
        "description": flow.description,
        "owner": flow.owner,
        "output": flow.output
    }
    await db.sales_flow.insert_one(flow_doc)
    return SalesFlowResponse(**flow_doc)

@api_router.get("/sales-flow", response_model=List[SalesFlowResponse])
async def get_sales_flow(player_type: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if player_type:
        query["player_type"] = player_type
    flows = await db.sales_flow.find(query, {"_id": 0}).sort("step_number", 1).to_list(1000)
    return [SalesFlowResponse(**f) for f in flows]

@api_router.put("/sales-flow/{flow_id}", response_model=SalesFlowResponse)
async def update_sales_flow(flow_id: str, flow: SalesFlowUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in flow.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
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

# ==================== ANALYTICS ROUTES ====================

@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(user: dict = Depends(get_current_user)):
    # Total counts
    total_leads = await db.leads.count_documents({})
    total_orgs = await db.organizations.count_documents({})
    
    # Leads by stage
    stages = ["IDENTIFIED", "QUALIFIED", "DEMO", "PILOT", "COMMERCIAL", "CLOSED"]
    leads_by_stage = {}
    for stage in stages:
        count = await db.leads.count_documents({"stage": stage})
        leads_by_stage[stage] = count
    
    # Leads by status
    statuses = ["OPEN", "WON", "LOST"]
    leads_by_status = {}
    for status in statuses:
        count = await db.leads.count_documents({"status": status})
        leads_by_status[status] = count
    
    # Leads by org type
    org_types = ["HOSPITAL", "NGO", "GOVT", "CORPORATE"]
    leads_by_org_type = {}
    for org_type in org_types:
        orgs = await db.organizations.find({"type": org_type}, {"id": 1, "_id": 0}).to_list(1000)
        org_ids = [o["id"] for o in orgs]
        count = await db.leads.count_documents({"organization_id": {"$in": org_ids}}) if org_ids else 0
        leads_by_org_type[org_type] = count
    
    # Pipeline value (sum of proposed_price for open leads)
    pipeline = db.leads.aggregate([
        {"$match": {"status": "OPEN", "proposed_price": {"$ne": None}}},
        {"$group": {"_id": None, "total": {"$sum": "$proposed_price"}}}
    ])
    pipeline_result = await pipeline.to_list(1)
    pipeline_value = pipeline_result[0]["total"] if pipeline_result else 0
    
    # Won value
    won_pipeline = db.leads.aggregate([
        {"$match": {"status": "WON", "proposed_price": {"$ne": None}}},
        {"$group": {"_id": None, "total": {"$sum": "$proposed_price"}}}
    ])
    won_result = await won_pipeline.to_list(1)
    won_value = won_result[0]["total"] if won_result else 0
    
    # Win rate
    total_closed = leads_by_status.get("WON", 0) + leads_by_status.get("LOST", 0)
    win_rate = (leads_by_status.get("WON", 0) / total_closed * 100) if total_closed > 0 else 0
    
    # Average probability
    avg_prob_pipeline = db.leads.aggregate([
        {"$match": {"status": "OPEN"}},
        {"$group": {"_id": None, "avg": {"$avg": "$probability"}}}
    ])
    avg_prob_result = await avg_prob_pipeline.to_list(1)
    avg_probability = avg_prob_result[0]["avg"] if avg_prob_result else 0
    
    return {
        "total_leads": total_leads,
        "total_organizations": total_orgs,
        "leads_by_stage": leads_by_stage,
        "leads_by_status": leads_by_status,
        "leads_by_org_type": leads_by_org_type,
        "pipeline_value": pipeline_value,
        "won_value": won_value,
        "win_rate": round(win_rate, 1),
        "avg_probability": round(avg_probability, 1) if avg_probability else 0
    }

@api_router.get("/")
async def root():
    return {"message": "Flux CRM API"}

# Include router and middleware
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
