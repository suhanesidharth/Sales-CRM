import requests
import sys
import json
from datetime import datetime, timedelta

class FluxCRMTester:
    def __init__(self, base_url="https://sales-pipeline-62.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.org_id = None
        self.lead_id = None
        self.milestone_id = None
        self.document_id = None
        self.flow_id = None
        self.org_type_id = None
        self.lead_note_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth_register(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_data
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_auth_login(self):
        """Test user login with existing credentials"""
        test_data = {
            "email": "test_user@example.com",
            "password": "TestPass123!"
        }
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=test_data
        )
        return success

    def test_auth_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_get_org_types(self):
        """Test get organization types"""
        success, response = self.run_test(
            "Get Organization Types",
            "GET",
            "org-types",
            200
        )
        if success:
            print(f"   Found {len(response)} organization types")
        return success

    def test_create_org_type(self):
        """Test create custom organization type"""
        test_data = {
            "name": "STARTUP",
            "color": "bg-teal-500/20 text-teal-400 border-teal-500/30"
        }
        success, response = self.run_test(
            "Create Organization Type",
            "POST",
            "org-types",
            200,
            data=test_data
        )
        if success and 'id' in response:
            self.org_type_id = response['id']
            print(f"   Organization Type ID: {self.org_type_id}")
            return True
        return False

    def test_create_lead_note(self):
        """Test create lead note/update"""
        if not self.lead_id:
            print("❌ Skipped - No lead ID available")
            return False
        
        test_data = {
            "lead_id": self.lead_id,
            "content": "Had initial call with client. They are interested in our MRI solution.",
            "update_type": "CALL"
        }
        success, response = self.run_test(
            "Create Lead Note",
            "POST",
            "lead-notes",
            200,
            data=test_data
        )
        if success and 'id' in response:
            self.lead_note_id = response['id']
            print(f"   Lead Note ID: {self.lead_note_id}")
            return True
        return False

    def test_get_lead_notes(self):
        """Test get lead notes"""
        params = {"lead_id": self.lead_id} if self.lead_id else None
        success, response = self.run_test(
            "Get Lead Notes",
            "GET",
            "lead-notes",
            200,
            params=params
        )
        if success:
            print(f"   Found {len(response)} lead notes")
        return success

    def test_create_organization(self):
        """Test organization creation"""
        test_data = {
            "name": "Test Hospital Corp",
            "type": "HOSPITAL",
            "state": "California",
            "city": "San Francisco"
        }
        success, response = self.run_test(
            "Create Organization",
            "POST",
            "organizations",
            200,
            data=test_data
        )
        if success and 'id' in response:
            self.org_id = response['id']
            print(f"   Organization ID: {self.org_id}")
            return True
        return False

    def test_get_organizations(self):
        """Test get organizations"""
        success, response = self.run_test(
            "Get Organizations",
            "GET",
            "organizations",
            200
        )
        return success

    def test_get_organization_by_id(self):
        """Test get organization by ID"""
        if not self.org_id:
            print("❌ Skipped - No organization ID available")
            return False
        success, response = self.run_test(
            "Get Organization by ID",
            "GET",
            f"organizations/{self.org_id}",
            200
        )
        return success

    def test_update_organization(self):
        """Test update organization"""
        if not self.org_id:
            print("❌ Skipped - No organization ID available")
            return False
        test_data = {
            "name": "Updated Test Hospital Corp",
            "city": "Los Angeles"
        }
        success, response = self.run_test(
            "Update Organization",
            "PUT",
            f"organizations/{self.org_id}",
            200,
            data=test_data
        )
        return success

    def test_create_lead(self):
        """Test lead creation"""
        if not self.org_id:
            print("❌ Skipped - No organization ID available")
            return False
        
        test_data = {
            "lead_name": "Test Medical Equipment Deal",
            "organization_id": self.org_id,
            "product": "MRI Scanner",
            "offered_price": 500000.0,
            "agreed_price": 450000.0,
            "expected_volume": 1,
            "stage": "IDENTIFIED",
            "probability": 25,
            "status": "OPEN",
            "expected_close_date": (datetime.now() + timedelta(days=90)).strftime('%Y-%m-%d'),
            "sales_owner": "John Doe",
            "source": "Cold Call",
            "remarks": "High potential client"
        }
        success, response = self.run_test(
            "Create Lead",
            "POST",
            "leads",
            200,
            data=test_data
        )
        if success and 'id' in response:
            self.lead_id = response['id']
            print(f"   Lead ID: {self.lead_id}")
            return True
        return False

    def test_get_leads(self):
        """Test get leads"""
        success, response = self.run_test(
            "Get Leads",
            "GET",
            "leads",
            200
        )
        return success

    def test_get_lead_by_id(self):
        """Test get lead by ID"""
        if not self.lead_id:
            print("❌ Skipped - No lead ID available")
            return False
        success, response = self.run_test(
            "Get Lead by ID",
            "GET",
            f"leads/{self.lead_id}",
            200
        )
        return success

    def test_update_lead(self):
        """Test update lead"""
        if not self.lead_id:
            print("❌ Skipped - No lead ID available")
            return False
        test_data = {
            "stage": "QUALIFIED",
            "probability": 40,
            "remarks": "Updated after initial meeting"
        }
        success, response = self.run_test(
            "Update Lead",
            "PUT",
            f"leads/{self.lead_id}",
            200,
            data=test_data
        )
        return success

    def test_create_milestone(self):
        """Test milestone creation"""
        if not self.lead_id:
            print("❌ Skipped - No lead ID available")
            return False
        
        test_data = {
            "lead_id": self.lead_id,
            "name": "Initial Demo",
            "start_date": datetime.now().strftime('%Y-%m-%d'),
            "end_date": (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),
            "status": "PENDING"
        }
        success, response = self.run_test(
            "Create Milestone",
            "POST",
            "milestones",
            200,
            data=test_data
        )
        if success and 'id' in response:
            self.milestone_id = response['id']
            print(f"   Milestone ID: {self.milestone_id}")
            return True
        return False

    def test_get_milestones(self):
        """Test get milestones"""
        params = {"lead_id": self.lead_id} if self.lead_id else None
        success, response = self.run_test(
            "Get Milestones",
            "GET",
            "milestones",
            200,
            params=params
        )
        return success

    def test_update_milestone(self):
        """Test update milestone"""
        if not self.milestone_id:
            print("❌ Skipped - No milestone ID available")
            return False
        test_data = {
            "status": "IN_PROGRESS"
        }
        success, response = self.run_test(
            "Update Milestone",
            "PUT",
            f"milestones/{self.milestone_id}",
            200,
            data=test_data
        )
        return success

    def test_create_document(self):
        """Test document creation"""
        if not self.lead_id:
            print("❌ Skipped - No lead ID available")
            return False
        
        test_data = {
            "lead_id": self.lead_id,
            "type": "PROPOSAL",
            "status": "DRAFT"
        }
        success, response = self.run_test(
            "Create Document",
            "POST",
            "documents",
            200,
            data=test_data
        )
        if success and 'id' in response:
            self.document_id = response['id']
            print(f"   Document ID: {self.document_id}")
            return True
        return False

    def test_get_documents(self):
        """Test get documents"""
        params = {"lead_id": self.lead_id} if self.lead_id else None
        success, response = self.run_test(
            "Get Documents",
            "GET",
            "documents",
            200,
            params=params
        )
        return success

    def test_update_document(self):
        """Test update document"""
        if not self.document_id:
            print("❌ Skipped - No document ID available")
            return False
        test_data = {
            "status": "SHARED",
            "shared_at": datetime.now().isoformat()
        }
        success, response = self.run_test(
            "Update Document",
            "PUT",
            f"documents/{self.document_id}",
            200,
            data=test_data
        )
        return success

    def test_create_sales_flow(self):
        """Test sales flow creation"""
        test_data = {
            "player_type": "HOSPITAL",
            "step_number": 1,
            "description": "Initial contact and needs assessment",
            "owner": "Sales Rep",
            "output": "Qualified lead with documented requirements"
        }
        success, response = self.run_test(
            "Create Sales Flow",
            "POST",
            "sales-flow",
            200,
            data=test_data
        )
        if success and 'id' in response:
            self.flow_id = response['id']
            print(f"   Sales Flow ID: {self.flow_id}")
            return True
        return False

    def test_get_sales_flow(self):
        """Test get sales flow"""
        params = {"player_type": "HOSPITAL"}
        success, response = self.run_test(
            "Get Sales Flow",
            "GET",
            "sales-flow",
            200,
            params=params
        )
        return success

    def test_update_sales_flow(self):
        """Test update sales flow"""
        if not self.flow_id:
            print("❌ Skipped - No sales flow ID available")
            return False
        test_data = {
            "description": "Updated: Initial contact and comprehensive needs assessment"
        }
        success, response = self.run_test(
            "Update Sales Flow",
            "PUT",
            f"sales-flow/{self.flow_id}",
            200,
            data=test_data
        )
        return success

    def test_dashboard_analytics(self):
        """Test dashboard analytics"""
        success, response = self.run_test(
            "Dashboard Analytics",
            "GET",
            "analytics/dashboard",
            200
        )
        if success:
            print(f"   Analytics data keys: {list(response.keys())}")
        return success

    def test_api_root(self):
        """Test API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "",
            200
        )
        return success

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete in reverse order of creation
        if self.lead_note_id:
            self.run_test("Delete Lead Note", "DELETE", f"lead-notes/{self.lead_note_id}", 200)
        
        if self.document_id:
            self.run_test("Delete Document", "DELETE", f"documents/{self.document_id}", 200)
        
        if self.milestone_id:
            self.run_test("Delete Milestone", "DELETE", f"milestones/{self.milestone_id}", 200)
        
        if self.flow_id:
            self.run_test("Delete Sales Flow", "DELETE", f"sales-flow/{self.flow_id}", 200)
        
        if self.lead_id:
            self.run_test("Delete Lead", "DELETE", f"leads/{self.lead_id}", 200)
        
        if self.org_id:
            self.run_test("Delete Organization", "DELETE", f"organizations/{self.org_id}", 200)
        
        if self.org_type_id:
            self.run_test("Delete Organization Type", "DELETE", f"org-types/{self.org_type_id}", 200)

def main():
    print("🚀 Starting Flux CRM Backend API Tests")
    print("=" * 50)
    
    tester = FluxCRMTester()
    
    # Test sequence
    test_sequence = [
        # Authentication tests
        ("Auth Registration", tester.test_auth_register),
        ("Auth Me", tester.test_auth_me),
        ("API Root", tester.test_api_root),
        
        # Organization tests
        ("Create Organization", tester.test_create_organization),
        ("Get Organizations", tester.test_get_organizations),
        ("Get Organization by ID", tester.test_get_organization_by_id),
        ("Update Organization", tester.test_update_organization),
        
        # Lead tests
        ("Create Lead", tester.test_create_lead),
        ("Get Leads", tester.test_get_leads),
        ("Get Lead by ID", tester.test_get_lead_by_id),
        ("Update Lead", tester.test_update_lead),
        
        # Milestone tests
        ("Create Milestone", tester.test_create_milestone),
        ("Get Milestones", tester.test_get_milestones),
        ("Update Milestone", tester.test_update_milestone),
        
        # Document tests
        ("Create Document", tester.test_create_document),
        ("Get Documents", tester.test_get_documents),
        ("Update Document", tester.test_update_document),
        
        # Sales Flow tests
        ("Create Sales Flow", tester.test_create_sales_flow),
        ("Get Sales Flow", tester.test_get_sales_flow),
        ("Update Sales Flow", tester.test_update_sales_flow),
        
        # Analytics tests
        ("Dashboard Analytics", tester.test_dashboard_analytics),
    ]
    
    failed_tests = []
    
    for test_name, test_func in test_sequence:
        try:
            success = test_func()
            if not success:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Cleanup
    tester.cleanup_test_data()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"\n❌ Failed tests ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print("\n✅ All tests passed!")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success rate: {success_rate:.1f}%")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())