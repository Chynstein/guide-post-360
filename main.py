from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, make_response
from flask_minify import Minify
from flask_compress import Compress
from flask_wtf.csrf import CSRFProtect, generate_csrf
from datetime import datetime
import json
import os
import re
import tempfile
import threading
from backup_manager import backup_manager

app = Flask(__name__)
Compress(app)  # Enable gzip compression for all responses
# Disable HTML minification - Flask-Minify has a bug that strips modal content
# Keep JS/CSS minification for performance while avoiding the HTML minification bug
Minify(app=app, html=False, js=True, cssless=True)

# CSRF Protection
csrf = CSRFProtect(app)

# Failed login tracking to prevent brute force attacks
# Only counts FAILED attempts - successful logins reset the counter
# Format: {ip_address: {'count': int, 'first_attempt': timestamp}}
failed_login_attempts = {}
FAILED_LOGIN_MAX_ATTEMPTS = 5
FAILED_LOGIN_WINDOW_SECONDS = 30 * 60  # 30 minutes

def check_and_record_failed_login(ip_address):
    """Check if IP is blocked due to too many failed attempts.
    Returns True if blocked, False if allowed."""
    if os.environ.get('TESTING', ''):
        return False  # Disable rate limiting in tests

    now = datetime.now().timestamp()

    if ip_address in failed_login_attempts:
        record = failed_login_attempts[ip_address]
        # Check if the window has expired
        if now - record['first_attempt'] > FAILED_LOGIN_WINDOW_SECONDS:
            # Window expired, reset counter
            del failed_login_attempts[ip_address]
        elif record['count'] >= FAILED_LOGIN_MAX_ATTEMPTS:
            # Too many failed attempts within window
            return True

    return False

def record_failed_login(ip_address):
    """Record a failed login attempt for an IP address."""
    if os.environ.get('TESTING', ''):
        return

    now = datetime.now().timestamp()

    if ip_address in failed_login_attempts:
        record = failed_login_attempts[ip_address]
        # Check if window has expired
        if now - record['first_attempt'] > FAILED_LOGIN_WINDOW_SECONDS:
            # Start a new window
            failed_login_attempts[ip_address] = {'count': 1, 'first_attempt': now}
        else:
            # Increment within existing window
            record['count'] += 1
    else:
        # First failed attempt for this IP
        failed_login_attempts[ip_address] = {'count': 1, 'first_attempt': now}

def clear_failed_logins(ip_address):
    """Clear failed login counter on successful login."""
    if ip_address in failed_login_attempts:
        del failed_login_attempts[ip_address]

# Set long cache headers for static files (1 year) - crucial for high traffic
# Version query strings (?v=10) handle cache busting when files change
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 31536000  # 1 year in seconds

IS_PRODUCTION = os.environ.get('PRODUCTION', '').lower() == 'true'

# Use environment variable for secret key, with fallback for development only
# In production, set the SECRET_KEY environment variable!
app.secret_key = os.environ.get('SECRET_KEY', 'dev-only-key-change-in-production')

# Secure session cookie configuration
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent JavaScript access to session cookie
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection
app.config['SESSION_COOKIE_SECURE'] = IS_PRODUCTION  # HTTPS only in production

# Auto-reload templates when they change (no server restart needed)
# Static files still use browser caching with version query strings for cache busting
app.config['TEMPLATES_AUTO_RELOAD'] = True

# Handle Private Network Access (PNA) preflight requests
# This prevents Chrome warnings about local network requests
@app.after_request
def add_private_network_access_headers(response):
    # For preflight requests, allow private network access
    if request.method == 'OPTIONS':
        response.headers['Access-Control-Allow-Private-Network'] = 'true'
    return response

# User database with privileges
# Passwords should be set via environment variables in production
# Format: ADMIN_PASSWORD, TEACHER_PASSWORD
# ============================================
# MAP FORMAT CONVERSION HELPERS
# ============================================

def dense_to_sparse(dense_map):
    """Convert a dense 2D map array to sparse format for efficient storage."""
    if not dense_map or not dense_map[0]:
        return {"size": [0, 0], "tiles": []}

    height = len(dense_map)
    width = len(dense_map[0])
    tiles = []

    for row in range(height):
        for col in range(width):
            value = dense_map[row][col]
            if value != 0:
                tiles.append([row, col, value])

    return {
        "size": [height, width],
        "tiles": tiles
    }


USERS = {
    "admin": {
        "password": os.environ.get('ADMIN_PASSWORD', 'admin123'),
        "role": "Admin",
        "privileges": ["edit_map", "edit_textboxes", "save", "load", "clear", "zoom", "fullscreen"]
    }
}

if IS_PRODUCTION and (app.secret_key == 'dev-only-key-change-in-production' or USERS['admin']['password'] == 'admin123'):
    raise RuntimeError(
        "Refusing to start with PRODUCTION=true while SECRET_KEY/ADMIN_PASSWORD are unset. "
        "Set both environment variables before deploying."
    )

# Public Safety Personnel role (no login required - direct access)
PERSONNEL_ROLE = {
    "role": "Personnel",
    "privileges": ["load", "zoom", "fullscreen"]
}

# Map storage directory
MAPS_DIR = 'maps'
os.makedirs(MAPS_DIR, exist_ok=True)

# ============================================
# EMPTY MAP STATUS CACHE
# ============================================
# WHY: Without caching, every /api/list-maps request opens and parses EVERY map file
# to check if it's empty. With 4 maps, that's 4 file reads + JSON parses per request.
# With 300 concurrent users refreshing the list, that's 1200 file operations!
#
# HOW: We cache the "is empty" result along with the file's modification time.
# If the file hasn't been modified since we last checked, we use the cached result.
# This reduces file I/O from O(N) per request to O(1) for unchanged files.
_empty_status_cache = {}  # {filepath: {'mtime': float, 'is_empty': bool}}
_empty_cache_lock = threading.Lock()  # Protects cache from concurrent access


def get_cached_empty_status(filepath):
    """Get cached empty status if file hasn't changed, otherwise recompute."""
    try:
        current_mtime = os.path.getmtime(filepath)
    except OSError:
        return None  # File doesn't exist or can't be accessed

    with _empty_cache_lock:
        cached = _empty_status_cache.get(filepath)
        if cached and cached['mtime'] == current_mtime:
            return cached['is_empty']

    # Cache miss or stale - recompute
    is_empty = _check_map_is_empty_internal(filepath)

    with _empty_cache_lock:
        _empty_status_cache[filepath] = {
            'mtime': current_mtime,
            'is_empty': is_empty
        }

    return is_empty


def invalidate_empty_cache(filepath):
    """Remove a file from the empty status cache (call after saving)."""
    with _empty_cache_lock:
        _empty_status_cache.pop(filepath, None)


# ============================================
# ATOMIC FILE WRITE
# ============================================
# WHY: Without atomic writes, if two users save the same file at the exact same moment:
#   1. User A opens file for writing (this TRUNCATES/empties the file immediately!)
#   2. User B opens file for writing (truncates again - now both see empty file)
#   3. User A writes their data
#   4. User B writes their data (OVERWRITES User A's data completely)
#   Result: User A's changes are lost forever!
#
# HOW: We write to a temporary file first, then rename it over the original.
# On most filesystems, rename is an "atomic" operation - it either fully succeeds
# or fully fails, with no in-between state. This means:
#   - User A writes to temp file A, then renames to final
#   - User B writes to temp file B, then renames to final
#   - Whichever rename happens last "wins", but no data is corrupted
#   - Both users' files are complete (not truncated/partial)


def atomic_write_json(filepath, data):
    """Write JSON data atomically using temp file + rename.

    This prevents data corruption if two processes write simultaneously.
    One will "win" and the other's changes will be lost, but neither
    will end up with a corrupted/partial file.
    """
    # Create temp file in same directory (so rename works across filesystems)
    dir_path = os.path.dirname(filepath) or '.'
    fd, temp_path = tempfile.mkstemp(suffix='.tmp', dir=dir_path)

    try:
        # Write to temp file
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(data, f, separators=(',', ':'))

        # Atomic rename (on Windows, need to remove target first)
        if os.name == 'nt' and os.path.exists(filepath):
            # Windows doesn't support atomic rename over existing file
            # This creates a small window where file doesn't exist, but
            # it's still safer than truncating and writing
            os.replace(temp_path, filepath)
        else:
            os.rename(temp_path, filepath)

    except Exception:
        # Clean up temp file if something went wrong
        try:
            os.unlink(temp_path)
        except OSError:
            pass
        raise


# Template context processor - makes variables available to all templates
@app.context_processor
def inject_globals():
    """Inject common variables into all templates."""
    return {
        'csrf_token': generate_csrf
    }


@app.route('/')
def index():
    """Main login page"""
    return render_template('login.html')

@app.route('/how-to-guide')
def how_to_guide():
    """How-To Guide page"""
    return render_template('how_to_guide.html')

@app.route('/login', methods=['POST'])
def login():
    """Handle login form submission.
    Failed login rate limiting only applies to Admin login (credential-based) to prevent brute force.
    Personnel login is exempt since it requires no credentials.
    Successful logins reset the failed attempt counter."""
    role = request.form.get('role')

    # Get elevator access preference (available for all roles)
    elevator_access = request.form.get('elevator_access') == '1'

    if role == 'Personnel':
        # Public Safety Personnel - direct access, no credentials needed
        session.clear()
        session['username'] = 'personnel'
        session['role'] = PERSONNEL_ROLE['role']
        session['privileges'] = PERSONNEL_ROLE['privileges']
        session['elevator_access'] = elevator_access
        session.modified = True
        return redirect(url_for('map_editor'))

    else:
        # Admin login - check for too many failed attempts first
        client_ip = request.remote_addr
        if check_and_record_failed_login(client_ip):
            flash('flash.tooManyAttempts', 'error')
            return redirect(url_for('index'))

        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        email = request.form.get('staff_email', '').strip()

        user_data = authenticate(username, password)

        if user_data:
            # Successful login - clear failed attempt counter for this IP
            clear_failed_logins(client_ip)
            # Regenerate session to prevent session fixation attacks
            session.clear()
            session['username'] = user_data['username']
            session['email'] = email
            session['role'] = user_data['role']
            session['privileges'] = user_data['privileges']
            session['elevator_access'] = elevator_access
            session.modified = True
            return redirect(url_for('map_editor'))
        else:
            # Failed login - record the attempt
            record_failed_login(client_ip)
            flash('flash.invalidCredentials', 'error')
            return render_template('login.html',
                                 show_admin_form=True,
                                 form_data=request.form)

@app.route('/map-editor')
def map_editor():
    """Map editor page after successful login"""
    if 'username' not in session:
        flash('flash.loginRequired', 'error')
        return redirect(url_for('index'))

    return render_template('map_editor.html',
                         username=session.get('username'),
                         role=session.get('role'),
                         privileges=session.get('privileges'),
                         elevator_access=session.get('elevator_access', False))

@app.route('/api/save-map', methods=['POST'])
@csrf.exempt  # API endpoint uses session auth, not form submission
def save_map():
    """Save map data to file"""
    if 'username' not in session or 'save' not in session.get('privileges', []):
        return jsonify({'success': False, 'message': 'Permission denied'}), 403

    data = request.json
    filename = data.get('filename', 'untitled.json')
    if not filename.endswith('.json'):
        filename += '.json'

    # Security: Validate filename to prevent path traversal attacks
    if not filename or '..' in filename or filename.startswith('/') or filename.startswith('\\'):
        return jsonify({'success': False, 'message': 'Invalid filename'}), 400
    # Remove .json suffix for validation, then check characters
    name_part = filename[:-5] if filename.endswith('.json') else filename
    if not all(c.isalnum() or c in '-_ ' for c in name_part):
        return jsonify({'success': False, 'message': 'Invalid filename characters'}), 400

    filepath = os.path.join(MAPS_DIR, filename)

    try:
        # Backup existing file before overwriting
        backup_result = backup_manager.backup_before_save(filepath)
        if not backup_result['success'] and 'No existing file' not in backup_result.get('message', ''):
            app.logger.warning(f'Backup failed for {filename}: {backup_result.get("error", "Unknown error")}')
            # Continue with save even if backup fails - don't block the user

        # Convert dense map to sparse format for efficient storage
        dense_map = data.get('map')
        sparse_data = dense_to_sparse(dense_map)

        # Use atomic write to prevent corruption from concurrent saves
        # (See atomic_write_json docstring for explanation)
        atomic_write_json(filepath, {
            'size': sparse_data['size'],
            'tiles': sparse_data['tiles'],
            'textboxes': data.get('textboxes', []),
            'doorMeta': data.get('doorMeta', {})
        })

        # Invalidate empty status cache since file content changed
        invalidate_empty_cache(filepath)

        return jsonify({'success': True, 'message': f'Saved to {format_map_display_name(filename)}'})
    except Exception as e:
        # Log the actual error server-side, return generic message to client
        app.logger.error(f'Error saving map {filename}: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to save map. Please try again.'}), 500

@app.route('/api/load-map/<filename>')
def load_map(filename):
    """Load map data from file"""
    if 'username' not in session or 'load' not in session.get('privileges', []):
        return jsonify({'success': False, 'message': 'Permission denied'}), 403

    # Security: Validate filename to prevent path traversal attacks
    if not filename or '..' in filename or filename.startswith('/') or filename.startswith('\\'):
        return jsonify({'success': False, 'message': 'Invalid filename'}), 400
    # Remove .json suffix for validation, then check characters (match save_map logic)
    name_part = filename[:-5] if filename.endswith('.json') else filename
    if not all(c.isalnum() or c in '-_ ' for c in name_part):
        return jsonify({'success': False, 'message': 'Invalid filename characters'}), 400

    filepath = os.path.join(MAPS_DIR, filename)

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify({'success': True, 'data': data})
    except FileNotFoundError:
        return jsonify({'success': False, 'message': 'File not found'}), 404
    except Exception as e:
        # Log the actual error server-side, return generic message to client
        app.logger.error(f'Error loading map {filename}: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to load map. Please try again.'}), 500

def format_map_display_name(filename):
    """Convert map filename to human-readable display name.
    e.g., 'MainCampusDownstairs.json' -> 'Main Campus Downstairs'
          'CTEDownstairs.json' -> 'CTE Downstairs'
    """
    # Remove .json extension
    name = filename[:-5] if filename.endswith('.json') else filename
    # Add space between lowercase and uppercase (e.g., "mainCampus" -> "main Campus")
    name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
    # Add space between acronym and next word (e.g., "CTEDownstairs" -> "CTE Downstairs")
    name = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1 \2', name)
    return name


def _check_map_is_empty_internal(filepath):
    """Internal: Actually read and check if a map file is blank.
    Use check_map_is_empty() instead - it uses caching for performance.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as mf:
            map_data = json.load(mf)
            tiles = map_data.get('tiles', [])
            textboxes = map_data.get('textboxes', [])

            # Check if all tiles are white (type 0) or no tiles at all
            # In sparse format: tiles are [row, col, value] - check index 2
            has_only_white_tiles = len(tiles) == 0 or all(
                tile[2] == 0 for tile in tiles if len(tile) >= 3
            )
            has_no_textboxes = len(textboxes) == 0

            return has_only_white_tiles and has_no_textboxes
    except (OSError, json.JSONDecodeError):
        return False  # If we can't read it, assume not empty for safety


def check_map_is_empty(filepath):
    """Check if a map file is blank (no non-white tiles and no textboxes).
    Uses caching based on file modification time for performance.
    """
    result = get_cached_empty_status(filepath)
    if result is not None:
        return result
    # Fallback if caching fails
    return _check_map_is_empty_internal(filepath)


@app.route('/api/list-maps')
def list_maps():
    """List all saved maps with empty status for save protection.

    RACE CONDITION HANDLING:
    Between os.listdir() and accessing each file, another request could delete
    or modify that file. We wrap each file access in try-except to handle this
    gracefully - if a file disappears, we just skip it instead of crashing.
    """
    if 'username' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 403

    files = []
    if os.path.exists(MAPS_DIR):
        for f in os.listdir(MAPS_DIR):
            if f.endswith('.json'):
                filepath = os.path.join(MAPS_DIR, f)
                try:
                    # File could be deleted between listdir and here - handle gracefully
                    mod_time = os.path.getmtime(filepath)
                    is_empty = check_map_is_empty(filepath)

                    files.append({
                        'name': f,
                        'modified': datetime.fromtimestamp(mod_time).strftime('%m/%d/%y %I:%M %p'),
                        'mod_time': mod_time,  # Keep raw timestamp for sorting
                        'isEmpty': is_empty
                    })
                except OSError:
                    # File was deleted/moved between listdir and access - skip it
                    continue

    files = sorted(files, key=lambda x: x['mod_time'], reverse=True)

    # Add cache headers to reduce redundant requests
    # Cache for 2 seconds - enough to deduplicate rapid-fire requests,
    # short enough that users see fresh data when they manually refresh
    response = make_response(jsonify({'success': True, 'files': files}))
    response.headers['Cache-Control'] = 'private, max-age=2'
    return response


@app.route('/api/available-maps')
def available_maps():
    """List all non-blank maps for the student view dropdown and pathfinder.
    Returns maps that have content (non-white tiles OR textboxes).

    RACE CONDITION HANDLING: Same as list_maps() - files can disappear between
    listdir() and access, so we handle OSError gracefully.
    """
    if 'username' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 403

    maps = []
    if os.path.exists(MAPS_DIR):
        for f in os.listdir(MAPS_DIR):
            if f.endswith('.json'):
                filepath = os.path.join(MAPS_DIR, f)

                try:
                    # Only include maps that have content (not blank)
                    if not check_map_is_empty(filepath):
                        maps.append({
                            'filename': f,
                            'displayName': format_map_display_name(f)
                        })
                except OSError:
                    # File was deleted between listdir and access - skip it
                    continue

    # Sort alphabetically by display name for consistent ordering
    maps = sorted(maps, key=lambda x: x['displayName'])

    # Cache for 5 seconds - this list changes rarely and is called frequently
    response = make_response(jsonify({'success': True, 'maps': maps}))
    response.headers['Cache-Control'] = 'private, max-age=5'
    return response


# ============================================
# BACKUP MANAGEMENT ENDPOINTS (Admin only)
# ============================================

@app.route('/api/list-backups')
def list_backups():
    """List all map backups (Admin only)"""
    if 'username' not in session or session.get('role') != 'Admin':
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    map_name = request.args.get('map')  # Optional filter by map name
    backups = backup_manager.list_backups(map_name)

    # Format for display
    for backup in backups:
        backup['displayName'] = format_map_display_name(backup['map_name'] + '.json')

    return jsonify({'success': True, 'backups': backups})


@app.route('/api/restore-backup', methods=['POST'])
@csrf.exempt  # API endpoint uses session auth
def restore_backup():
    """Restore a map from backup (Admin only)"""
    if 'username' not in session or session.get('role') != 'Admin':
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    data = request.json
    backup_name = data.get('backup_name')

    if not backup_name:
        return jsonify({'success': False, 'message': 'Backup name required'}), 400

    # Security: validate backup name
    if '..' in backup_name or backup_name.startswith('/') or backup_name.startswith('\\'):
        return jsonify({'success': False, 'message': 'Invalid backup name'}), 400

    result = backup_manager.restore_backup(backup_name, MAPS_DIR)

    if result['success']:
        return jsonify({'success': True, 'message': f'Restored {backup_name}'})
    else:
        return jsonify({'success': False, 'message': result.get('error', 'Restore failed')}), 500


@app.route('/logout')
def logout():
    """Logout and clear session"""
    session.clear()
    flash('flash.loggedOut', 'success')
    return redirect(url_for('index'))

def authenticate(username, password):
    """Authenticate admin based on credentials"""
    if username in USERS:
        user = USERS[username]
        if user["password"] == password:
            return {
                "username": username,
                "role": user["role"],
                "privileges": user["privileges"]
            }
    return None

if __name__ == '__main__':
    # Set debug=False in production to prevent code execution via debugger
    app.run(debug=os.environ.get('FLASK_DEBUG', 'false').lower() == 'true')