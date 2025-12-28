import requests
import json
from datetime import datetime

class SpecificFeaturesTest:
    def __init__(self, base_url="https://sales-pipeline-62.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None

    def authenticate(self):
        """Register a new user to get admin access (first user becomes admin)"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "email": f"admin_test_{timestamp}@example.com",
            "password": "AdminPass123!",
            "name": f"Admin Test {timestamp}"
        }
        
        response = requests.post(f"{self.base_url}/api/auth/register", json=test_data)
        if response.status_code == 200:
            data = response.json()
            self.token = data['access_token']
            self.user_id = data['user']['id']
            print(f"✅ Authenticated as admin: {data['user']['role']}")
            return True
        else:
            print(f"❌ Authentication failed: {response.text}")
            return False

    def get_headers(self):
        return {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.token}'
        }

    def test_indian_states(self):
        """Test Indian states API"""
        print("\n🔍 Testing Indian States API...")
        response = requests.get(f"{self.base_url}/api/indian-states", headers=self.get_headers())
        if response.status_code == 200:
            data = response.json()
            states = data['states']
            print(f"✅ Found {len(states)} Indian states")
            print(f"   Sample states: {states[:5]}")
            # Check for specific Indian states
            key_states = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat']
            found_states = [s for s in key_states if s in states]
            print(f"   Key states found: {found_states}")
            return True
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return False

    def test_organization_with_indian_state(self):
        """Test organization creation with Indian state"""
        print("\n🔍 Testing Organization Creation with Indian State...")
        test_data = {
            "name": "Mumbai Medical Center",
            "type": "HOSPITAL",
            "state": "Maharashtra",
            "city": "Mumbai"
        }
        response = requests.post(f"{self.base_url}/api/organizations", json=test_data, headers=self.get_headers())
        if response.status_code == 200:
            org_data = response.json()
            print(f"✅ Organization created with Indian state: {org_data['state']}")
            print(f"   Organization ID: {org_data['id']}")
            return org_data['id']
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return None

    def test_lead_with_inr_pricing(self, org_id):
        """Test lead creation with INR pricing"""
        print("\n🔍 Testing Lead Creation with INR Pricing...")
        test_data = {
            "lead_name": "MRI Scanner Deal - Mumbai",
            "organization_id": org_id,
            "product": "MRI Scanner",
            "offered_price": 5000000.0,  # ₹50 Lakh
            "agreed_price": 4500000.0,   # ₹45 Lakh
            "expected_volume": 100,      # 100 scans per month
            "stage": "IDENTIFIED",
            "probability": 25,
            "status": "OPEN",
            "sales_owner": "Rajesh Kumar",
            "source": "Direct Contact",
            "remarks": "High potential client in Mumbai"
        }
        response = requests.post(f"{self.base_url}/api/leads", json=test_data, headers=self.get_headers())
        if response.status_code == 200:
            lead_data = response.json()
            print(f"✅ Lead created with INR pricing:")
            print(f"   Offered Price: ₹{lead_data['offered_price']:,.0f}")
            print(f"   Agreed Price: ₹{lead_data['agreed_price']:,.0f}")
            print(f"   Monthly Revenue: ₹{lead_data['monthly_revenue']:,.0f}")
            print(f"   Annual Revenue: ₹{lead_data['annual_revenue']:,.0f}")
            print(f"   Daily Data Load: {lead_data['daily_data_load_gb']} GB")
            print(f"   Monthly Data Load: {lead_data['monthly_data_load_gb']} GB")
            return lead_data['id']
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return None

    def test_dashboard_analytics_inr(self):
        """Test dashboard analytics with INR formatting"""
        print("\n🔍 Testing Dashboard Analytics with INR Data...")
        response = requests.get(f"{self.base_url}/api/analytics/dashboard", headers=self.get_headers())
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Dashboard analytics retrieved:")
            print(f"   Total Leads: {data['total_leads']}")
            print(f"   Total Organizations: {data['total_organizations']}")
            print(f"   Pipeline Value: ₹{data['pipeline_value']:,.0f}")
            print(f"   Monthly Revenue: ₹{data['monthly_revenue']:,.0f}")
            print(f"   Annual Revenue: ₹{data['annual_revenue']:,.0f}")
            print(f"   Daily Data Load: {data['daily_data_load_gb']} GB")
            print(f"   Monthly Data Load: {data['monthly_data_load_gb']} GB")
            print(f"   Win Rate: {data['win_rate']}%")
            return True
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return False

    def test_geography_analytics(self):
        """Test geography analytics"""
        print("\n🔍 Testing Geography Analytics...")
        response = requests.get(f"{self.base_url}/api/analytics/geography", headers=self.get_headers())
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Geography analytics retrieved for {len(data)} states")
            # Show states with data
            states_with_data = {k: v for k, v in data.items() if v['organizations'] > 0 or v['leads'] > 0}
            print(f"   States with data: {len(states_with_data)}")
            for state, info in list(states_with_data.items())[:3]:
                print(f"   {state}: {info['organizations']} orgs, {info['leads']} leads, ₹{info['monthly_revenue']:,.0f}/mo")
            return True
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return False

    def test_team_management(self):
        """Test team management (admin only)"""
        print("\n🔍 Testing Team Management (Admin Only)...")
        
        # Get team members
        response = requests.get(f"{self.base_url}/api/team", headers=self.get_headers())
        if response.status_code == 200:
            members = response.json()
            print(f"✅ Retrieved {len(members)} team members")
            for member in members:
                print(f"   {member['name']} ({member['email']}) - Role: {member['role']}")
        else:
            print(f"❌ Failed to get team: {response.status_code} - {response.text}")
            return False

        # Invite a new team member
        invite_data = {
            "name": "Test Manager",
            "email": f"manager_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "ManagerPass123!",
            "role": "manager"
        }
        response = requests.post(f"{self.base_url}/api/team/invite", json=invite_data, headers=self.get_headers())
        if response.status_code == 200:
            new_member = response.json()
            print(f"✅ Invited new team member: {new_member['name']} as {new_member['role']}")
            return new_member['id']
        else:
            print(f"❌ Failed to invite member: {response.status_code} - {response.text}")
            return None

    def test_custom_org_types(self):
        """Test custom organization types"""
        print("\n🔍 Testing Custom Organization Types...")
        
        # Get existing types
        response = requests.get(f"{self.base_url}/api/org-types", headers=self.get_headers())
        if response.status_code == 200:
            types = response.json()
            print(f"✅ Found {len(types)} organization types")
            default_types = [t for t in types if t['is_default']]
            custom_types = [t for t in types if not t['is_default']]
            print(f"   Default types: {len(default_types)}")
            print(f"   Custom types: {len(custom_types)}")
        else:
            print(f"❌ Failed to get org types: {response.status_code} - {response.text}")
            return False

        # Create custom type
        custom_type_data = {
            "name": "RESEARCH_LAB",
            "color": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
        }
        response = requests.post(f"{self.base_url}/api/org-types", json=custom_type_data, headers=self.get_headers())
        if response.status_code == 200:
            new_type = response.json()
            print(f"✅ Created custom organization type: {new_type['name']}")
            return new_type['id']
        else:
            print(f"❌ Failed to create custom type: {response.status_code} - {response.text}")
            return None

    def test_custom_lead_stages(self):
        """Test custom lead stages"""
        print("\n🔍 Testing Custom Lead Stages...")
        
        # Get existing stages
        response = requests.get(f"{self.base_url}/api/lead-stages", headers=self.get_headers())
        if response.status_code == 200:
            stages = response.json()
            print(f"✅ Found {len(stages)} lead stages")
            default_stages = [s for s in stages if s['is_default']]
            custom_stages = [s for s in stages if not s['is_default']]
            print(f"   Default stages: {len(default_stages)}")
            print(f"   Custom stages: {len(custom_stages)}")
        else:
            print(f"❌ Failed to get lead stages: {response.status_code} - {response.text}")
            return False

        # Create custom stage
        custom_stage_data = {
            "name": "TECHNICAL_REVIEW",
            "order": 7,
            "color": "bg-orange-500/20 text-orange-400 border-orange-500/30"
        }
        response = requests.post(f"{self.base_url}/api/lead-stages", json=custom_stage_data, headers=self.get_headers())
        if response.status_code == 200:
            new_stage = response.json()
            print(f"✅ Created custom lead stage: {new_stage['name']} (order: {new_stage['order']})")
            return new_stage['id']
        else:
            print(f"❌ Failed to create custom stage: {response.status_code} - {response.text}")
            return None

    def test_document_with_custom_name(self, lead_id):
        """Test document creation with custom name"""
        print("\n🔍 Testing Document with Custom Name...")
        doc_data = {
            "lead_id": lead_id,
            "type": "PROPOSAL",
            "custom_name": "Mumbai MRI Scanner Proposal v2.1",
            "status": "DRAFT"
        }
        response = requests.post(f"{self.base_url}/api/documents", json=doc_data, headers=self.get_headers())
        if response.status_code == 200:
            doc = response.json()
            print(f"✅ Document created with custom name: {doc['custom_name']}")
            print(f"   Document ID: {doc['id']}")
            print(f"   Type: {doc['type']}")
            print(f"   Status: {doc['status']}")
            return doc['id']
        else:
            print(f"❌ Failed to create document: {response.status_code} - {response.text}")
            return None

def main():
    print("🚀 Testing Specific CRM Features")
    print("=" * 50)
    
    tester = SpecificFeaturesTest()
    
    # Authenticate as admin (first user)
    if not tester.authenticate():
        return 1
    
    # Test sequence for specific features
    org_id = None
    lead_id = None
    
    # Test Indian states
    tester.test_indian_states()
    
    # Test organization with Indian state
    org_id = tester.test_organization_with_indian_state()
    
    # Test lead with INR pricing
    if org_id:
        lead_id = tester.test_lead_with_inr_pricing(org_id)
    
    # Test dashboard analytics
    tester.test_dashboard_analytics_inr()
    
    # Test geography analytics
    tester.test_geography_analytics()
    
    # Test team management (admin only)
    tester.test_team_management()
    
    # Test custom organization types
    tester.test_custom_org_types()
    
    # Test custom lead stages
    tester.test_custom_lead_stages()
    
    # Test document with custom name
    if lead_id:
        tester.test_document_with_custom_name(lead_id)
    
    print("\n" + "=" * 50)
    print("✅ Specific features testing completed!")
    
    return 0

if __name__ == "__main__":
    exit(main())