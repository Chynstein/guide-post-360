"""
Pytest fixtures for GuidePost360 backend tests.

This file provides shared fixtures that are automatically available to all tests
in the tests/backend directory. Run with: pytest tests/backend/ -v

To see which fixtures are available: pytest --fixtures
"""

import pytest
import json
import os
import sys
import tempfile
import shutil

# Add the project root to the path so we can import main
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from main import app as flask_app, limiter


@pytest.fixture
def app():
    """
    Create and configure a new app instance for each test.

    This fixture:
    - Sets up a temporary maps directory
    - Configures the app for testing
    - Disables rate limiting to prevent test interference
    - Cleans up after each test
    """
    # Create a temporary directory for map files
    test_maps_dir = tempfile.mkdtemp()

    # Store original MAPS_DIR
    import main
    original_maps_dir = main.MAPS_DIR

    # Configure the app for testing
    flask_app.config.update({
        'TESTING': True,
        'WTF_CSRF_ENABLED': False,
        'SECRET_KEY': 'test-secret-key',
    })

    # Disable rate limiting directly on the limiter instance
    limiter.enabled = False

    # Point to temporary maps directory
    main.MAPS_DIR = test_maps_dir

    yield flask_app

    # Cleanup: restore original MAPS_DIR, re-enable limiter, remove temp directory
    main.MAPS_DIR = original_maps_dir
    limiter.enabled = True
    shutil.rmtree(test_maps_dir, ignore_errors=True)


@pytest.fixture
def client(app):
    """
    A test client for the app.

    Usage in tests:
        def test_something(client):
            response = client.get('/')
            assert response.status_code == 200
    """
    return app.test_client()


@pytest.fixture
def runner(app):
    """A test CLI runner for the app."""
    return app.test_cli_runner()


# ============================================
# Session Fixtures (Pre-authenticated clients)
# ============================================

@pytest.fixture
def admin_client(client):
    """
    A test client logged in as admin.

    Usage:
        def test_admin_feature(admin_client):
            response = admin_client.get('/map-editor')
            assert response.status_code == 200
    """
    with client.session_transaction() as sess:
        sess['username'] = 'admin'
        sess['role'] = 'Admin'
        sess['privileges'] = ['edit_map', 'edit_textboxes', 'save', 'load', 'clear', 'zoom', 'fullscreen']
        sess['elevator_access'] = False
    return client


@pytest.fixture
def personnel_client(client):
    """
    A test client logged in as Safety Personnel.
    Personnel have view-only access (load, zoom, fullscreen).
    """
    with client.session_transaction() as sess:
        sess['username'] = 'personnel'
        sess['role'] = 'Personnel'
        sess['privileges'] = ['load', 'zoom', 'fullscreen']
        sess['elevator_access'] = False
    return client


# ============================================
# Map Data Fixtures
# ============================================

@pytest.fixture
def sample_dense_map():
    """
    A small sample map in dense format (2D array).

    Map layout (5x5):
    0 0 0 0 0
    0 3 3 3 0   (3 = walkable hallway)
    0 3 0 3 0   (0 = empty)
    0 3 3 3 0
    0 0 0 0 0
    """
    return [
        [0, 0, 0, 0, 0],
        [0, 3, 3, 3, 0],
        [0, 3, 0, 3, 0],
        [0, 3, 3, 3, 0],
        [0, 0, 0, 0, 0]
    ]


@pytest.fixture
def sample_sparse_map():
    """
    The same map as sample_dense_map but in sparse format.
    Sparse format: {"size": [height, width], "tiles": [[row, col, value], ...]}
    """
    return {
        "size": [5, 5],
        "tiles": [
            [1, 1, 3], [1, 2, 3], [1, 3, 3],
            [2, 1, 3], [2, 3, 3],
            [3, 1, 3], [3, 2, 3], [3, 3, 3]
        ],
        "textboxes": []
    }


@pytest.fixture
def sample_textboxes():
    """Sample textboxes for map data."""
    return [
        {
            "grid_x": 10,
            "grid_y": 10,
            "grid_width": 5,
            "grid_height": 3,
            "text": "Room 101\nMr. Smith",
            "font_size": 14,
            "alignment": "center",
            "vertical_alignment": "middle"
        },
        {
            "grid_x": 20,
            "grid_y": 10,
            "grid_width": 4,
            "grid_height": 2,
            "text": "Girl's Bathroom\n~Restroom",
            "font_size": 12,
            "alignment": "center",
            "vertical_alignment": "middle"
        }
    ]


@pytest.fixture
def map_with_textboxes(sample_dense_map, sample_textboxes):
    """Complete map data with textboxes."""
    return {
        "map": sample_dense_map,
        "textboxes": sample_textboxes
    }


# ============================================
# File Fixtures
# ============================================

@pytest.fixture
def saved_map_file(app, sample_sparse_map):
    """
    Create a saved map file in the test maps directory.
    Returns the filename.
    """
    import main
    filename = "test_map.json"
    filepath = os.path.join(main.MAPS_DIR, filename)

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(sample_sparse_map, f)

    return filename


@pytest.fixture
def empty_map_file(app):
    """
    Create an empty (all-zeros) map file in the test maps directory.
    Returns the filename.
    """
    import main
    filename = "empty_map.json"
    filepath = os.path.join(main.MAPS_DIR, filename)

    empty_data = {
        "size": [5, 5],
        "tiles": [],
        "textboxes": []
    }
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(empty_data, f)

    return filename


@pytest.fixture
def multiple_map_files(app, sample_sparse_map):
    """
    Create multiple map files for testing list endpoints.
    Returns list of filenames.
    """
    import main
    import time

    filenames = []
    for name in ['MapA.json', 'MapB.json', 'MapC.json']:
        filepath = os.path.join(main.MAPS_DIR, name)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(sample_sparse_map, f)
        filenames.append(name)
        time.sleep(0.05)  # Ensure different timestamps

    return filenames


# ============================================
# Login Data Fixtures
# ============================================

@pytest.fixture
def valid_admin_data():
    """Valid admin login data."""
    return {
        'role': 'Admin',
        'username': 'admin',
        'password': 'admin123',
        'staff_email': 'admin@example.com'
    }
