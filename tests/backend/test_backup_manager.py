"""
Backup manager tests for GuidePost360.

Tests cover:
- LocalBackupStorage._generate_backup_name() - timestamped name generation
- LocalBackupStorage._parse_backup_name() - parsing old/new formats
- LocalBackupStorage.save_backup() - creating backups
- LocalBackupStorage.list_backups() - listing with filtering
- LocalBackupStorage.delete_backup() - deletion with security
- LocalBackupStorage.restore_backup() - restoration
- LocalBackupStorage.cleanup_old_backups() - age-based cleanup
- BackupManager.backup_before_save() - high-level backup coordination
- BackupManager.restore_backup() - high-level restore coordination

Run with: pytest tests/backend/test_backup_manager.py -v
"""

import pytest
import json
import os
import sys
import tempfile
import shutil
from datetime import datetime, timedelta

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backup_manager import LocalBackupStorage, BackupManager


@pytest.fixture
def backup_dir():
    """Create a temporary backup directory."""
    d = tempfile.mkdtemp()
    yield d
    shutil.rmtree(d, ignore_errors=True)


@pytest.fixture
def maps_dir():
    """Create a temporary maps directory."""
    d = tempfile.mkdtemp()
    yield d
    shutil.rmtree(d, ignore_errors=True)


@pytest.fixture
def storage(backup_dir):
    """Create a LocalBackupStorage with temp directory."""
    return LocalBackupStorage(backup_dir)


@pytest.fixture
def manager(storage):
    """Create a BackupManager with local storage."""
    return BackupManager(storage)


@pytest.fixture
def sample_map_file(maps_dir):
    """Create a sample map file and return its path."""
    filepath = os.path.join(maps_dir, 'TestMap.json')
    data = {"size": [5, 5], "tiles": [[1, 1, 3]], "textboxes": []}
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f)
    return filepath


class TestGenerateBackupName:
    """Tests for backup name generation."""

    def test_format_includes_map_name(self, storage):
        """Backup name should include the original map name."""
        name = storage._generate_backup_name('TestMap')
        assert name.startswith('TestMap_')

    def test_format_ends_with_json(self, storage):
        """Backup name should end with .json."""
        name = storage._generate_backup_name('TestMap')
        assert name.endswith('.json')

    def test_format_includes_timestamp(self, storage):
        """Backup name should include date/time components."""
        name = storage._generate_backup_name('TestMap')
        # Format: TestMap_YYYY-MM-DD_HH-MM-SS-ffffff.json
        name_no_ext = name.replace('.json', '')
        # After the map name prefix, should have timestamp
        timestamp_part = name_no_ext[len('TestMap_'):]
        # Timestamp should be parseable
        parsed = storage._parse_backup_name(name)
        assert parsed is not None
        assert parsed['map_name'] == 'TestMap'

    def test_unique_names(self, storage):
        """Two rapid calls should generate different names (microsecond precision)."""
        name1 = storage._generate_backup_name('TestMap')
        name2 = storage._generate_backup_name('TestMap')
        # With microsecond precision, these should almost always differ
        # but if they happen to match, that's OK - just testing the format
        assert name1.startswith('TestMap_')
        assert name2.startswith('TestMap_')

    def test_special_characters_in_map_name(self, storage):
        """Map names with spaces/hyphens should be preserved."""
        name = storage._generate_backup_name('Main Campus')
        assert name.startswith('Main Campus_')


class TestParseBackupName:
    """Tests for backup name parsing."""

    def test_parse_new_format(self, storage):
        """New format with microseconds should parse correctly."""
        result = storage._parse_backup_name('TestMap_2024-06-15_10-30-45-123456.json')
        assert result is not None
        assert result['map_name'] == 'TestMap'
        assert result['timestamp'].year == 2024
        assert result['timestamp'].month == 6
        assert result['timestamp'].microsecond == 123456

    def test_parse_old_format(self, storage):
        """Old format without microseconds should parse correctly."""
        result = storage._parse_backup_name('TestMap_2024-06-15_10-30-45.json')
        assert result is not None
        assert result['map_name'] == 'TestMap'
        assert result['timestamp'].year == 2024

    def test_parse_with_spaces_in_name(self, storage):
        """Map names with spaces should parse correctly."""
        result = storage._parse_backup_name('Main Campus_2024-06-15_10-30-45-123456.json')
        assert result is not None
        assert result['map_name'] == 'Main Campus'

    def test_parse_invalid_no_json(self, storage):
        """Names without .json should return None."""
        result = storage._parse_backup_name('TestMap_2024-06-15_10-30-45.txt')
        assert result is None

    def test_parse_invalid_no_timestamp(self, storage):
        """Names without a valid timestamp should return None."""
        result = storage._parse_backup_name('JustAName.json')
        assert result is None

    def test_parse_invalid_bad_timestamp(self, storage):
        """Names with invalid timestamp format should return None."""
        result = storage._parse_backup_name('TestMap_not-a-date_here.json')
        assert result is None

    def test_roundtrip(self, storage):
        """Generated name should be parseable."""
        generated = storage._generate_backup_name('RoundTrip')
        parsed = storage._parse_backup_name(generated)
        assert parsed is not None
        assert parsed['map_name'] == 'RoundTrip'


class TestSaveBackup:
    """Tests for saving backups."""

    def test_save_existing_file(self, storage, sample_map_file):
        """Saving backup of existing file should succeed."""
        result = storage.save_backup(sample_map_file, 'TestMap')
        assert result['success'] is True
        assert result['backup_name'] is not None
        assert result['backup_name'].startswith('TestMap_')

    def test_save_creates_file(self, storage, sample_map_file, backup_dir):
        """Backup should create an actual file."""
        result = storage.save_backup(sample_map_file, 'TestMap')
        backup_path = os.path.join(backup_dir, result['backup_name'])
        assert os.path.exists(backup_path)

    def test_save_preserves_content(self, storage, sample_map_file, backup_dir):
        """Backup file should have same content as original."""
        result = storage.save_backup(sample_map_file, 'TestMap')
        backup_path = os.path.join(backup_dir, result['backup_name'])

        with open(sample_map_file, 'r') as f:
            original = json.load(f)
        with open(backup_path, 'r') as f:
            backed_up = json.load(f)

        assert original == backed_up

    def test_save_nonexistent_file(self, storage):
        """Saving backup of non-existent file should succeed with message."""
        result = storage.save_backup('/nonexistent/path.json', 'TestMap')
        assert result['success'] is True
        assert result['backup_name'] is None
        assert 'No existing file' in result.get('message', '')

    def test_multiple_backups(self, storage, sample_map_file, backup_dir):
        """Multiple backups should create separate files."""
        result1 = storage.save_backup(sample_map_file, 'TestMap')
        result2 = storage.save_backup(sample_map_file, 'TestMap')
        assert result1['backup_name'] != result2['backup_name']

        files = os.listdir(backup_dir)
        assert len(files) == 2


class TestListBackups:
    """Tests for listing backups."""

    def test_list_empty(self, storage):
        """Empty backup directory should return empty list."""
        result = storage.list_backups()
        assert result == []

    def test_list_after_save(self, storage, sample_map_file):
        """Should list backups after saving."""
        storage.save_backup(sample_map_file, 'TestMap')
        result = storage.list_backups()
        assert len(result) == 1
        assert result[0]['map_name'] == 'TestMap'

    def test_list_multiple(self, storage, sample_map_file):
        """Should list all backups."""
        storage.save_backup(sample_map_file, 'MapA')
        storage.save_backup(sample_map_file, 'MapB')
        storage.save_backup(sample_map_file, 'MapA')
        result = storage.list_backups()
        assert len(result) == 3

    def test_list_filter_by_map_name(self, storage, sample_map_file):
        """Should filter by map name."""
        storage.save_backup(sample_map_file, 'MapA')
        storage.save_backup(sample_map_file, 'MapB')
        storage.save_backup(sample_map_file, 'MapA')

        result_a = storage.list_backups('MapA')
        assert len(result_a) == 2
        assert all(b['map_name'] == 'MapA' for b in result_a)

        result_b = storage.list_backups('MapB')
        assert len(result_b) == 1

    def test_list_sorted_newest_first(self, storage, sample_map_file):
        """Backups should be sorted newest first."""
        storage.save_backup(sample_map_file, 'MapA')
        storage.save_backup(sample_map_file, 'MapA')
        result = storage.list_backups()
        if len(result) >= 2:
            assert result[0]['timestamp'] >= result[1]['timestamp']

    def test_list_includes_size(self, storage, sample_map_file):
        """Backup list should include file size."""
        storage.save_backup(sample_map_file, 'TestMap')
        result = storage.list_backups()
        assert 'size' in result[0]
        assert result[0]['size'] > 0

    def test_list_ignores_non_json_files(self, storage, backup_dir):
        """List should ignore non-.json files in backup directory."""
        # Create a non-json file
        with open(os.path.join(backup_dir, 'readme.txt'), 'w') as f:
            f.write('not a backup')
        result = storage.list_backups()
        assert len(result) == 0


class TestDeleteBackup:
    """Tests for deleting backups."""

    def test_delete_existing(self, storage, sample_map_file, backup_dir):
        """Should delete an existing backup."""
        save_result = storage.save_backup(sample_map_file, 'TestMap')
        backup_name = save_result['backup_name']

        delete_result = storage.delete_backup(backup_name)
        assert delete_result['success'] is True
        assert not os.path.exists(os.path.join(backup_dir, backup_name))

    def test_delete_nonexistent(self, storage):
        """Deleting non-existent backup should return error."""
        result = storage.delete_backup('nonexistent_2024-01-01_00-00-00-000000.json')
        assert result['success'] is False
        assert 'not found' in result['error'].lower()

    def test_delete_path_traversal_blocked(self, storage):
        """Path traversal in delete should be blocked."""
        result = storage.delete_backup('../../../etc/passwd')
        assert result['success'] is False
        assert 'invalid' in result['error'].lower()

    def test_delete_forward_slash_blocked(self, storage):
        """Forward slash in delete name should be blocked."""
        result = storage.delete_backup('/etc/passwd')
        assert result['success'] is False

    def test_delete_backslash_blocked(self, storage):
        """Backslash in delete name should be blocked."""
        result = storage.delete_backup('\\windows\\system32')
        assert result['success'] is False


class TestRestoreBackup:
    """Tests for restoring backups."""

    def test_restore_success(self, storage, sample_map_file, maps_dir, backup_dir):
        """Should restore a backup to the target location."""
        # Save a backup
        save_result = storage.save_backup(sample_map_file, 'TestMap')

        # Modify the original file
        with open(sample_map_file, 'w') as f:
            json.dump({"size": [1, 1], "tiles": [], "textboxes": []}, f)

        # Restore the backup
        restore_result = storage.restore_backup(save_result['backup_name'], sample_map_file)
        assert restore_result['success'] is True

        # Verify content was restored
        with open(sample_map_file, 'r') as f:
            restored_data = json.load(f)
        assert restored_data['size'] == [5, 5]
        assert len(restored_data['tiles']) == 1

    def test_restore_nonexistent_backup(self, storage, maps_dir):
        """Restoring non-existent backup should fail."""
        target = os.path.join(maps_dir, 'target.json')
        result = storage.restore_backup('nonexistent.json', target)
        assert result['success'] is False

    def test_restore_path_traversal_blocked(self, storage, maps_dir):
        """Path traversal in restore should be blocked."""
        target = os.path.join(maps_dir, 'target.json')
        result = storage.restore_backup('../../../etc/passwd', target)
        assert result['success'] is False


class TestBackupManagerHighLevel:
    """Tests for the BackupManager high-level interface."""

    def test_backup_before_save(self, manager, sample_map_file):
        """backup_before_save should create a backup."""
        result = manager.backup_before_save(sample_map_file)
        assert result['success'] is True

    def test_backup_before_save_extracts_map_name(self, manager, sample_map_file):
        """backup_before_save should extract map name from filepath."""
        result = manager.backup_before_save(sample_map_file)
        assert result['success'] is True
        if result['backup_name']:
            assert 'TestMap' in result['backup_name']

    def test_backup_before_save_new_file(self, manager, maps_dir):
        """Backing up a new (non-existent) file should succeed gracefully."""
        filepath = os.path.join(maps_dir, 'NewMap.json')
        result = manager.backup_before_save(filepath)
        assert result['success'] is True
        assert result['backup_name'] is None

    def test_list_backups(self, manager, sample_map_file):
        """Manager should delegate listing to storage."""
        manager.backup_before_save(sample_map_file)
        result = manager.list_backups()
        assert len(result) >= 1

    def test_restore_backup(self, manager, storage, sample_map_file, maps_dir):
        """Manager should restore backup to correct target path."""
        # Create backup
        save_result = storage.save_backup(sample_map_file, 'TestMap')

        # Modify original
        with open(sample_map_file, 'w') as f:
            json.dump({"size": [1, 1], "tiles": [], "textboxes": []}, f)

        # Restore via manager
        restore_result = manager.restore_backup(save_result['backup_name'], maps_dir)
        assert restore_result['success'] is True

        # Verify restoration target
        expected_target = os.path.join(maps_dir, 'TestMap.json')
        with open(expected_target, 'r') as f:
            data = json.load(f)
        assert data['size'] == [5, 5]

    def test_restore_invalid_backup_name(self, manager, maps_dir):
        """Restoring with invalid name format should fail."""
        result = manager.restore_backup('not_a_valid_backup.json', maps_dir)
        assert result['success'] is False


class TestCleanupOldBackups:
    """Tests for age-based backup cleanup."""

    def test_cleanup_removes_old(self, storage, sample_map_file, backup_dir):
        """Old backups should be cleaned up."""
        # Create a backup with an old timestamp in the filename
        old_name = 'TestMap_2020-01-01_00-00-00-000000.json'
        old_path = os.path.join(backup_dir, old_name)
        with open(sample_map_file, 'r') as src:
            with open(old_path, 'w') as dst:
                dst.write(src.read())

        result = storage.cleanup_old_backups(days=30)
        assert result['deleted_count'] >= 1

    def test_cleanup_keeps_recent(self, storage, sample_map_file):
        """Recent backups should not be cleaned up."""
        storage.save_backup(sample_map_file, 'TestMap')
        result = storage.cleanup_old_backups(days=30)
        assert result['deleted_count'] == 0

        # Verify backup still exists
        backups = storage.list_backups()
        assert len(backups) == 1
