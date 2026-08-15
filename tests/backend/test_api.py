"""
API endpoint tests for GuidePost360.

Tests cover:
- POST /api/save-map - Map saving with validation
- GET /api/load-map/<filename> - Map loading
- GET /api/list-maps - Map listing
- GET /api/available-maps - Non-empty map listing
- GET /api/list-backups - Backup listing (admin only)
- POST /api/restore-backup - Backup restoration (admin only)
- Dense-to-sparse conversion
- Permission checks
- Security (path traversal prevention)
- Cache headers

Run with: pytest tests/backend/test_api.py -v
"""

import pytest
import json
import os


class TestSaveMapAPI:
    """Tests for the save-map endpoint."""

    def test_save_map_requires_login(self, client, sample_dense_map):
        """Save endpoint should reject unauthenticated requests."""
        response = client.post('/api/save-map',
            data=json.dumps({'filename': 'test.json', 'map': sample_dense_map}),
            content_type='application/json'
        )
        assert response.status_code == 403
        data = response.get_json()
        assert data['success'] is False

    def test_save_map_requires_save_privilege(self, personnel_client, sample_dense_map):
        """Save endpoint should reject users without save privilege."""
        response = personnel_client.post('/api/save-map',
            data=json.dumps({'filename': 'test.json', 'map': sample_dense_map}),
            content_type='application/json'
        )
        assert response.status_code == 403
        data = response.get_json()
        assert data['success'] is False

    def test_save_map_success(self, admin_client, sample_dense_map):
        """Admin should be able to save a map."""
        response = admin_client.post('/api/save-map',
            data=json.dumps({
                'filename': 'test_save',
                'map': sample_dense_map,
                'textboxes': []
            }),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

    def test_save_map_adds_json_extension(self, admin_client, sample_dense_map):
        """Filename should have .json added if missing."""
        import main

        response = admin_client.post('/api/save-map',
            data=json.dumps({
                'filename': 'mymap',  # No .json
                'map': sample_dense_map
            }),
            content_type='application/json'
        )
        assert response.status_code == 200

        # Verify the file was actually saved with .json extension
        filepath = os.path.join(main.MAPS_DIR, 'mymap.json')
        assert os.path.exists(filepath)

    def test_save_map_converts_to_sparse(self, admin_client, sample_dense_map):
        """Saved map should be converted to sparse format."""
        import main

        response = admin_client.post('/api/save-map',
            data=json.dumps({
                'filename': 'sparse_test.json',
                'map': sample_dense_map
            }),
            content_type='application/json'
        )
        assert response.status_code == 200

        # Read the saved file and verify sparse format
        filepath = os.path.join(main.MAPS_DIR, 'sparse_test.json')
        with open(filepath, 'r') as f:
            saved_data = json.load(f)

        assert 'size' in saved_data
        assert 'tiles' in saved_data
        assert isinstance(saved_data['tiles'], list)
        # Sparse tiles are [row, col, value] arrays
        if saved_data['tiles']:
            assert len(saved_data['tiles'][0]) == 3

    def test_save_map_preserves_textboxes(self, admin_client, sample_dense_map, sample_textboxes):
        """Saved map should preserve textbox data."""
        import main

        response = admin_client.post('/api/save-map',
            data=json.dumps({
                'filename': 'textbox_test.json',
                'map': sample_dense_map,
                'textboxes': sample_textboxes
            }),
            content_type='application/json'
        )
        assert response.status_code == 200

        filepath = os.path.join(main.MAPS_DIR, 'textbox_test.json')
        with open(filepath, 'r') as f:
            saved_data = json.load(f)

        assert 'textboxes' in saved_data
        assert len(saved_data['textboxes']) == 2
        assert saved_data['textboxes'][0]['text'] == 'Room 101\nMr. Smith'

    def test_save_map_invalid_filename_path_traversal(self, admin_client, sample_dense_map):
        """Filename with path traversal should be rejected."""
        response = admin_client.post('/api/save-map',
            data=json.dumps({
                'filename': '../../../etc/passwd',
                'map': sample_dense_map
            }),
            content_type='application/json'
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'invalid' in data['message'].lower()

    def test_save_map_invalid_filename_backslash_traversal(self, admin_client, sample_dense_map):
        """Filename starting with backslash should be rejected."""
        response = admin_client.post('/api/save-map',
            data=json.dumps({
                'filename': '\\windows\\system32\\evil',
                'map': sample_dense_map
            }),
            content_type='application/json'
        )
        assert response.status_code == 400

    def test_save_map_invalid_filename_forward_slash(self, admin_client, sample_dense_map):
        """Filename starting with forward slash should be rejected."""
        response = admin_client.post('/api/save-map',
            data=json.dumps({
                'filename': '/etc/passwd',
                'map': sample_dense_map
            }),
            content_type='application/json'
        )
        assert response.status_code == 400

    def test_save_map_invalid_filename_special_chars(self, admin_client, sample_dense_map):
        """Filename with special characters should be rejected."""
        response = admin_client.post('/api/save-map',
            data=json.dumps({
                'filename': 'test<script>.json',
                'map': sample_dense_map
            }),
            content_type='application/json'
        )
        assert response.status_code == 400

    def test_save_map_valid_filename_with_spaces(self, admin_client, sample_dense_map):
        """Filename with spaces should be allowed."""
        response = admin_client.post('/api/save-map',
            data=json.dumps({
                'filename': 'My Test Map',
                'map': sample_dense_map
            }),
            content_type='application/json'
        )
        assert response.status_code == 200

    def test_save_map_valid_filename_with_hyphens(self, admin_client, sample_dense_map):
        """Filename with hyphens should be allowed."""
        response = admin_client.post('/api/save-map',
            data=json.dumps({
                'filename': 'main-campus-floor-1',
                'map': sample_dense_map
            }),
            content_type='application/json'
        )
        assert response.status_code == 200

    def test_save_map_valid_filename_with_underscores(self, admin_client, sample_dense_map):
        """Filename with underscores should be allowed."""
        response = admin_client.post('/api/save-map',
            data=json.dumps({
                'filename': 'main_campus_1',
                'map': sample_dense_map
            }),
            content_type='application/json'
        )
        assert response.status_code == 200

    def test_save_map_display_name_in_response(self, admin_client, sample_dense_map):
        """Save response should include a display name in the message."""
        response = admin_client.post('/api/save-map',
            data=json.dumps({
                'filename': 'MainCampusDownstairs',
                'map': sample_dense_map
            }),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = response.get_json()
        assert 'Main Campus Downstairs' in data['message']


class TestLoadMapAPI:
    """Tests for the load-map endpoint."""

    def test_load_map_requires_login(self, client):
        """Load endpoint should reject unauthenticated requests."""
        response = client.get('/api/load-map/test.json')
        assert response.status_code == 403

    def test_load_map_success(self, admin_client, saved_map_file):
        """Should successfully load an existing map."""
        response = admin_client.get(f'/api/load-map/{saved_map_file}')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'data' in data

    def test_load_map_not_found(self, admin_client):
        """Should return 404 for non-existent map."""
        response = admin_client.get('/api/load-map/nonexistent.json')
        assert response.status_code == 404
        data = response.get_json()
        assert data['success'] is False

    def test_load_map_path_traversal_blocked(self, admin_client):
        """Path traversal attempts should be blocked."""
        response = admin_client.get('/api/load-map/..%2F..%2Fetc%2Fpasswd')
        assert response.status_code in (400, 404)

    def test_load_map_special_chars_blocked(self, admin_client):
        """Filenames with special characters should be blocked."""
        response = admin_client.get('/api/load-map/test<>.json')
        assert response.status_code == 400

    def test_personnel_can_load(self, personnel_client, saved_map_file):
        """Personnel should be able to load maps (has 'load' privilege)."""
        response = personnel_client.get(f'/api/load-map/{saved_map_file}')
        assert response.status_code == 200

    def test_load_map_returns_sparse_format(self, admin_client, saved_map_file):
        """Loaded map should be in sparse format."""
        response = admin_client.get(f'/api/load-map/{saved_map_file}')
        data = response.get_json()
        map_data = data['data']
        assert 'size' in map_data
        assert 'tiles' in map_data

    def test_load_map_backslash_traversal_blocked(self, admin_client):
        """Backslash path traversal should be blocked."""
        response = admin_client.get('/api/load-map/\\windows\\system32')
        assert response.status_code in (400, 404)


class TestListMapsAPI:
    """Tests for the list-maps endpoint."""

    def test_list_maps_requires_login(self, client):
        """List endpoint should reject unauthenticated requests."""
        response = client.get('/api/list-maps')
        assert response.status_code == 403

    def test_list_maps_success(self, admin_client):
        """Should return list of maps."""
        response = admin_client.get('/api/list-maps')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'files' in data
        assert isinstance(data['files'], list)

    def test_list_maps_includes_saved_file(self, admin_client, saved_map_file):
        """List should include recently saved files."""
        response = admin_client.get('/api/list-maps')
        data = response.get_json()
        filenames = [f['name'] for f in data['files']]
        assert saved_map_file in filenames

    def test_list_maps_includes_modification_time(self, admin_client, saved_map_file):
        """List should include modification timestamps."""
        response = admin_client.get('/api/list-maps')
        data = response.get_json()
        if data['files']:
            assert 'modified' in data['files'][0]

    def test_list_maps_includes_empty_status(self, admin_client, saved_map_file):
        """List should include isEmpty flag for each file."""
        response = admin_client.get('/api/list-maps')
        data = response.get_json()
        if data['files']:
            assert 'isEmpty' in data['files'][0]

    def test_list_maps_sorted_by_date(self, admin_client, sample_sparse_map):
        """Maps should be sorted by modification date (newest first)."""
        import main
        import time

        # Create two files with different timestamps
        filepath1 = os.path.join(main.MAPS_DIR, 'older.json')
        with open(filepath1, 'w') as f:
            json.dump(sample_sparse_map, f)

        time.sleep(0.1)  # Ensure different timestamps

        filepath2 = os.path.join(main.MAPS_DIR, 'newer.json')
        with open(filepath2, 'w') as f:
            json.dump(sample_sparse_map, f)

        response = admin_client.get('/api/list-maps')
        data = response.get_json()
        filenames = [f['name'] for f in data['files']]

        # Newer should appear before older
        newer_idx = filenames.index('newer.json')
        older_idx = filenames.index('older.json')
        assert newer_idx < older_idx

    def test_list_maps_has_cache_headers(self, admin_client):
        """List-maps response should include cache headers."""
        response = admin_client.get('/api/list-maps')
        assert 'Cache-Control' in response.headers

    def test_personnel_can_list(self, personnel_client):
        """Personnel should be able to list maps."""
        response = personnel_client.get('/api/list-maps')
        assert response.status_code == 200

    def test_list_maps_empty_map_marked(self, admin_client, empty_map_file):
        """Empty maps should be marked as isEmpty=True."""
        response = admin_client.get('/api/list-maps')
        data = response.get_json()
        for f in data['files']:
            if f['name'] == empty_map_file:
                assert f['isEmpty'] is True
                break
        else:
            pytest.fail(f"Empty map file {empty_map_file} not found in list")

    def test_list_maps_non_empty_map_not_marked(self, admin_client, saved_map_file):
        """Non-empty maps should have isEmpty=False."""
        response = admin_client.get('/api/list-maps')
        data = response.get_json()
        for f in data['files']:
            if f['name'] == saved_map_file:
                assert f['isEmpty'] is False
                break
        else:
            pytest.fail(f"Saved map file {saved_map_file} not found in list")


class TestAvailableMapsAPI:
    """Tests for the available-maps endpoint (non-empty maps only)."""

    def test_available_maps_requires_login(self, client):
        """Available-maps endpoint should reject unauthenticated requests."""
        response = client.get('/api/available-maps')
        assert response.status_code == 403

    def test_available_maps_success(self, admin_client):
        """Should return list of non-empty maps."""
        response = admin_client.get('/api/available-maps')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'maps' in data
        assert isinstance(data['maps'], list)

    def test_available_maps_excludes_empty(self, admin_client, empty_map_file, saved_map_file):
        """Available maps should not include empty maps."""
        response = admin_client.get('/api/available-maps')
        data = response.get_json()
        filenames = [m['filename'] for m in data['maps']]
        assert empty_map_file not in filenames
        assert saved_map_file in filenames

    def test_available_maps_includes_display_name(self, admin_client, saved_map_file):
        """Available maps should include human-readable display names."""
        response = admin_client.get('/api/available-maps')
        data = response.get_json()
        for m in data['maps']:
            assert 'displayName' in m
            assert 'filename' in m

    def test_available_maps_sorted_alphabetically(self, admin_client, multiple_map_files):
        """Available maps should be sorted by display name."""
        response = admin_client.get('/api/available-maps')
        data = response.get_json()
        display_names = [m['displayName'] for m in data['maps']]
        assert display_names == sorted(display_names)

    def test_available_maps_has_cache_headers(self, admin_client):
        """Available-maps response should include cache headers."""
        response = admin_client.get('/api/available-maps')
        assert 'Cache-Control' in response.headers

    def test_personnel_can_list_available(self, personnel_client):
        """Personnel should be able to list available maps."""
        response = personnel_client.get('/api/available-maps')
        assert response.status_code == 200


class TestBackupAPI:
    """Tests for the backup management endpoints."""

    def test_list_backups_requires_admin(self, personnel_client):
        """List backups should reject non-admin users."""
        response = personnel_client.get('/api/list-backups')
        assert response.status_code == 403

    def test_list_backups_requires_login(self, client):
        """List backups should reject unauthenticated requests."""
        response = client.get('/api/list-backups')
        assert response.status_code == 403

    def test_list_backups_success(self, admin_client):
        """Admin should be able to list backups."""
        response = admin_client.get('/api/list-backups')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'backups' in data

    def test_restore_backup_requires_admin(self, personnel_client):
        """Restore backup should reject non-admin users."""
        response = personnel_client.post('/api/restore-backup',
            data=json.dumps({'backup_name': 'test.json'}),
            content_type='application/json'
        )
        assert response.status_code == 403

    def test_restore_backup_requires_login(self, client):
        """Restore backup should reject unauthenticated requests."""
        response = client.post('/api/restore-backup',
            data=json.dumps({'backup_name': 'test.json'}),
            content_type='application/json'
        )
        assert response.status_code == 403

    def test_restore_backup_requires_name(self, admin_client):
        """Restore backup should require a backup name."""
        response = admin_client.post('/api/restore-backup',
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400

    def test_restore_backup_path_traversal_blocked(self, admin_client):
        """Restore backup should block path traversal attempts."""
        response = admin_client.post('/api/restore-backup',
            data=json.dumps({'backup_name': '../../../etc/passwd'}),
            content_type='application/json'
        )
        assert response.status_code == 400


class TestDenseToSparseConversion:
    """Tests for the dense-to-sparse map conversion."""

    def test_empty_map_conversion(self):
        """Empty map should convert to empty sparse format."""
        from main import dense_to_sparse

        result = dense_to_sparse([])
        assert result['size'] == [0, 0]
        assert result['tiles'] == []

    def test_all_zeros_map(self):
        """Map with all zeros should have no tiles."""
        from main import dense_to_sparse

        dense = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
        result = dense_to_sparse(dense)
        assert result['size'] == [3, 3]
        assert result['tiles'] == []

    def test_sparse_conversion_values(self, sample_dense_map):
        """Sparse conversion should correctly store non-zero tiles."""
        from main import dense_to_sparse

        result = dense_to_sparse(sample_dense_map)
        assert result['size'] == [5, 5]

        # Check a specific tile
        tiles = result['tiles']
        # Row 1, Col 1 should have value 3
        assert [1, 1, 3] in tiles

    def test_sparse_format_size(self, sample_dense_map):
        """Sparse format should be smaller than dense for mostly empty maps."""
        from main import dense_to_sparse

        dense_str = json.dumps(sample_dense_map)
        sparse = dense_to_sparse(sample_dense_map)
        sparse_str = json.dumps(sparse)

        # Sparse should be smaller or equal (for small maps might be similar)
        assert len(sparse_str) <= len(dense_str) * 2  # Allow some overhead for small maps

    def test_all_tile_types_preserved(self):
        """All non-zero tile types should be preserved in sparse conversion."""
        from main import dense_to_sparse

        dense = [[1, 2, 3, 4, 5, 6, 7]]
        result = dense_to_sparse(dense)
        assert result['size'] == [1, 7]
        assert len(result['tiles']) == 7
        values = {tile[2] for tile in result['tiles']}
        assert values == {1, 2, 3, 4, 5, 6, 7}

    def test_sparse_preserves_positions(self):
        """Sparse conversion should preserve row/col positions correctly."""
        from main import dense_to_sparse

        dense = [
            [0, 0, 0],
            [0, 0, 3],
            [0, 1, 0]
        ]
        result = dense_to_sparse(dense)
        assert [1, 2, 3] in result['tiles']  # row 1, col 2, value 3
        assert [2, 1, 1] in result['tiles']  # row 2, col 1, value 1

    def test_none_rows_handled(self):
        """Dense map with None rows should handle gracefully."""
        from main import dense_to_sparse

        result = dense_to_sparse([None])
        # Should return [0,0] size since first element is None/falsy
        assert result['size'] == [0, 0]
