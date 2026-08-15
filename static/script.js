function selectRole(role) {
    // Hide role selection
    document.getElementById('role-selection').style.display = 'none';

    if (role === 'Admin') {
        // Show admin login form
        document.getElementById('admin-login').style.display = 'block';
    }
}

function goBack() {
    // Hide admin login form
    document.getElementById('admin-login').style.display = 'none';

    // Show role selection
    document.getElementById('role-selection').style.display = 'block';

    // DO NOT clear form inputs anymore - let them keep their values
}

// Handle ESC key to go back
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const adminLogin = document.getElementById('admin-login');

        if (adminLogin.style.display === 'block') {
            goBack();
        }
    }
});
