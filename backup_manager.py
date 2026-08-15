"""
Backup Manager for Map Files

This module provides an abstraction layer for backing up map files.
Currently uses local filesystem storage, but designed to be easily
swapped to cloud storage (S3, GCS, etc.) in production.

To switch to cloud storage later:
1. Create a new class that inherits from BackupStorage (e.g., S3BackupStorage)
2. Implement the required methods (save_backup, list_backups, delete_backup)
3. Change the backup_manager initialization in main.py to use the new class
"""

from abc import ABC, abstractmethod
from datetime import datetime
import os
import shutil
import json


class BackupStorage(ABC):
    """Abstract base class for backup storage backends.

    Implement this interface to add new storage backends (S3, GCS, etc.)
    """

    @abstractmethod
    def save_backup(self, source_filepath: str, map_name: str) -> dict:
        """
        Save a backup of the map file.

        Args:
            source_filepath: Path to the original map file
            map_name: Name of the map (without extension)

        Returns:
            dict with 'success' (bool) and 'backup_name' or 'error' (str)
        """
        pass

    @abstractmethod
    def list_backups(self, map_name: str = None) -> list:
        """
        List backups, optionally filtered by map name.

        Args:
            map_name: Optional filter for specific map

        Returns:
            List of backup info dicts with 'name', 'timestamp', 'map_name'
        """
        pass

    @abstractmethod
    def delete_backup(self, backup_name: str) -> dict:
        """
        Delete a specific backup.

        Args:
            backup_name: Name of the backup file to delete

        Returns:
            dict with 'success' (bool) and optional 'error' (str)
        """
        pass

    @abstractmethod
    def restore_backup(self, backup_name: str, target_filepath: str) -> dict:
        """
        Restore a backup to the original location.

        Args:
            backup_name: Name of the backup to restore
            target_filepath: Where to restore the file

        Returns:
            dict with 'success' (bool) and optional 'error' (str)
        """
        pass


class LocalBackupStorage(BackupStorage):
    """Local filesystem backup storage implementation."""

    def __init__(self, backup_dir: str = 'maps/backups'):
        self.backup_dir = backup_dir
        os.makedirs(backup_dir, exist_ok=True)

    def _generate_backup_name(self, map_name: str) -> str:
        """Generate a timestamped backup filename.

        WHY MICROSECONDS MATTER:
        Without microseconds, if two users save the same map within the same second:
          - User A backup: MainCampus_2024-01-15_10-30-45.json
          - User B backup: MainCampus_2024-01-15_10-30-45.json (SAME NAME!)
          - User B's backup overwrites User A's backup
          - Now we only have User B's pre-save state, User A's is lost forever

        With microseconds (6 decimal places = millionths of a second):
          - User A backup: MainCampus_2024-01-15_10-30-45-123456.json
          - User B backup: MainCampus_2024-01-15_10-30-45-789012.json
          - Both backups preserved!
        """
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S-%f')
        return f"{map_name}_{timestamp}.json"

    def _parse_backup_name(self, backup_name: str) -> dict:
        """Parse backup filename to extract map name and timestamp.

        Supports both old format (no microseconds) and new format (with microseconds)
        for backwards compatibility with existing backups.
        """
        # Format: MapName_YYYY-MM-DD_HH-MM-SS.json (old)
        # Format: MapName_YYYY-MM-DD_HH-MM-SS-ffffff.json (new, with microseconds)
        if not backup_name.endswith('.json'):
            return None

        name_without_ext = backup_name[:-5]  # Remove .json

        # Try new format first (26 chars: YYYY-MM-DD_HH-MM-SS-ffffff)
        if len(name_without_ext) >= 27:
            timestamp_str = name_without_ext[-26:]
            map_name = name_without_ext[:-27]
            try:
                timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d_%H-%M-%S-%f')
                return {
                    'map_name': map_name,
                    'timestamp': timestamp,
                    'timestamp_str': timestamp_str
                }
            except ValueError:
                pass  # Fall through to try old format

        # Try old format (19 chars: YYYY-MM-DD_HH-MM-SS)
        if len(name_without_ext) >= 20:
            timestamp_str = name_without_ext[-19:]
            map_name = name_without_ext[:-20]
            try:
                timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d_%H-%M-%S')
                return {
                    'map_name': map_name,
                    'timestamp': timestamp,
                    'timestamp_str': timestamp_str
                }
            except ValueError:
                pass

        return None

    def save_backup(self, source_filepath: str, map_name: str) -> dict:
        """Save a backup of the map file to local storage."""
        if not os.path.exists(source_filepath):
            # No existing file to backup - this is fine for new maps
            return {'success': True, 'backup_name': None, 'message': 'No existing file to backup'}

        try:
            backup_name = self._generate_backup_name(map_name)
            backup_path = os.path.join(self.backup_dir, backup_name)

            shutil.copy2(source_filepath, backup_path)

            return {'success': True, 'backup_name': backup_name}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def list_backups(self, map_name: str = None) -> list:
        """List all backups, optionally filtered by map name."""
        backups = []

        if not os.path.exists(self.backup_dir):
            return backups

        for filename in os.listdir(self.backup_dir):
            if not filename.endswith('.json'):
                continue

            parsed = self._parse_backup_name(filename)
            if not parsed:
                continue

            # Filter by map name if specified
            if map_name and parsed['map_name'] != map_name:
                continue

            filepath = os.path.join(self.backup_dir, filename)
            backups.append({
                'name': filename,
                'map_name': parsed['map_name'],
                'timestamp': parsed['timestamp'].isoformat(),
                'size': os.path.getsize(filepath)
            })

        # Sort by timestamp, newest first
        backups.sort(key=lambda x: x['timestamp'], reverse=True)
        return backups

    def delete_backup(self, backup_name: str) -> dict:
        """Delete a specific backup file."""
        backup_path = os.path.join(self.backup_dir, backup_name)

        # Security: prevent path traversal
        if '..' in backup_name or backup_name.startswith('/') or backup_name.startswith('\\'):
            return {'success': False, 'error': 'Invalid backup name'}

        if not os.path.exists(backup_path):
            return {'success': False, 'error': 'Backup not found'}

        try:
            os.remove(backup_path)
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def restore_backup(self, backup_name: str, target_filepath: str) -> dict:
        """Restore a backup to the specified location."""
        backup_path = os.path.join(self.backup_dir, backup_name)

        # Security: prevent path traversal
        if '..' in backup_name or backup_name.startswith('/') or backup_name.startswith('\\'):
            return {'success': False, 'error': 'Invalid backup name'}

        if not os.path.exists(backup_path):
            return {'success': False, 'error': 'Backup not found'}

        try:
            shutil.copy2(backup_path, target_filepath)
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def cleanup_old_backups(self, days: int = 30) -> dict:
        """
        Delete backups older than specified days.

        This method is here for future use when auto-deletion is enabled.
        Currently not called automatically.

        Args:
            days: Delete backups older than this many days

        Returns:
            dict with 'success', 'deleted_count', and 'errors'
        """
        from datetime import timedelta

        cutoff = datetime.now() - timedelta(days=days)
        deleted = 0
        errors = []

        for backup in self.list_backups():
            backup_time = datetime.fromisoformat(backup['timestamp'])
            if backup_time < cutoff:
                result = self.delete_backup(backup['name'])
                if result['success']:
                    deleted += 1
                else:
                    errors.append(f"{backup['name']}: {result.get('error', 'Unknown error')}")

        return {
            'success': len(errors) == 0,
            'deleted_count': deleted,
            'errors': errors
        }


class BackupManager:
    """
    High-level backup manager that coordinates backup operations.

    This class provides a simple interface for the main application
    while delegating actual storage to the configured backend.
    """

    def __init__(self, storage: BackupStorage = None):
        """
        Initialize the backup manager.

        Args:
            storage: BackupStorage implementation to use.
                     Defaults to LocalBackupStorage if not specified.
        """
        self.storage = storage or LocalBackupStorage()

    def backup_before_save(self, filepath: str) -> dict:
        """
        Create a backup of an existing map file before saving new content.

        Should be called BEFORE writing new content to the file.

        Args:
            filepath: Path to the map file about to be overwritten

        Returns:
            dict with 'success' and 'backup_name' or 'error'
        """
        # Extract map name from filepath (e.g., "maps/MainCampus.json" -> "MainCampus")
        filename = os.path.basename(filepath)
        map_name = filename[:-5] if filename.endswith('.json') else filename

        return self.storage.save_backup(filepath, map_name)

    def list_backups(self, map_name: str = None) -> list:
        """List all backups, optionally filtered by map name."""
        return self.storage.list_backups(map_name)

    def restore_backup(self, backup_name: str, maps_dir: str = 'maps') -> dict:
        """
        Restore a backup to its original map file.

        Args:
            backup_name: Name of the backup file
            maps_dir: Directory where map files are stored

        Returns:
            dict with 'success' and optional 'error'
        """
        # Parse backup name to get original map name
        if isinstance(self.storage, LocalBackupStorage):
            parsed = self.storage._parse_backup_name(backup_name)
            if not parsed:
                return {'success': False, 'error': 'Invalid backup name format'}

            target_filepath = os.path.join(maps_dir, f"{parsed['map_name']}.json")
            return self.storage.restore_backup(backup_name, target_filepath)

        return {'success': False, 'error': 'Restore not implemented for this storage backend'}


# Default instance for easy import
# To switch to cloud storage, replace LocalBackupStorage() with your cloud implementation
backup_manager = BackupManager(LocalBackupStorage())
