"""
Authentication tests for GuidePost360.

Tests cover:
- Login page rendering
- Admin login (success/failure)
- Personnel login (direct access, no credentials)
- Elevator access preference
- Session management
- Logout
- Protected routes
- Role-based privileges

Run with: pytest tests/backend/test_auth.py -v
"""

import pytest


class TestLoginPage:
    """Tests for the login page rendering."""

    def test_login_page_loads(self, client):
        """The login page should load successfully."""
        response = client.get('/')
        assert response.status_code == 200

    def test_login_page_has_correct_title(self, client):
        """The login page should have GuidePost360 in the title."""
        response = client.get('/')
        html = response.data.decode('utf-8')
        assert 'GuidePost360' in html

    def test_login_page_has_admin_option(self, client):
        """The login page should have an Admin button."""
        response = client.get('/')
        html = response.data.decode('utf-8').lower()
        assert 'admin' in html

    def test_login_page_has_personnel_option(self, client):
        """The login page should have a Safety Personnel option."""
        response = client.get('/')
        html = response.data.decode('utf-8').lower()
        assert 'personnel' in html

    def test_login_page_has_admin_form(self, client):
        """The login page should contain the admin login form."""
        response = client.get('/')
        html = response.data.decode('utf-8')
        assert 'id="admin-login"' in html or 'id="username"' in html

    def test_login_page_has_personnel_form(self, client):
        """The login page should have a personnel direct-access form."""
        response = client.get('/')
        html = response.data.decode('utf-8')
        assert 'name="role" value="Personnel"' in html

    def test_login_page_has_theme_toggle(self, client):
        """The login page should have a theme toggle button."""
        response = client.get('/')
        html = response.data.decode('utf-8')
        assert 'loginThemeToggle' in html

    def test_login_page_has_language_toggle(self, client):
        """The login page should have a language toggle button."""
        response = client.get('/')
        html = response.data.decode('utf-8')
        assert 'toggleLanguage' in html


class TestAdminLogin:
    """Tests for admin authentication."""

    def test_admin_login_success(self, client, valid_admin_data):
        """Admin with correct credentials should redirect to map editor."""
        response = client.post('/login', data=valid_admin_data, follow_redirects=False)
        assert response.status_code == 302
        assert 'map-editor' in response.location

    def test_admin_login_sets_session(self, client, valid_admin_data):
        """Admin login should set correct session variables."""
        client.post('/login', data=valid_admin_data)
        with client.session_transaction() as sess:
            assert sess.get('username') == 'admin'
            assert sess.get('role') == 'Admin'
            assert 'edit_map' in sess.get('privileges', [])
            assert 'save' in sess.get('privileges', [])
            assert 'load' in sess.get('privileges', [])

    def test_admin_login_saves_email(self, client, valid_admin_data):
        """Admin login should save the staff email in session."""
        client.post('/login', data=valid_admin_data)
        with client.session_transaction() as sess:
            assert sess.get('email') == 'admin@example.com'

    def test_admin_login_wrong_password(self, client):
        """Admin with wrong password should be rejected."""
        response = client.post('/login', data={
            'role': 'Admin',
            'username': 'admin',
            'password': 'wrongpassword',
            'staff_email': 'admin@example.com'
        }, follow_redirects=True)
        html = response.data.decode('utf-8').lower()
        assert 'invalid' in html or 'flash.invalidcredentials' in html

    def test_admin_login_wrong_username(self, client):
        """Non-existent admin username should be rejected."""
        response = client.post('/login', data={
            'role': 'Admin',
            'username': 'notadmin',
            'password': 'admin123',
            'staff_email': 'admin@example.com'
        }, follow_redirects=True)
        html = response.data.decode('utf-8').lower()
        assert 'invalid' in html or 'flash.invalidcredentials' in html

    def test_admin_login_empty_credentials(self, client):
        """Empty username/password should fail authentication."""
        response = client.post('/login', data={
            'role': 'Admin',
            'username': '',
            'password': '',
            'staff_email': ''
        }, follow_redirects=False)
        # Should not redirect to map-editor
        if response.status_code == 302:
            assert 'map-editor' not in response.location
        else:
            assert response.status_code == 200

    def test_admin_login_shows_form_on_failure(self, client):
        """Failed admin login should re-show the admin form."""
        response = client.post('/login', data={
            'role': 'Admin',
            'username': 'admin',
            'password': 'wrong',
            'staff_email': 'admin@example.com'
        }, follow_redirects=True)
        html = response.data.decode('utf-8')
        assert 'admin-login' in html

    def test_admin_has_all_privileges(self, client, valid_admin_data):
        """Admin should have all edit and management privileges."""
        client.post('/login', data=valid_admin_data)
        with client.session_transaction() as sess:
            privileges = sess.get('privileges', [])
            for priv in ['edit_map', 'edit_textboxes', 'save', 'load', 'clear', 'zoom', 'fullscreen']:
                assert priv in privileges, f"Admin missing privilege: {priv}"


class TestPersonnelLogin:
    """Tests for Safety Personnel authentication (direct access)."""

    def test_personnel_login_success(self, client):
        """Personnel should be able to login without credentials."""
        response = client.post('/login', data={
            'role': 'Personnel'
        }, follow_redirects=False)
        assert response.status_code == 302
        assert 'map-editor' in response.location

    def test_personnel_login_sets_session(self, client):
        """Personnel login should set correct session variables."""
        client.post('/login', data={'role': 'Personnel'})
        with client.session_transaction() as sess:
            assert sess.get('username') == 'personnel'
            assert sess.get('role') == 'Personnel'

    def test_personnel_has_limited_privileges(self, client):
        """Personnel should have view-only privileges (no save/edit)."""
        client.post('/login', data={'role': 'Personnel'})
        with client.session_transaction() as sess:
            privileges = sess.get('privileges', [])
            assert 'load' in privileges
            assert 'zoom' in privileges
            assert 'fullscreen' in privileges
            assert 'save' not in privileges
            assert 'edit_map' not in privileges
            assert 'edit_textboxes' not in privileges
            assert 'clear' not in privileges

    def test_personnel_cannot_save(self, personnel_client, sample_dense_map):
        """Personnel should not be able to save maps."""
        import json
        response = personnel_client.post('/api/save-map',
            data=json.dumps({'filename': 'test.json', 'map': sample_dense_map}),
            content_type='application/json'
        )
        assert response.status_code == 403

    def test_personnel_can_load(self, personnel_client, saved_map_file):
        """Personnel should be able to load maps."""
        response = personnel_client.get(f'/api/load-map/{saved_map_file}')
        assert response.status_code == 200

    def test_personnel_can_list_maps(self, personnel_client):
        """Personnel should be able to list maps."""
        response = personnel_client.get('/api/list-maps')
        assert response.status_code == 200


class TestElevatorAccess:
    """Tests for elevator access preference."""

    def test_admin_elevator_access_saved_in_session(self, client, valid_admin_data):
        """Admin elevator access preference should be saved in session."""
        data = valid_admin_data.copy()
        data['elevator_access'] = '1'
        client.post('/login', data=data)
        with client.session_transaction() as sess:
            assert sess.get('elevator_access') is True

    def test_admin_no_elevator_access_default(self, client, valid_admin_data):
        """Elevator access should default to False if not checked."""
        client.post('/login', data=valid_admin_data)
        with client.session_transaction() as sess:
            assert sess.get('elevator_access') is False

    def test_personnel_elevator_access_saved(self, client):
        """Personnel elevator access preference should be saved in session."""
        client.post('/login', data={
            'role': 'Personnel',
            'elevator_access': '1'
        })
        with client.session_transaction() as sess:
            assert sess.get('elevator_access') is True

    def test_personnel_no_elevator_access_default(self, client):
        """Personnel elevator access should default to False."""
        client.post('/login', data={
            'role': 'Personnel'
        })
        with client.session_transaction() as sess:
            assert sess.get('elevator_access') is False


class TestLogout:
    """Tests for logout functionality."""

    def test_logout_clears_session(self, admin_client):
        """Logout should clear all session data."""
        response = admin_client.get('/logout', follow_redirects=True)
        assert response.status_code == 200
        with admin_client.session_transaction() as sess:
            assert 'username' not in sess
            assert 'role' not in sess

    def test_logout_redirects_to_login(self, admin_client):
        """Logout should redirect to login page."""
        response = admin_client.get('/logout', follow_redirects=False)
        assert response.status_code == 302

    def test_logout_flashes_message(self, admin_client):
        """Logout should flash a logged out message."""
        response = admin_client.get('/logout', follow_redirects=True)
        html = response.data.decode('utf-8')
        assert 'flash.loggedOut' in html or 'logged out' in html.lower()


class TestProtectedRoutes:
    """Tests for protected route access."""

    def test_map_editor_requires_login(self, client):
        """Map editor should redirect to login if not authenticated."""
        response = client.get('/map-editor', follow_redirects=False)
        assert response.status_code == 302

    def test_map_editor_accessible_when_logged_in(self, admin_client):
        """Map editor should be accessible when logged in as admin."""
        response = admin_client.get('/map-editor')
        assert response.status_code == 200

    def test_map_editor_accessible_for_personnel(self, personnel_client):
        """Map editor should be accessible when logged in as personnel."""
        response = personnel_client.get('/map-editor')
        assert response.status_code == 200

    def test_map_editor_passes_user_data(self, admin_client):
        """Map editor should pass username and role to template."""
        response = admin_client.get('/map-editor')
        html = response.data.decode('utf-8')
        assert 'admin' in html.lower()

    def test_how_to_guide_accessible_without_login(self, client):
        """How-To Guide should be accessible without authentication."""
        response = client.get('/how-to-guide')
        assert response.status_code == 200


class TestSessionSecurity:
    """Tests for session security measures."""

    def test_session_cleared_on_login(self, client, valid_admin_data):
        """Login should clear any existing session (prevent fixation)."""
        # Set a fake session value
        with client.session_transaction() as sess:
            sess['fake_key'] = 'should_be_cleared'

        # Login
        client.post('/login', data=valid_admin_data)

        # Old session data should be gone
        with client.session_transaction() as sess:
            assert 'fake_key' not in sess
            assert sess.get('username') == 'admin'

    def test_personnel_session_cleared_on_login(self, client):
        """Personnel login should also clear existing session."""
        with client.session_transaction() as sess:
            sess['fake_key'] = 'should_be_cleared'

        client.post('/login', data={'role': 'Personnel'})

        with client.session_transaction() as sess:
            assert 'fake_key' not in sess
            assert sess.get('username') == 'personnel'
