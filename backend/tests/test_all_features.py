"""
Comprehensive Backend API Tests for CyberVoid Hub - v2
Testing: Auth, Files, Folders, Comments, Storage, Notifications, Chat, Share Links, Vault, Search, Profile
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://archive-portal-3.preview.emergentagent.com').rstrip('/')

# Test user credentials
TEST_USER_1 = {"email": "test001@void.net", "password": "TestPass123", "username": "testuser001"}
TEST_USER_2 = {"email": "test002@void.net", "password": "TestPass123", "username": "testuser002"}


def get_token(email, password):
    """Helper to get auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if response.status_code == 200:
        return response.json()["token"]
    return None


class TestHealthCheck:
    """Health check test"""
    
    def test_health(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("SUCCESS: Health check passed")


class TestAuthRegistration:
    """User registration tests"""
    
    def test_register_user_1(self):
        """Register test user 1"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json=TEST_USER_1)
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            assert "user" in data
            print(f"SUCCESS: Registered user {TEST_USER_1['username']}")
        elif response.status_code == 400:
            print(f"INFO: User {TEST_USER_1['username']} already exists")
        else:
            print(f"FAIL: Unexpected status {response.status_code}")
            assert False

    def test_register_user_2(self):
        """Register test user 2 for chat testing"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json=TEST_USER_2)
        if response.status_code == 200:
            print(f"SUCCESS: Registered user {TEST_USER_2['username']}")
        elif response.status_code == 400:
            print(f"INFO: User {TEST_USER_2['username']} already exists")
        else:
            print(f"FAIL: Unexpected status {response.status_code}")
            assert False

    def test_register_validation_short_username(self):
        """Test username validation - too short"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": "ab", "email": "short@void.net", "password": "TestPass123"
        })
        assert response.status_code in [400, 422]
        print("SUCCESS: Short username rejected")

    def test_register_validation_weak_password(self):
        """Test password validation - no uppercase"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": "weakpassuser", "email": "weak@void.net", "password": "testpass123"
        })
        assert response.status_code in [400, 422]
        print("SUCCESS: Weak password (no uppercase) rejected")


class TestAuthLogin:
    """Login tests"""
    
    def test_login_valid_credentials(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_1["email"],
            "password": TEST_USER_1["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print("SUCCESS: Login with valid credentials")

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_1["email"],
            "password": "WrongPassword123"
        })
        assert response.status_code == 401
        print("SUCCESS: Invalid credentials rejected")


class TestForgotPassword:
    """Forgot password flow tests - MOCKED"""
    
    def test_forgot_password_request(self):
        """Test forgot password request (returns code directly - MOCKED)"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": TEST_USER_1["email"]
        })
        assert response.status_code == 200
        data = response.json()
        if "reset_token" in data:
            assert "code" in data
            print(f"SUCCESS: Forgot password - Got reset token and code (MOCKED)")
        else:
            print(f"SUCCESS: Forgot password - Response: {data.get('status')}")

    def test_forgot_password_nonexistent_email(self):
        """Test forgot password for non-existent email"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@void.net"
        })
        assert response.status_code == 200  # Always returns 200 for security
        print("SUCCESS: Forgot password handles non-existent email")

    def test_reset_password_flow(self):
        """Test full password reset flow"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": TEST_USER_1["email"]
        })
        assert response.status_code == 200
        data = response.json()
        
        if "reset_token" in data:
            reset_response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
                "token": data["reset_token"],
                "new_password": TEST_USER_1["password"]
            })
            assert reset_response.status_code == 200
            print("SUCCESS: Password reset flow completed (MOCKED)")
        else:
            print("INFO: Reset token not returned")


class TestFilesAndFolders:
    """File and folder management tests"""
    
    def test_get_files(self):
        """Test getting user's files"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/files", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"SUCCESS: Got {len(response.json())} files")

    def test_create_folder(self):
        """Test folder creation"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        folder_name = f"TEST_Folder_{uuid.uuid4().hex[:6]}"
        response = requests.post(f"{BASE_URL}/api/folders", 
            headers=headers, json={"name": folder_name})
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == folder_name
        print(f"SUCCESS: Created folder {folder_name}")

    def test_get_folders(self):
        """Test getting folders"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/folders", headers=headers)
        assert response.status_code == 200
        print(f"SUCCESS: Got {len(response.json())} folders")

    def test_file_upload_and_move(self):
        """Test file upload and move to folder"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # Upload file
        test_content = b"Test file content for CyberVoid Hub"
        files = {"file": ("TEST_testfile.txt", test_content, "text/plain")}
        data = {"is_public": "true"}
        
        upload_response = requests.post(f"{BASE_URL}/api/files/upload",
            headers=headers, files=files, data=data)
        assert upload_response.status_code == 200
        file_data = upload_response.json()
        print(f"SUCCESS: Uploaded file {file_data['filename']}")
        
        # Get folders and move file
        folders_response = requests.get(f"{BASE_URL}/api/folders", headers=headers)
        folders = folders_response.json()
        
        if folders:
            folder_id = folders[0]["folder_id"]
            move_response = requests.put(f"{BASE_URL}/api/files/{file_data['file_id']}/move",
                headers=headers, json={"folder_id": folder_id})
            assert move_response.status_code == 200
            print(f"SUCCESS: Moved file to folder")

    def test_bulk_delete(self):
        """Test bulk file delete"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # Upload test files
        file_ids = []
        for i in range(2):
            test_content = f"Bulk delete test file {i}".encode()
            files = {"file": (f"TEST_bulk_{i}.txt", test_content, "text/plain")}
            response = requests.post(f"{BASE_URL}/api/files/upload",
                headers=headers, files=files, data={"is_public": "true"})
            if response.status_code == 200:
                file_ids.append(response.json()["file_id"])
        
        if len(file_ids) >= 2:
            response = requests.post(f"{BASE_URL}/api/files/bulk-delete",
                headers=headers, json={"file_ids": file_ids})
            assert response.status_code == 200
            data = response.json()
            assert data["deleted"] == len(file_ids)
            print(f"SUCCESS: Bulk deleted {len(file_ids)} files")


class TestFileComments:
    """File comment tests"""
    
    def test_add_and_get_comments(self):
        """Test adding and getting comments"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # Upload a file first
        files = {"file": ("TEST_comment_test.txt", b"Comment test file", "text/plain")}
        upload_response = requests.post(f"{BASE_URL}/api/files/upload",
            headers=headers, files=files, data={"is_public": "true"})
        assert upload_response.status_code == 200
        file_id = upload_response.json()["file_id"]
        
        # Add comment
        comment_response = requests.post(f"{BASE_URL}/api/files/{file_id}/comments",
            headers=headers, json={"content": "TEST_This is a test comment"})
        assert comment_response.status_code == 200
        comment_data = comment_response.json()
        assert "comment_id" in comment_data
        print("SUCCESS: Added comment to file")
        
        # Get comments
        get_response = requests.get(f"{BASE_URL}/api/files/{file_id}/comments")
        assert get_response.status_code == 200
        comments = get_response.json()
        assert len(comments) > 0
        print(f"SUCCESS: Got {len(comments)} comments")


class TestStorageAndNotifications:
    """Storage quota and notification settings tests"""
    
    def test_get_storage(self):
        """Test getting storage quota"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/storage", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "used" in data
        assert "quota" in data
        assert "count" in data
        print(f"SUCCESS: Storage - Used: {data['used']}, Quota: {data['quota']}")

    def test_get_notification_settings(self):
        """Test getting notification settings"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/settings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: Got notification settings: {data}")

    def test_update_notification_settings(self):
        """Test updating notification settings"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        response = requests.put(f"{BASE_URL}/api/notifications/settings",
            headers=headers, json={"push_enabled": True, "chat_notifications": True})
        assert response.status_code == 200
        print("SUCCESS: Updated notification settings")


class TestShareLinks:
    """Share link tests"""
    
    def test_create_and_access_share_link(self):
        """Test creating and accessing a share link"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # Upload a file
        files = {"file": ("TEST_share_test.txt", b"Share test file", "text/plain")}
        upload_response = requests.post(f"{BASE_URL}/api/files/upload",
            headers=headers, files=files, data={"is_public": "true"})
        assert upload_response.status_code == 200
        file_id = upload_response.json()["file_id"]
        
        # Create share link
        share_response = requests.post(f"{BASE_URL}/api/share",
            headers=headers, json={"file_id": file_id, "expires_hours": 24})
        assert share_response.status_code == 200
        link_id = share_response.json()["link_id"]
        print(f"SUCCESS: Created share link {link_id}")
        
        # Access share link (no auth needed)
        access_response = requests.get(f"{BASE_URL}/api/share/{link_id}")
        assert access_response.status_code == 200
        data = access_response.json()
        assert "share" in data
        assert "file" in data
        print("SUCCESS: Accessed share link")


class TestVault:
    """Secure vault tests"""
    
    def test_vault_status(self):
        """Test getting vault status"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/vault/status", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "has_vault" in data
        print(f"SUCCESS: Vault status - has_vault: {data['has_vault']}")

    def test_vault_setup_or_unlock(self):
        """Test vault setup or unlock"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        vault_password = "TestVault123"
        
        status_response = requests.get(f"{BASE_URL}/api/vault/status", headers=headers)
        has_vault = status_response.json().get("has_vault", False)
        
        if not has_vault:
            setup_response = requests.post(f"{BASE_URL}/api/vault/setup",
                headers=headers, json={"vault_password": vault_password})
            assert setup_response.status_code == 200
            print("SUCCESS: Vault setup completed")
        else:
            unlock_response = requests.post(f"{BASE_URL}/api/vault/unlock",
                headers=headers, json={"vault_password": vault_password})
            if unlock_response.status_code == 200:
                assert "vault_token" in unlock_response.json()
                print("SUCCESS: Vault unlocked")
            else:
                print(f"INFO: Vault unlock failed (different password)")


class TestSearch:
    """Search functionality tests"""
    
    def test_search_files(self):
        """Test searching for files"""
        response = requests.get(f"{BASE_URL}/api/search", params={"q": "test", "type": "files"})
        assert response.status_code == 200
        data = response.json()
        assert "files" in data
        print(f"SUCCESS: Search files returned {len(data['files'])} results")

    def test_search_accounts(self):
        """Test searching for users"""
        response = requests.get(f"{BASE_URL}/api/search", params={"q": "test", "type": "accounts"})
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        print(f"SUCCESS: Search accounts returned {len(data['users'])} results")

    def test_search_all(self):
        """Test searching all"""
        response = requests.get(f"{BASE_URL}/api/search", params={"q": "test", "type": "all"})
        assert response.status_code == 200
        data = response.json()
        assert "files" in data
        assert "users" in data
        print("SUCCESS: Search all works")


class TestProfile:
    """Profile update tests"""
    
    def test_get_me(self):
        """Test getting current user info"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        print(f"SUCCESS: Got user profile for {data['username']}")

    def test_update_profile(self):
        """Test updating profile"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.put(f"{BASE_URL}/api/users/profile",
            headers=headers, json={"display_name": "Test User One", "bio": "Test bio"})
        assert response.status_code == 200
        print("SUCCESS: Updated profile")

    def test_get_user_profile(self):
        """Test getting user profile by ID"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        user_id = me_response.json()["user_id"]
        
        profile_response = requests.get(f"{BASE_URL}/api/users/{user_id}")
        assert profile_response.status_code == 200
        print("SUCCESS: Got user profile by ID")


class TestChat:
    """Chat and messaging tests"""
    
    def test_create_chat_and_send_message(self):
        """Test creating a chat and sending messages"""
        # Login user 1
        response1 = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_1["email"], "password": TEST_USER_1["password"]
        })
        assert response1.status_code == 200
        token1 = response1.json()["token"]
        
        # Login user 2
        response2 = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_2["email"], "password": TEST_USER_2["password"]
        })
        assert response2.status_code == 200
        user2_id = response2.json()["user"]["user_id"]
        
        headers1 = {"Authorization": f"Bearer {token1}"}
        
        # Create chat
        chat_response = requests.post(f"{BASE_URL}/api/chats",
            headers=headers1, json={"participant_id": user2_id})
        assert chat_response.status_code == 200
        chat_id = chat_response.json()["chat_id"]
        print(f"SUCCESS: Created chat {chat_id}")
        
        # Send message
        send_response = requests.post(f"{BASE_URL}/api/chats/{chat_id}/messages",
            headers=headers1, json={"content": "TEST_Hello!"})
        assert send_response.status_code == 200
        print("SUCCESS: Sent message")
        
        # Get messages
        get_response = requests.get(f"{BASE_URL}/api/chats/{chat_id}/messages", headers=headers1)
        assert get_response.status_code == 200
        assert len(get_response.json()) > 0
        print("SUCCESS: Got messages")

    def test_get_chats(self):
        """Test getting user's chats"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/chats", headers=headers)
        assert response.status_code == 200
        print(f"SUCCESS: Got {len(response.json())} chats")

    def test_mark_as_read(self):
        """Test marking messages as read"""
        token = get_token(TEST_USER_1["email"], TEST_USER_1["password"])
        assert token, "Failed to get token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get chats first
        chats_response = requests.get(f"{BASE_URL}/api/chats", headers=headers)
        chats = chats_response.json()
        
        if chats:
            chat_id = chats[0]["chat_id"]
            read_response = requests.post(f"{BASE_URL}/api/chats/{chat_id}/read", headers=headers)
            assert read_response.status_code == 200
            print("SUCCESS: Marked messages as read")
        else:
            print("INFO: No chats to test read receipts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
