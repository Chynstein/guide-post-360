"""
Cache and atomic write tests for GuidePost360.

Tests cover:
- _check_map_is_empty_internal() - map emptiness detection
- get_cached_empty_status() - cache hit/miss behavior
- invalidate_empty_cache() - cache invalidation
- check_map_is_empty() - high-level cached check
- atomic_write_json() - atomic file write correctness

Run with: pytest tests/backend/test_cache.py -v
"""

import pytest
import json
import os
import sys
import tempfile
import shutil
import time

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from main import (
    _check_map_is_empty_internal,
    get_cached_empty_status,
    invalidate_empty_cache,
    check_map_is_empty,
    atomic_write_json,
    _empty_status_cache,
    _empty_cache_lock,
)


@pytest.fixture
def temp_dir():
    """Create a temporary directory for test files."""
    d = tempfile.mkdtemp()
    yield d
    shutil.rmtree(d, ignore_errors=True)


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear the empty status cache before each test."""
    with _empty_cache_lock:
        _empty_status_cache.clear()
    yield
    with _empty_cache_lock:
        _empty_status_cache.clear()


def write_map(dir_path, filename, tiles=None, textboxes=None):
    """Helper to write a map file."""
    filepath = os.path.join(dir_path, filename)
    data = {
        "size": [5, 5],
        "tiles": tiles or [],
        "textboxes": textboxes or []
    }
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f)
    return filepath


class TestCheckMapIsEmptyInternal:
    """Tests for the internal map emptiness check."""

    def test_empty_map_no_tiles_no_textboxes(self, temp_dir):
        """Map with no tiles and no textboxes should be empty."""
        filepath = write_map(temp_dir, 'empty.json')
        assert _check_map_is_empty_internal(filepath) is True

    def test_empty_map_only_zero_tiles(self, temp_dir):
        """Map with only zero-value tiles should be empty."""
        filepath = write_map(temp_dir, 'zeros.json', tiles=[[0, 0, 0], [1, 1, 0]])
        assert _check_map_is_empty_internal(filepath) is True

    def test_non_empty_with_tiles(self, temp_dir):
        """Map with non-zero tiles should not be empty."""
        filepath = write_map(temp_dir, 'tiles.json', tiles=[[1, 1, 3]])
        assert _check_map_is_empty_internal(filepath) is False

    def test_non_empty_with_textboxes(self, temp_dir):
        """Map with textboxes should not be empty."""
        textbox = {"grid_x": 1, "grid_y": 1, "text": "Room"}
        filepath = write_map(temp_dir, 'textbox.json', textboxes=[textbox])
        assert _check_map_is_empty_internal(filepath) is False

    def test_non_empty_both_tiles_and_textboxes(self, temp_dir):
        """Map with both tiles and textboxes should not be empty."""
        textbox = {"grid_x": 1, "grid_y": 1, "text": "Room"}
        filepath = write_map(temp_dir, 'both.json', tiles=[[1, 1, 3]], textboxes=[textbox])
        assert _check_map_is_empty_internal(filepath) is False

    def test_nonexistent_file(self):
        """Non-existent file should return False (assume not empty for safety)."""
        assert _check_map_is_empty_internal('/nonexistent/path.json') is False

    def test_invalid_json(self, temp_dir):
        """Invalid JSON should return False (assume not empty for safety)."""
        filepath = os.path.join(temp_dir, 'invalid.json')
        with open(filepath, 'w') as f:
            f.write('not valid json{{{')
        assert _check_map_is_empty_internal(filepath) is False

    def test_all_tile_types_non_empty(self, temp_dir):
        """Any non-zero tile value should make the map non-empty."""
        for tile_type in [1, 2, 3, 4, 5, 6, 7]:
            filepath = write_map(temp_dir, f'tile_{tile_type}.json',
                                 tiles=[[0, 0, tile_type]])
            assert _check_map_is_empty_internal(filepath) is False, \
                f"Tile type {tile_type} should make map non-empty"

    def test_map_without_tiles_key(self, temp_dir):
        """Map file without 'tiles' key should be treated as empty tiles."""
        filepath = os.path.join(temp_dir, 'no_tiles.json')
        with open(filepath, 'w') as f:
            json.dump({"size": [5, 5]}, f)
        # No tiles key = defaults to empty list, so is empty
        assert _check_map_is_empty_internal(filepath) is True


class TestGetCachedEmptyStatus:
    """Tests for the cached empty status check."""

    def test_cache_miss_computes(self, temp_dir):
        """Cache miss should compute and return the result."""
        filepath = write_map(temp_dir, 'test.json', tiles=[[1, 1, 3]])
        result = get_cached_empty_status(filepath)
        assert result is False

    def test_cache_hit_returns_cached(self, temp_dir):
        """Second call should use cached result."""
        filepath = write_map(temp_dir, 'test.json', tiles=[[1, 1, 3]])

        # First call - cache miss
        result1 = get_cached_empty_status(filepath)
        assert result1 is False

        # Second call - cache hit (same mtime)
        result2 = get_cached_empty_status(filepath)
        assert result2 is False

    def test_cache_invalidated_on_modification(self, temp_dir):
        """Modified file should bypass cache."""
        filepath = write_map(temp_dir, 'test.json')  # Empty map

        # Cache the empty status
        result1 = get_cached_empty_status(filepath)
        assert result1 is True

        # Wait and modify (to change mtime)
        time.sleep(0.1)
        write_map(temp_dir, 'test.json', tiles=[[1, 1, 3]])  # Now non-empty

        # Should detect change via mtime
        result2 = get_cached_empty_status(filepath)
        assert result2 is False

    def test_nonexistent_file_returns_none(self):
        """Non-existent file should return None."""
        result = get_cached_empty_status('/nonexistent/path.json')
        assert result is None


class TestInvalidateEmptyCache:
    """Tests for cache invalidation."""

    def test_invalidate_existing_entry(self, temp_dir):
        """Invalidating a cached entry should remove it."""
        filepath = write_map(temp_dir, 'test.json')

        # Populate cache
        get_cached_empty_status(filepath)

        # Verify it's cached
        with _empty_cache_lock:
            assert filepath in _empty_status_cache

        # Invalidate
        invalidate_empty_cache(filepath)

        # Verify it's gone
        with _empty_cache_lock:
            assert filepath not in _empty_status_cache

    def test_invalidate_nonexistent_entry(self):
        """Invalidating a non-cached path should not raise."""
        # Should not raise
        invalidate_empty_cache('/nonexistent/path.json')


class TestCheckMapIsEmpty:
    """Tests for the high-level cached emptiness check."""

    def test_empty_map(self, temp_dir):
        """Empty map should return True."""
        filepath = write_map(temp_dir, 'test.json')
        assert check_map_is_empty(filepath) is True

    def test_non_empty_map(self, temp_dir):
        """Non-empty map should return False."""
        filepath = write_map(temp_dir, 'test.json', tiles=[[1, 1, 3]])
        assert check_map_is_empty(filepath) is False

    def test_uses_cache(self, temp_dir):
        """Multiple calls should use caching."""
        filepath = write_map(temp_dir, 'test.json')

        # Call twice - second should hit cache
        result1 = check_map_is_empty(filepath)
        result2 = check_map_is_empty(filepath)
        assert result1 == result2

        # Verify cache was populated
        with _empty_cache_lock:
            assert filepath in _empty_status_cache


class TestAtomicWriteJson:
    """Tests for atomic JSON file writing."""

    def test_write_new_file(self, temp_dir):
        """Should create a new file with correct content."""
        filepath = os.path.join(temp_dir, 'new.json')
        data = {"key": "value", "number": 42}

        atomic_write_json(filepath, data)

        with open(filepath, 'r') as f:
            result = json.load(f)
        assert result == data

    def test_overwrite_existing(self, temp_dir):
        """Should overwrite existing file."""
        filepath = os.path.join(temp_dir, 'existing.json')

        # Create initial file
        with open(filepath, 'w') as f:
            json.dump({"old": True}, f)

        # Overwrite
        new_data = {"new": True, "overwritten": True}
        atomic_write_json(filepath, new_data)

        with open(filepath, 'r') as f:
            result = json.load(f)
        assert result == new_data

    def test_write_complex_data(self, temp_dir):
        """Should handle complex nested data."""
        filepath = os.path.join(temp_dir, 'complex.json')
        data = {
            "size": [300, 400],
            "tiles": [[1, 2, 3], [4, 5, 6]],
            "textboxes": [
                {"grid_x": 10, "grid_y": 20, "text": "Room\nTeacher"},
            ]
        }

        atomic_write_json(filepath, data)

        with open(filepath, 'r') as f:
            result = json.load(f)
        assert result == data

    def test_write_uses_compact_separators(self, temp_dir):
        """Should use compact JSON separators (no extra spaces)."""
        filepath = os.path.join(temp_dir, 'compact.json')
        data = {"a": 1, "b": 2}

        atomic_write_json(filepath, data)

        with open(filepath, 'r') as f:
            content = f.read()

        # Compact separators: no space after : or ,
        assert ': ' not in content
        assert ', ' not in content

    def test_no_temp_files_left(self, temp_dir):
        """No temporary files should remain after successful write."""
        filepath = os.path.join(temp_dir, 'clean.json')
        atomic_write_json(filepath, {"test": True})

        files = os.listdir(temp_dir)
        assert len(files) == 1
        assert files[0] == 'clean.json'

    def test_write_empty_data(self, temp_dir):
        """Should handle empty objects/arrays."""
        filepath = os.path.join(temp_dir, 'empty.json')
        atomic_write_json(filepath, {})

        with open(filepath, 'r') as f:
            result = json.load(f)
        assert result == {}

    def test_write_preserves_unicode(self, temp_dir):
        """Should preserve Unicode characters."""
        filepath = os.path.join(temp_dir, 'unicode.json')
        data = {"name": "Jos\u00e9 Garc\u00eda", "room": "Se\u00f1or"}

        atomic_write_json(filepath, data)

        with open(filepath, 'r', encoding='utf-8') as f:
            result = json.load(f)
        assert result['name'] == 'Jos\u00e9 Garc\u00eda'

    def test_write_large_map(self, temp_dir):
        """Should handle large map data without issues."""
        filepath = os.path.join(temp_dir, 'large.json')
        # Simulate a large map with many tiles
        tiles = [[r, c, 3] for r in range(100) for c in range(100)]
        data = {"size": [300, 400], "tiles": tiles, "textboxes": []}

        atomic_write_json(filepath, data)

        with open(filepath, 'r') as f:
            result = json.load(f)
        assert len(result['tiles']) == 10000
