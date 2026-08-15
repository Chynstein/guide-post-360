// ============================================
// INTERNATIONALIZATION (i18n) MODULE
// ============================================
// Provides English/Spanish language switching across all pages.
// Language preference persists in localStorage.

const TRANSLATIONS = {
    en: {
        // ============================================
        // COMMON (shared across pages)
        // ============================================
        'common.loading': 'Loading...',
        'common.ok': 'Ok',
        'common.yes': 'Yes',
        'common.no': 'No',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.back': 'Back',
        'common.clear': 'Clear',
        'common.close': 'Close',
        'common.error': 'Error',
        'common.upstairs': 'Upstairs',
        'common.downstairs': 'Downstairs',
        'common.support': 'Support',
        'common.supportQuestion': 'Have feedback, questions, comments, or recommendations? We\'d love to hear from you!',
        'common.sendFeedback': 'Send Feedback',

        // ============================================
        // DASHBOARD (login.html)
        // ============================================
        'dashboard.title': 'GuidePost360',
        'dashboard.subtitle': 'Campus Navigation System',
        'dashboard.signinQuestion': 'How are you signing in?',
        'dashboard.admin': 'Admin',
        'dashboard.personnel': 'Safety Personnel',
        'dashboard.elevatorCheckbox': 'I need elevator access (avoid stairs)',
        'dashboard.quickTips': 'Quick Tips',
        'dashboard.helpResources': 'Help & Resources',
        'dashboard.helpDescription': 'New to GuidePost360? Check out our guide to get started.',
        'dashboard.viewGuide': 'View How-To Guide',
        // Desktop tips
        'dashboard.tipRecenter': 'Press <strong>R</strong> to recenter the map view',
        'dashboard.tipRotate': 'Use <strong>A</strong> and <strong>D</strong> keys to rotate the map',
        'dashboard.tipDirections': 'Click <strong>Get Directions</strong> for turn-by-turn navigation',
        'dashboard.tipFloorDropdown': 'Use the <strong>floor dropdown</strong> to switch between buildings',
        // Mobile tips
        'dashboard.tipSwipeUp': '<strong>Swipe up</strong> from the bottom for pathfinder',
        'dashboard.tipTapDirections': 'Tap <strong>Get Directions</strong> for turn-by-turn navigation',
        'dashboard.tipFloorDropdownMobile': 'Use the <strong>floor dropdown</strong> to switch buildings',
        'dashboard.tipTapRoom': 'Tap any <strong>room label</strong> to see details',
        // Admin login
        'dashboard.adminLogin': 'Admin Login',
        'dashboard.username': 'Username',
        'dashboard.password': 'Password',
        'dashboard.email': 'Email',
        'dashboard.usernamePlaceholder': 'Enter your username',
        'dashboard.passwordPlaceholder': 'Enter your password',
        'dashboard.emailPlaceholder': 'you@example.com',
        'dashboard.signIn': 'Sign In',
        // Theme toggle (dashboard)
        'dashboard.toggleDark': 'Switch to dark mode',
        'dashboard.toggleLight': 'Switch to light mode',
        'dashboard.darkMode': 'Dark mode',
        'dashboard.lightMode': 'Light mode',
        'dashboard.appearance': 'Appearance',

        // ============================================
        // FLASH MESSAGES (from server)
        // ============================================
        'flash.tooManyAttempts': 'Too many login attempts. Please wait 30 minutes before trying again.',
        'flash.invalidCredentials': 'Invalid username or password',
        'flash.loginRequired': 'Please login first',
        'flash.loggedOut': 'You have been logged out',
        'flash.permissionDenied': 'Permission denied',
        'flash.invalidFilename': 'Invalid filename',
        'flash.saveFailed': 'Failed to save map. Please try again.',
        'flash.loadFailed': 'Failed to load map. Please try again.',

        // ============================================
        // MAP EDITOR (map_editor.html)
        // ============================================
        // User bar
        'editor.resetRotation': 'Reset Rotation',
        'editor.resetRotationTitle': 'Reset map rotation (A/D keys to rotate)',
        'editor.dark': 'Dark',
        'editor.light': 'Light',
        'editor.switchToDark': 'Switch to dark mode',
        'editor.switchToLight': 'Switch to light mode',
        'editor.logout': 'Logout',

        // Pathfinder panel
        'editor.pathfinder': 'Pathfinder',
        'editor.scaleNotice': 'Note: Map is not drawn to scale',
        'editor.from': 'From:',
        'editor.to': 'To:',
        'editor.namePlaceholder': 'Name or room #',
        'editor.elevatorMode': 'Elevator Mode (avoid stairs)',
        'editor.quickFind': 'Quick Find:',
        'category.restrooms': 'Restrooms',
        'category.classrooms': 'Classrooms',
        'category.stairs': 'Stairs',
        'category.elevators': 'Elevators',
        'category.exits': 'Exits',
        'a11y.clearFilter': 'Clear filter',
        'editor.findRoute': 'Find Route',
        'editor.finding': 'Finding...',

        // Room finder
        'editor.roomFinder': 'Room Finder',
        'editor.findRoom': 'Find a room:',
        'editor.find': 'Find',

        // Location popup
        'popup.room': 'Room:',
        'popup.floor': 'Floor:',
        'popup.goUpstairs': 'Go Upstairs \u2191',
        'popup.goDownstairs': 'Go Downstairs \u2193',
        'popup.directionsFrom': 'Directions From',
        'popup.directionsTo': 'Directions To',

        // View toggle
        'editor.switchToNav': 'Switch to Navigation View',
        'editor.switchToEditor': 'Switch to Editor View',

        // Control panel
        'editor.mode': 'Mode',
        'editor.tileColor': 'Tile Color',
        'editor.actions': 'Actions',
        'editor.file': 'File',
        'editor.info': 'Info',
        'editor.pan': 'Pan',
        'editor.draw': 'Draw',
        'editor.textbox': 'Textbox',
        'editor.bucket': 'Bucket',
        'editor.infoPanel': 'Info Panel',
        'editor.zoomIn': 'Zoom In',
        'editor.zoomOut': 'Zoom Out',
        'editor.recenter': 'Recenter',
        'editor.undo': 'Undo',
        'editor.clearMap': 'Clear',
        'editor.saveBtn': 'Save',
        'editor.loadBtn': 'Load',
        'editor.zoom': 'Zoom:',
        'editor.position': 'Position:',
        'editor.modeLabel': 'Mode:',
        'editor.newTextbox': 'New Textbox',

        // Tile colors
        'tile.white': 'White - Eraser/Background',
        'tile.navy': 'Navy - Walls',
        'tile.orange': 'Orange - Accent',
        'tile.lightBlue': 'Light Blue - Hallways/Walkable',
        'tile.black': 'Black - Borders',
        'tile.doorway': 'Doorway - looks black but walkable',
        'tile.avoidZone': 'Avoid Zone - looks like hallway but pathfinder avoids',
        'tile.sidewalk': 'Sidewalk - outdoor path (not walkable)',

        // Save dialog
        'save.title': 'Save Map',
        'save.filenamePlaceholder': 'Enter new filename...',
        'save.overwriteExisting': 'Or overwrite existing file:',
        'save.noExistingFiles': 'No existing files',
        'save.errorLoadingFiles': 'Error loading files',
        'save.current': 'current',
        'save.blank': 'blank',
        'save.cannotOverwrite': 'Cannot overwrite: this is a different map file',
        'save.cannotSaveTo': 'Cannot save to "{filename}" - this is a different map file. To prevent accidental overwrites, you can only save to the file you\'re currently editing.',
        'save.cannotSaveToFull': 'Cannot save to "{filename}" - this is a different map file. To prevent accidental overwrites, you can only save to: the current file ({currentFile}), a blank file, or a new filename.',
        'save.enterFilename': 'Please enter a filename or select an existing file to overwrite',
        'save.confirmOverwrite': 'Save changes to "{name}"?',
        'save.confirmBlank': '"{name}" is blank. Save to this file?',
        'save.errorSaving': 'Error saving map: ',
        'save.errorLoadingList': 'Error loading file list. Please try again.',
        'save.saving': 'Saving...',

        // Load dialog
        'load.title': 'Load Map',
        'load.noSavedMaps': 'No saved maps found',
        'load.unsavedConfirm': 'You have unsaved changes. Are you sure you want to load a different map without saving?',
        'load.errorLoading': 'Error loading map: ',
        'load.failedToLoad': 'Failed to load map. Please try again.',

        // Textbox editing
        'textbox.editTitle': 'Edit Textbox',
        'textbox.markerLabel': 'Marker (transparent background)',
        'textbox.fontSize': 'Font Size:',
        'textbox.horizontalAlign': 'Horizontal Alignment:',
        'textbox.verticalAlign': 'Vertical Alignment:',
        'textbox.left': 'Left',
        'textbox.center': 'Center',
        'textbox.right': 'Right',
        'textbox.top': 'Top',
        'textbox.middle': 'Middle',
        'textbox.bottom': 'Bottom',
        'textbox.remove': 'Remove',
        'textbox.removeConfirm': 'Remove this textbox?',
        'textbox.charTruncated': 'Text truncated to {max} characters.',
        'textbox.lineTruncated': 'Text truncated to {max} lines.',

        // Info panel editing
        'infoPanel.editTitle': 'Edit Info Panel',
        'infoPanel.description': 'Description:',
        'infoPanel.descPlaceholder': 'Enter a description for this location...',
        'infoPanel.images': 'Images (URLs):',
        'infoPanel.addImagePlaceholder': 'https://example.com/image.jpg',
        'infoPanel.add': 'Add',
        'infoPanel.clearAll': 'Clear All',
        'infoPanel.saved': 'Info panel saved',
        'infoPanel.clearConfirm': 'Clear all info panel content for this location?',
        'infoPanel.enterUrl': 'Please enter an image URL',
        'infoPanel.invalidUrl': 'Please enter a valid URL starting with http:// or https://',
        'infoPanel.maxImages': 'Maximum 5 images per location',
        'infoPanel.categories': 'Categories:',
        'infoPanel.auto': '(auto)',
        'infoPanel.resetToAuto': 'Reset to Auto',

        // Door Swing Configuration
        'doorSwing.title': 'Door Swing',
        'doorSwing.direction': 'Direction:',
        'doorSwing.intoRoom': 'Into Room',
        'doorSwing.outToHall': 'Out to Hall',
        'doorSwing.side': 'Side:',
        'doorSwing.top': 'Top',
        'doorSwing.bottom': 'Bottom',
        'doorSwing.left': 'Left',
        'doorSwing.right': 'Right',
        'doorSwing.hingeSide': 'Hinge Side:',
        'doorSwing.hingeLeft': 'Left',
        'doorSwing.hingeRight': 'Right',
        'doorSwing.preview': 'Preview:',
        'doorSwing.removeSwing': 'Remove Swing',

        // Notifications / Confirmations
        'notify.unsavedLogout': 'You have unsaved changes. Are you sure you want to logout without saving?',
        'notify.unsavedSwitch': 'You have unsaved changes. Are you sure you want to switch maps without saving?',
        'notify.unsavedFloorSwitch': 'You have unsaved changes. Are you sure you want to switch floors without saving?',
        'notify.unsavedStartFloor': 'You have unsaved changes. Switch to the start location\'s floor anyway?',
        'notify.unsavedFindRoom': 'You have unsaved changes. Switch maps to find this room?',
        'notify.clearMapConfirm': 'Clear the entire map?',
        'notify.floorUnavailable': 'The {direction} floor for {building} is not yet available.',

        // Pathfinder messages
        'pathfinder.selectBothLocations': 'Please select a valid starting location and destination from the suggestions.',
        'pathfinder.selectStart': 'Please select a valid starting location from the suggestions.',
        'pathfinder.selectDestination': 'Please select a valid destination from the suggestions.',
        'pathfinder.sameLocation': 'Start and destination are the same location!',
        'pathfinder.noCrossBuilding': 'Sorry, we couldn\'t find a route between these locations. They appear to be in separate buildings without a connected pathway.',
        'pathfinder.notAccessibleElevator': 'This location is not accessible via elevator. It can only be reached using stairs.',
        'pathfinder.noRouteFound': 'Apologies, an error has occurred and we could not find a path between these locations. Feel free to alert support staff of this issue.',
        'pathfinder.errorReadingData': 'Error reading location data. Please re-select your locations.',
        'pathfinder.aboutSteps': 'About {count} steps',
        'pathfinder.useToChange': 'Use {stairs} to change floors',
        'pathfinder.useThenUse': 'Use {stairs1}, then {stairs2}',
        'pathfinder.floorChangeRequired': 'Floor change required',
        'pathfinder.elevatorEnabled': 'Elevator mode enabled. Routes will use elevator only.',
        'pathfinder.elevatorDisabled': 'Elevator mode disabled. Routes will use stairs.',
        'pathfinder.noResults': 'No results found',
        'pathfinder.selected': 'Selected: {label}',
        'pathfinder.noMatchingLocation': 'No matching location found',
        'pathfinder.selectFromSuggestions': 'Please select a room from the suggestions',

        // Route instructions
        'route.goTo': 'Go to {location}',
        'route.goDownWalkTo': 'Go down, walk to {location}',
        'route.goUpWalkTo': 'Go up, walk to {location}',
        'route.goUpstairs': 'Go upstairs',
        'route.goDownstairs': 'Go downstairs',
        'route.from': 'From {location}',
        'route.goToDestination': 'Go to {location}',
        'route.goUp': 'Go up',
        'route.goDown': 'Go down',
        'route.room': 'Room',
        'route.start': 'Start',
        'route.destination': 'Destination',

        // Mode names (for info display)
        'mode.pan': 'Pan',
        'mode.draw': 'Draw',
        'mode.textbox': 'Textbox',
        'mode.bucket': 'Bucket',
        'mode.info': 'Info Panel',

        // Skip links
        'a11y.skipToMap': 'Skip to map',
        'a11y.skipToPathfinder': 'Skip to pathfinder',
        'a11y.mapAriaLabel': 'Interactive campus map. Use the pathfinder panel to search for rooms and get directions.',
        'a11y.openControlPanel': 'Open control panel menu',
        'a11y.closeControlPanel': 'Close control panel',
        'a11y.closePathfinder': 'Close pathfinder panel',
        'a11y.closeLocationDetails': 'Close location details',
        'a11y.swapLocations': 'Swap start and end locations',

        // Location dropdown
        'location.loading': 'Loading...',

        // ============================================
        // HOW-TO GUIDE (how_to_guide.html)
        // ============================================
        'guide.backLink': '\u2190 Back to GuidePost360',
        'guide.title': 'GuidePost360 How-To Guide',
        'guide.subtitle': 'Quick reference for navigating and using the campus map',

        // Tab buttons
        'guide.tabStarted': 'Getting Started',
        'guide.tabNavigating': 'Navigating',
        'guide.tabFinding': 'Finding Rooms',
        'guide.tabDirections': 'Directions',
        'guide.tabHelp': 'Help',

        // Getting Started tab
        'guide.startedTitle': 'Getting Started',
        'guide.signingIn': 'Signing In',
        'guide.signInStep1': 'On the dashboard, click the <strong>Safety Personnel</strong> button',
        'guide.signInStep2': 'You will be taken directly to the map',
        'guide.signInTip': '<strong>Tip:</strong> If you need elevator-accessible routes, check the <strong>"I need elevator access"</strong> box before signing in.',
        'guide.firstTimeAgreement': 'First-Time Agreement',
        'guide.firstTimeDesc': 'The first time you open the map in a browser session, a brief privacy notice will appear. Click <strong>I Agree</strong> to continue. This only appears once per session.',
        'guide.pageControls': 'Page Controls',
        'guide.controlCol': 'Control',
        'guide.locationCol': 'Location',
        'guide.whatItDoesCol': 'What It Does',
        'guide.themeToggleLabel': '<i data-lucide="moon" style="width:1em;height:1em;display:inline-block;vertical-align:-0.125em"></i> / <i data-lucide="sun" style="width:1em;height:1em;display:inline-block;vertical-align:-0.125em"></i> Theme Toggle',
        'guide.topRight': 'Top-right corner',
        'guide.themeToggleDesc': 'Switch between light and dark mode (your preference is saved)',
        'guide.langToggleLabel': '<strong>ES</strong> Language Toggle',
        'guide.bottomLeft': 'Bottom-left corner',
        'guide.langToggleDesc': 'Switch the interface between English and Spanish',
        'guide.supportLabel': '<strong>?</strong> Support Button',
        'guide.bottomRight': 'Bottom-right corner',
        'guide.supportDesc': 'Send feedback, report bugs, or ask questions',
        'guide.quickTips': 'Dashboard Quick Tips',
        'guide.quickTipsDesc': 'The dashboard shows helpful tips before you sign in:',
        'guide.quickTipsDesktop': '<strong>Desktop:</strong> Keyboard shortcuts and mouse controls',
        'guide.quickTipsMobile': '<strong>Mobile:</strong> Touch gestures and navigation tips',

        // Navigating tab
        'guide.navTitle': 'Navigating the Map',
        'guide.movingAround': 'Moving Around',
        'guide.actionCol': 'Action',
        'guide.desktopCol': 'Desktop',
        'guide.mobileCol': 'Mobile',
        'guide.panMove': 'Pan / Move',
        'guide.clickDrag': 'Click and drag',
        'guide.touchDrag': 'Touch and drag',
        'guide.zoomInOut': 'Zoom in/out',
        'guide.scrollWheel': 'Scroll wheel or touchpad',
        'guide.pinchZoom': 'Pinch to zoom',
        'guide.rotateMap': 'Rotate map',
        'guide.rotateKeys': 'Press <kbd>A</kbd> (left) or <kbd>D</kbd> (right)',
        'guide.twoFingerRotate': 'Two-finger rotation',
        'guide.resetRotation': 'Reset rotation',
        'guide.resetRotationDesktop': 'Click <i data-lucide="rotate-ccw" style="width:1em;height:1em;display:inline-block;vertical-align:-0.125em"></i> Reset Rotation or press <kbd>R</kbd>',
        'guide.resetRotationMobile': 'Tap <i data-lucide="rotate-ccw" style="width:1em;height:1em;display:inline-block;vertical-align:-0.125em"></i> Reset Rotation',
        'guide.recenterMap': 'Recenter map',
        'guide.pressR': 'Press <kbd>R</kbd>',
        'guide.usePathfinderPanel': 'Use Pathfinder panel',
        'guide.switchingBuildings': 'Switching Buildings & Floors',
        'guide.useDropdown': 'Use the <strong>dropdown menu</strong> in the top-left corner of the map',
        'guide.clickToSeeAll': 'Click it to see all available buildings and floors',
        'guide.selectLocation': 'Select the location you want to view',
        'guide.alsoSwitchFloors': 'You can also switch floors by clicking a staircase or elevator on the map \u2014 see the <strong>Help</strong> tab for details on floor switching.',
        'guide.keyboardShortcuts': 'Keyboard Shortcuts (Desktop Only)',
        'guide.keyCol': 'Key',
        'guide.recenterTheMap': 'Recenter the map',
        'guide.rotateLeft': 'Rotate map left',
        'guide.rotateRight': 'Rotate map right',

        // Finding Rooms tab
        'guide.findTitle': 'Finding Rooms',
        'guide.usingRoomFinder': 'Using Room Finder (Quick Search)',
        'guide.openPathfinder': 'Open the <strong>Pathfinder panel</strong>:',
        'guide.pathfinderMobile': '<strong>Mobile:</strong> Swipe up from the bottom, or tap the <i data-lucide="compass" style="width:1em;height:1em;display:inline-block;vertical-align:-0.125em"></i> Pathfinder tab',
        'guide.pathfinderDesktop': '<strong>Desktop:</strong> Click the <i data-lucide="compass" style="width:1em;height:1em;display:inline-block;vertical-align:-0.125em"></i> Pathfinder tab on the left side',
        'guide.scrollToRoomFinder': 'Scroll down to the <strong>Room Finder</strong> section',
        'guide.typeRoomSearch': 'Type a room number, location name, or related term',
        'guide.selectSuggestion': 'Select from the suggestions that appear',
        'guide.clickFind': 'Click <strong>Find</strong> \u2014 the map will zoom to that location and highlight it with a yellow star',
        'guide.tappingMap': 'Tapping on the Map',
        'guide.tapRoomDesc': 'Click or tap any room label directly on the map to open an info panel popup showing:',
        'guide.infoRoomName': '<strong>Room name</strong> and <strong>room number</strong>',
        'guide.infoFloor': '<strong>Floor / building</strong> location',
        'guide.infoDesc': '<strong>Description</strong> (if one has been added)',
        'guide.infoImages': '<strong>Images</strong> (if any have been added)',
        'guide.infoDirections': '<strong>Directions From</strong> / <strong>Directions To</strong> buttons to quickly start navigation',
        'guide.searchTips': 'Search Tips',
        'guide.searchByRoom': 'You can search by <strong>room number</strong> or <strong>location names</strong> (e.g., "bathroom", "cafeteria", "gym")',
        'guide.searchAliases': 'Many locations have aliases \u2014 for example, searching "lunchroom" will find the Commons',
        'guide.searchTryRelated': 'If you can\'t find something, try a related term',

        // Directions tab
        'guide.dirTitle': 'Getting Directions',
        'guide.usingPathfinder': 'Using the Pathfinder',
        'guide.fromField': 'In the <strong>From</strong> field, type your starting location',
        'guide.toField': 'In the <strong>To</strong> field, type your destination',
        'guide.clickFindRoute': 'Click <strong>Find Route</strong>',
        'guide.readingRoute': 'Reading Your Route',
        'guide.coloredPath': 'A <strong>colored path</strong> appears on the map showing your route with a <strong>green dot</strong> moving along the path to indicate movement direction',
        'guide.perFloorInstructions': '<strong>Per-floor instructions</strong> appear in the header bar at the top of the screen',
        'guide.clickableSteps': 'Each step in the header bar is <strong>clickable</strong> \u2014 tap any step to jump back to it',
        'guide.crossesFloors': 'If the route crosses floors, you\'ll see which stairs or elevator to use',
        'guide.quickDirections': 'Quick Directions from a Room',
        'guide.quickDirectionsDesc': 'You can also start directions directly from any room\'s info panel popup:',
        'guide.tapForDirections': 'Tap a room label on the map to open the info panel',
        'guide.clickDirFromTo': 'Click <strong>Directions From</strong> to set it as your starting point, or <strong>Directions To</strong> to set it as your destination',
        'guide.fillOtherField': 'Fill in the other field and click <strong>Find Route</strong>',
        'guide.elevatorMode': 'Elevator Mode',
        'guide.avoidStairs': 'If you need to avoid stairs:',
        'guide.elevatorCheckbox': 'Check the <strong>"I need elevator access"</strong> box on the dashboard before signing in, OR',
        'guide.elevatorToggle': 'Toggle <strong>Elevator Mode</strong> in the Pathfinder panel at any time',
        'guide.elevatorModeDesc': 'When enabled, all routes will use elevators instead of stairs. If no elevator access is possible for a given route, a warning message will appear.',
        'guide.routeTips': 'Route Tips',
        'guide.clickClear': 'Click <strong>Clear</strong> to remove the current route and start over',
        'guide.searchInFields': 'You can search by room number or common location names in both From and To fields',

        // Help tab
        'guide.helpTitle': 'Floor Switching & Troubleshooting',
        'guide.switchingStaircases': 'Switching Floors via Staircases',
        'guide.clickStaircase': 'When you click on a staircase or elevator on the map:',
        'guide.infoPanelAppears': 'An info panel popup appears with floor information',
        'guide.clickGoUpDown': 'Click the <strong>Go Upstairs</strong> or <strong>Go Downstairs</strong> button',
        'guide.mapAutoSwitches': 'The map automatically switches to that floor and opens the corresponding staircase\'s info panel on the new floor',
        'guide.switchFloorsTip': '<strong>Tip:</strong> You can also switch buildings/floors at any time using the dropdown menu in the top-left corner.',
        'guide.troubleshooting': 'Troubleshooting',
        'guide.mapNotLoading': 'Map not loading?',
        'guide.refreshPage': 'Refresh the page',
        'guide.checkInternet': 'Make sure you\'re connected to the internet',
        'guide.cantFindRoom': 'Can\'t find a room?',
        'guide.tryRelatedTerm': 'Try searching by a related term (e.g., "gym" instead of "gymnasium")',
        'guide.checkCorrectFloor': 'Check if you\'re looking on the correct building or floor',
        'guide.routeNotShowing': 'Route not showing?',
        'guide.bothFieldsFilled': 'Make sure both the From and To fields are filled in',
        'guide.clearAndRetry': 'Clear the route and try again',
        'guide.gettingHelp': 'Getting Help',
        'guide.clickSupport': 'Click the <strong>?</strong> button in the bottom-right corner of any page to contact support',
        'guide.sendFeedbackHelp': 'You can send feedback, report bugs, or ask questions directly from there',
    },

    es: {
        // ============================================
        // COMMON
        // ============================================
        'common.loading': 'Cargando...',
        'common.ok': 'Ok',
        'common.yes': 'S\u00ed',
        'common.no': 'No',
        'common.save': 'Guardar',
        'common.cancel': 'Cancelar',
        'common.back': 'Volver',
        'common.clear': 'Borrar',
        'common.close': 'Cerrar',
        'common.error': 'Error',
        'common.upstairs': 'Piso de arriba',
        'common.downstairs': 'Piso de abajo',
        'common.support': 'Soporte',
        'common.supportQuestion': '\u00bfTienes comentarios, preguntas o recomendaciones? \u00a1Nos encantar\u00eda saber de ti!',
        'common.sendFeedback': 'Enviar comentarios',

        // ============================================
        // DASHBOARD
        // ============================================
        'dashboard.title': 'GuidePost360',
        'dashboard.subtitle': 'Sistema de navegaci\u00f3n del campus',
        'dashboard.signinQuestion': '\u00bfC\u00f3mo est\u00e1s iniciando sesi\u00f3n?',
        'dashboard.admin': 'Administrador',
        'dashboard.personnel': 'Personal de seguridad',
        'dashboard.elevatorCheckbox': 'Necesito acceso al ascensor (evitar escaleras)',
        'dashboard.quickTips': 'Consejos r\u00e1pidos',
        'dashboard.helpResources': 'Ayuda y recursos',
        'dashboard.helpDescription': '\u00bfNuevo en GuidePost360? Consulta nuestra gu\u00eda para comenzar.',
        'dashboard.viewGuide': 'Ver la gu\u00eda',
        // Desktop tips
        'dashboard.tipRecenter': 'Presiona <strong>R</strong> para recentrar la vista del mapa',
        'dashboard.tipRotate': 'Usa las teclas <strong>A</strong> y <strong>D</strong> para rotar el mapa',
        'dashboard.tipDirections': 'Haz clic en <strong>Obtener direcciones</strong> para navegaci\u00f3n paso a paso',
        'dashboard.tipFloorDropdown': 'Usa el <strong>men\u00fa de pisos</strong> para cambiar entre edificios',
        // Mobile tips
        'dashboard.tipSwipeUp': '<strong>Desliza hacia arriba</strong> desde abajo para el buscador de rutas',
        'dashboard.tipTapDirections': 'Toca <strong>Obtener direcciones</strong> para navegaci\u00f3n paso a paso',
        'dashboard.tipFloorDropdownMobile': 'Usa el <strong>men\u00fa de pisos</strong> para cambiar de edificio',
        'dashboard.tipTapRoom': 'Toca cualquier <strong>nombre de sal\u00f3n</strong> para ver detalles',
        // Admin login
        'dashboard.adminLogin': 'Inicio de sesi\u00f3n de administrador',
        'dashboard.username': 'Usuario',
        'dashboard.password': 'Contrase\u00f1a',
        'dashboard.schoolEmail': 'Correo electr\u00f3nico escolar',
        'dashboard.usernamePlaceholder': 'Ingresa tu nombre de usuario',
        'dashboard.passwordPlaceholder': 'Ingresa tu contrase\u00f1a',
        'dashboard.emailPlaceholder': 'tu@ejemplo.com',
        'dashboard.signIn': 'Iniciar sesi\u00f3n',
        
        // Theme toggle
        'dashboard.toggleDark': 'Cambiar a modo oscuro',
        'dashboard.toggleLight': 'Cambiar a modo claro',
        'dashboard.darkMode': 'Modo oscuro',
        'dashboard.lightMode': 'Modo claro',
        'dashboard.appearance': 'Apariencia',

        // ============================================
        // FLASH MESSAGES
        // ============================================
        'flash.tooManyAttempts': 'Demasiados intentos de inicio de sesi\u00f3n. Por favor espera 30 minutos antes de intentar de nuevo.',
        'flash.invalidCredentials': 'Usuario o contrase\u00f1a incorrectos',
        'flash.loginRequired': 'Por favor inicia sesi\u00f3n primero',
        'flash.loggedOut': 'Has cerrado sesi\u00f3n',
        'flash.permissionDenied': 'Permiso denegado',
        'flash.invalidFilename': 'Nombre de archivo inv\u00e1lido',
        'flash.saveFailed': 'Error al guardar el mapa. Por favor int\u00e9ntalo de nuevo.',
        'flash.loadFailed': 'Error al cargar el mapa. Por favor int\u00e9ntalo de nuevo.',

        // ============================================
        // MAP EDITOR
        // ============================================
        // User bar
        'editor.resetRotation': 'Restablecer rotaci\u00f3n',
        'editor.resetRotationTitle': 'Restablecer rotaci\u00f3n del mapa (teclas A/D para rotar)',
        'editor.dark': 'Oscuro',
        'editor.light': 'Claro',
        'editor.switchToDark': 'Cambiar a modo oscuro',
        'editor.switchToLight': 'Cambiar a modo claro',
        'editor.logout': 'Salir',

        // Pathfinder panel
        'editor.pathfinder': 'Buscador de rutas',
        'editor.scaleNotice': 'Nota: El mapa no est\u00e1 dibujado a escala',
        'editor.from': 'Desde:',
        'editor.to': 'Hasta:',
        'editor.namePlaceholder': 'Nombre o n\u00fam. de sal\u00f3n',
        'editor.elevatorMode': 'Modo ascensor (evitar escaleras)',
        'editor.quickFind': 'Buscar:',
        'category.restrooms': 'Baños',
        'category.classrooms': 'Aulas',
        'category.stairs': 'Escaleras',
        'category.elevators': 'Ascensores',
        'category.exits': 'Salidas',
        'a11y.clearFilter': 'Borrar filtro',
        'editor.findRoute': 'Buscar ruta',
        'editor.finding': 'Buscando...',

        // Room finder
        'editor.roomFinder': 'Buscador de salones',
        'editor.findRoom': 'Buscar un sal\u00f3n:',
        'editor.find': 'Buscar',

        // Location popup
        'popup.room': 'Sal\u00f3n:',
        'popup.floor': 'Piso:',
        'popup.goUpstairs': 'Subir \u2191',
        'popup.goDownstairs': 'Bajar \u2193',
        'popup.directionsFrom': 'Direcciones desde',
        'popup.directionsTo': 'Direcciones hacia',

        // View toggle
        'editor.switchToNav': 'Cambiar a vista de navegaci\u00f3n',
        'editor.switchToEditor': 'Cambiar a vista de editor',

        // Control panel
        'editor.mode': 'Modo',
        'editor.tileColor': 'Color de mosaico',
        'editor.actions': 'Acciones',
        'editor.file': 'Archivo',
        'editor.info': 'Info',
        'editor.pan': 'Mover',
        'editor.draw': 'Dibujar',
        'editor.textbox': 'Texto',
        'editor.bucket': 'Balde',
        'editor.infoPanel': 'Panel de info',
        'editor.zoomIn': 'Acercar',
        'editor.zoomOut': 'Alejar',
        'editor.recenter': 'Recentrar',
        'editor.undo': 'Deshacer',
        'editor.clearMap': 'Borrar',
        'editor.saveBtn': 'Guardar',
        'editor.loadBtn': 'Cargar',
        'editor.zoom': 'Zoom:',
        'editor.position': 'Posici\u00f3n:',
        'editor.modeLabel': 'Modo:',
        'editor.newTextbox': 'Nuevo cuadro de texto',

        // Tile colors
        'tile.white': 'Blanco - Borrador/Fondo',
        'tile.navy': 'Azul marino - Paredes',
        'tile.orange': 'Naranja - Acento',
        'tile.lightBlue': 'Azul claro - Pasillos/Transitable',
        'tile.black': 'Negro - Bordes',
        'tile.doorway': 'Puerta - parece negro pero transitable',
        'tile.avoidZone': 'Zona de evitaci\u00f3n - parece pasillo pero el buscador lo evita',
        'tile.sidewalk': 'Acera - camino exterior (no transitable)',

        // Save dialog
        'save.title': 'Guardar mapa',
        'save.filenamePlaceholder': 'Ingresa un nombre de archivo...',
        'save.overwriteExisting': 'O sobrescribir archivo existente:',
        'save.noExistingFiles': 'No hay archivos existentes',
        'save.errorLoadingFiles': 'Error al cargar archivos',
        'save.current': 'actual',
        'save.blank': 'vac\u00edo',
        'save.cannotOverwrite': 'No se puede sobrescribir: este es un archivo de mapa diferente',
        'save.cannotSaveTo': 'No se puede guardar en "{filename}" - este es un archivo de mapa diferente. Para evitar sobrescrituras accidentales, solo puedes guardar en el archivo que est\u00e1s editando actualmente.',
        'save.cannotSaveToFull': 'No se puede guardar en "{filename}" - este es un archivo de mapa diferente. Para evitar sobrescrituras accidentales, solo puedes guardar en: el archivo actual ({currentFile}), un archivo vac\u00edo, o un nombre de archivo nuevo.',
        'save.enterFilename': 'Por favor ingresa un nombre de archivo o selecciona uno existente para sobrescribir',
        'save.confirmOverwrite': '\u00bfGuardar cambios en "{name}"?',
        'save.confirmBlank': '"{name}" est\u00e1 vac\u00edo. \u00bfGuardar en este archivo?',
        'save.errorSaving': 'Error al guardar el mapa: ',
        'save.errorLoadingList': 'Error al cargar la lista de archivos. Por favor int\u00e9ntalo de nuevo.',
        'save.saving': 'Guardando...',

        // Load dialog
        'load.title': 'Cargar mapa',
        'load.noSavedMaps': 'No se encontraron mapas guardados',
        'load.unsavedConfirm': 'Tienes cambios sin guardar. \u00bfEst\u00e1s seguro de que quieres cargar otro mapa sin guardar?',
        'load.errorLoading': 'Error al cargar el mapa: ',
        'load.failedToLoad': 'Error al cargar el mapa. Por favor int\u00e9ntalo de nuevo.',

        // Textbox editing
        'textbox.editTitle': 'Editar cuadro de texto',
        'textbox.markerLabel': 'Marcador (fondo transparente)',
        'textbox.fontSize': 'Tama\u00f1o de fuente:',
        'textbox.horizontalAlign': 'Alineaci\u00f3n horizontal:',
        'textbox.verticalAlign': 'Alineaci\u00f3n vertical:',
        'textbox.left': 'Izquierda',
        'textbox.center': 'Centro',
        'textbox.right': 'Derecha',
        'textbox.top': 'Arriba',
        'textbox.middle': 'Centro',
        'textbox.bottom': 'Abajo',
        'textbox.remove': 'Eliminar',
        'textbox.removeConfirm': '\u00bfEliminar este cuadro de texto?',
        'textbox.charTruncated': 'Texto recortado a {max} caracteres.',
        'textbox.lineTruncated': 'Texto recortado a {max} l\u00edneas.',

        // Info panel editing
        'infoPanel.editTitle': 'Editar panel de informaci\u00f3n',
        'infoPanel.description': 'Descripci\u00f3n:',
        'infoPanel.descPlaceholder': 'Ingresa una descripci\u00f3n para esta ubicaci\u00f3n...',
        'infoPanel.images': 'Im\u00e1genes (URLs):',
        'infoPanel.addImagePlaceholder': 'https://ejemplo.com/imagen.jpg',
        'infoPanel.add': 'Agregar',
        'infoPanel.clearAll': 'Borrar todo',
        'infoPanel.saved': 'Panel de informaci\u00f3n guardado',
        'infoPanel.clearConfirm': '\u00bfBorrar todo el contenido del panel de informaci\u00f3n de esta ubicaci\u00f3n?',
        'infoPanel.enterUrl': 'Por favor ingresa una URL de imagen',
        'infoPanel.invalidUrl': 'Por favor ingresa una URL v\u00e1lida que comience con http:// o https://',
        'infoPanel.maxImages': 'M\u00e1ximo 5 im\u00e1genes por ubicaci\u00f3n',
        'infoPanel.categories': 'Categor\u00edas:',
        'infoPanel.auto': '(auto)',
        'infoPanel.resetToAuto': 'Restaurar a autom\u00e1tico',

        // Door Swing Configuration
        'doorSwing.title': 'Apertura de Puerta',
        'doorSwing.direction': 'Direcci\u00f3n:',
        'doorSwing.intoRoom': 'Hacia el cuarto',
        'doorSwing.outToHall': 'Hacia el pasillo',
        'doorSwing.side': 'Lado:',
        'doorSwing.top': 'Arriba',
        'doorSwing.bottom': 'Abajo',
        'doorSwing.left': 'Izquierda',
        'doorSwing.right': 'Derecha',
        'doorSwing.hingeSide': 'Lado de bisagra:',
        'doorSwing.hingeLeft': 'Izquierda',
        'doorSwing.hingeRight': 'Derecha',
        'doorSwing.preview': 'Vista previa:',
        'doorSwing.removeSwing': 'Eliminar apertura',

        // Notifications / Confirmations
        'notify.unsavedLogout': 'Tienes cambios sin guardar. \u00bfEst\u00e1s seguro de que quieres cerrar sesi\u00f3n sin guardar?',
        'notify.unsavedSwitch': 'Tienes cambios sin guardar. \u00bfEst\u00e1s seguro de que quieres cambiar de mapa sin guardar?',
        'notify.unsavedFloorSwitch': 'Tienes cambios sin guardar. \u00bfEst\u00e1s seguro de que quieres cambiar de piso sin guardar?',
        'notify.unsavedStartFloor': 'Tienes cambios sin guardar. \u00bfCambiar al piso de la ubicaci\u00f3n de inicio de todos modos?',
        'notify.unsavedFindRoom': 'Tienes cambios sin guardar. \u00bfCambiar de mapa para encontrar este sal\u00f3n?',
        'notify.clearMapConfirm': '\u00bfBorrar todo el mapa?',
        'notify.floorUnavailable': 'El piso {direction} de {building} a\u00fan no est\u00e1 disponible.',

        // Pathfinder messages
        'pathfinder.selectBothLocations': 'Por favor selecciona una ubicaci\u00f3n de inicio y destino v\u00e1lidos de las sugerencias.',
        'pathfinder.selectStart': 'Por favor selecciona una ubicaci\u00f3n de inicio v\u00e1lida de las sugerencias.',
        'pathfinder.selectDestination': 'Por favor selecciona un destino v\u00e1lido de las sugerencias.',
        'pathfinder.sameLocation': '\u00a1La ubicaci\u00f3n de inicio y destino son las mismas!',
        'pathfinder.noCrossBuilding': 'Lo sentimos, no pudimos encontrar una ruta entre estas ubicaciones. Parecen estar en edificios separados sin un camino conectado.',
        'pathfinder.notAccessibleElevator': 'Esta ubicaci\u00f3n no es accesible por ascensor. Solo se puede llegar usando escaleras.',
        'pathfinder.noRouteFound': 'Disculpa, ha ocurrido un error y no pudimos encontrar una ruta entre estas ubicaciones. No dudes en alertar al personal de soporte sobre este problema.',
        'pathfinder.errorReadingData': 'Error al leer datos de ubicaci\u00f3n. Por favor vuelve a seleccionar tus ubicaciones.',
        'pathfinder.aboutSteps': 'Aproximadamente {count} pasos',
        'pathfinder.useToChange': 'Usa {stairs} para cambiar de piso',
        'pathfinder.useThenUse': 'Usa {stairs1}, luego {stairs2}',
        'pathfinder.floorChangeRequired': 'Se requiere cambio de piso',
        'pathfinder.elevatorEnabled': 'Modo ascensor activado. Las rutas usar\u00e1n solo el ascensor.',
        'pathfinder.elevatorDisabled': 'Modo ascensor desactivado. Las rutas usar\u00e1n escaleras.',
        'pathfinder.noResults': 'No se encontraron resultados',
        'pathfinder.selected': 'Seleccionado: {label}',
        'pathfinder.noMatchingLocation': 'No se encontr\u00f3 una ubicaci\u00f3n que coincida',
        'pathfinder.selectFromSuggestions': 'Por favor selecciona un sal\u00f3n de las sugerencias',

        // Route instructions
        'route.goTo': 'Ir a {location}',
        'route.goDownWalkTo': 'Bajar, caminar a {location}',
        'route.goUpWalkTo': 'Subir, caminar a {location}',
        'route.goUpstairs': 'Subir las escaleras',
        'route.goDownstairs': 'Bajar las escaleras',
        'route.from': 'Desde {location}',
        'route.goToDestination': 'Ir a {location}',
        'route.goUp': 'Subir',
        'route.goDown': 'Bajar',
        'route.room': 'Sal\u00f3n',
        'route.start': 'Inicio',
        'route.destination': 'Destino',

        // Mode names
        'mode.pan': 'Mover',
        'mode.draw': 'Dibujar',
        'mode.textbox': 'Texto',
        'mode.bucket': 'Balde',
        'mode.info': 'Panel de info',

        // Skip links
        'a11y.skipToMap': 'Ir al mapa',
        'a11y.skipToPathfinder': 'Ir al buscador de rutas',
        'a11y.mapAriaLabel': 'Mapa interactivo del campus. Usa el panel de buscador de rutas para buscar salones y obtener direcciones.',
        'a11y.openControlPanel': 'Abrir panel de control',
        'a11y.closeControlPanel': 'Cerrar panel de control',
        'a11y.closePathfinder': 'Cerrar panel de buscador de rutas',
        'a11y.closeLocationDetails': 'Cerrar detalles de ubicaci\u00f3n',
        'a11y.swapLocations': 'Intercambiar ubicaciones de inicio y fin',

        // Location dropdown
        'location.loading': 'Cargando...',

        // ============================================
        // HOW-TO GUIDE
        // ============================================
        'guide.backLink': '\u2190 Volver a GuidePost360',
        'guide.title': 'Gu\u00eda de uso de GuidePost360',
        'guide.subtitle': 'Referencia r\u00e1pida para navegar y usar el mapa del campus',

        // Tab buttons
        'guide.tabStarted': 'Inicio',
        'guide.tabNavigating': 'Navegaci\u00f3n',
        'guide.tabFinding': 'Buscar salones',
        'guide.tabDirections': 'Direcciones',
        'guide.tabHelp': 'Ayuda',

        // Getting Started tab
        'guide.startedTitle': 'Inicio',
        'guide.signingIn': 'Iniciar sesi\u00f3n',
        'guide.signInStep1': 'En el panel principal, haz clic en el bot\u00f3n <strong>Personal de seguridad</strong>',
        'guide.signInStep2': 'Ser\u00e1s llevado directamente al mapa',
        'guide.signInTip': '<strong>Consejo:</strong> Si necesitas rutas accesibles por ascensor, marca la casilla <strong>"Necesito acceso al ascensor"</strong> antes de iniciar sesi\u00f3n.',
        'guide.firstTimeAgreement': 'Acuerdo inicial',
        'guide.firstTimeDesc': 'La primera vez que abras el mapa en una sesi\u00f3n del navegador, aparecer\u00e1 un breve aviso de privacidad. Haz clic en <strong>Acepto</strong> para continuar. Esto solo aparece una vez por sesi\u00f3n.',
        'guide.pageControls': 'Controles de la p\u00e1gina',
        'guide.controlCol': 'Control',
        'guide.locationCol': 'Ubicaci\u00f3n',
        'guide.whatItDoesCol': 'Qu\u00e9 hace',
        'guide.themeToggleLabel': '<i data-lucide="moon" style="width:1em;height:1em;display:inline-block;vertical-align:-0.125em"></i> / <i data-lucide="sun" style="width:1em;height:1em;display:inline-block;vertical-align:-0.125em"></i> Cambiar tema',
        'guide.topRight': 'Esquina superior derecha',
        'guide.themeToggleDesc': 'Cambiar entre modo claro y oscuro (tu preferencia se guarda)',
        'guide.langToggleLabel': '<strong>ES</strong> Cambiar idioma',
        'guide.bottomLeft': 'Esquina inferior izquierda',
        'guide.langToggleDesc': 'Cambiar la interfaz entre ingl\u00e9s y espa\u00f1ol',
        'guide.supportLabel': '<strong>?</strong> Bot\u00f3n de soporte',
        'guide.bottomRight': 'Esquina inferior derecha',
        'guide.supportDesc': 'Enviar comentarios, reportar errores o hacer preguntas',
        'guide.quickTips': 'Consejos r\u00e1pidos del panel',
        'guide.quickTipsDesc': 'El panel principal muestra consejos \u00fatiles antes de iniciar sesi\u00f3n:',
        'guide.quickTipsDesktop': '<strong>Escritorio:</strong> Atajos de teclado y controles del rat\u00f3n',
        'guide.quickTipsMobile': '<strong>M\u00f3vil:</strong> Gestos t\u00e1ctiles y consejos de navegaci\u00f3n',

        // Navigating tab
        'guide.navTitle': 'Navegando el mapa',
        'guide.movingAround': 'Moverse por el mapa',
        'guide.actionCol': 'Acci\u00f3n',
        'guide.desktopCol': 'Escritorio',
        'guide.mobileCol': 'M\u00f3vil',
        'guide.panMove': 'Mover / Desplazar',
        'guide.clickDrag': 'Clic y arrastrar',
        'guide.touchDrag': 'Tocar y arrastrar',
        'guide.zoomInOut': 'Acercar / Alejar',
        'guide.scrollWheel': 'Rueda del rat\u00f3n o panel t\u00e1ctil',
        'guide.pinchZoom': 'Pellizcar para zoom',
        'guide.rotateMap': 'Rotar mapa',
        'guide.rotateKeys': 'Presiona <kbd>A</kbd> (izquierda) o <kbd>D</kbd> (derecha)',
        'guide.twoFingerRotate': 'Rotaci\u00f3n con dos dedos',
        'guide.resetRotation': 'Restablecer rotaci\u00f3n',
        'guide.resetRotationDesktop': 'Haz clic en <i data-lucide="rotate-ccw" style="width:1em;height:1em;display:inline-block;vertical-align:-0.125em"></i> Restablecer rotaci\u00f3n o presiona <kbd>R</kbd>',
        'guide.resetRotationMobile': 'Toca <i data-lucide="rotate-ccw" style="width:1em;height:1em;display:inline-block;vertical-align:-0.125em"></i> Restablecer rotaci\u00f3n',
        'guide.recenterMap': 'Recentrar mapa',
        'guide.pressR': 'Presiona <kbd>R</kbd>',
        'guide.usePathfinderPanel': 'Usa el panel del buscador de rutas',
        'guide.switchingBuildings': 'Cambiar de edificio y piso',
        'guide.useDropdown': 'Usa el <strong>men\u00fa desplegable</strong> en la esquina superior izquierda del mapa',
        'guide.clickToSeeAll': 'Haz clic para ver todos los edificios y pisos disponibles',
        'guide.selectLocation': 'Selecciona la ubicaci\u00f3n que deseas ver',
        'guide.alsoSwitchFloors': 'Tambi\u00e9n puedes cambiar de piso haciendo clic en una escalera o ascensor en el mapa \u2014 consulta la pesta\u00f1a <strong>Ayuda</strong> para m\u00e1s detalles.',
        'guide.keyboardShortcuts': 'Atajos de teclado (solo escritorio)',
        'guide.keyCol': 'Tecla',
        'guide.recenterTheMap': 'Recentrar el mapa',
        'guide.rotateLeft': 'Rotar mapa a la izquierda',
        'guide.rotateRight': 'Rotar mapa a la derecha',

        // Finding Rooms tab
        'guide.findTitle': 'Buscar salones',
        'guide.usingRoomFinder': 'Usar el Buscador de salones (b\u00fasqueda r\u00e1pida)',
        'guide.openPathfinder': 'Abre el <strong>panel del Buscador de rutas</strong>:',
        'guide.pathfinderMobile': '<strong>M\u00f3vil:</strong> Desliza hacia arriba desde abajo, o toca la pesta\u00f1a <i data-lucide="compass" style="width:1em;height:1em;display:inline-block;vertical-align:-0.125em"></i> Buscador de rutas',
        'guide.pathfinderDesktop': '<strong>Escritorio:</strong> Haz clic en la pesta\u00f1a <i data-lucide="compass" style="width:1em;height:1em;display:inline-block;vertical-align:-0.125em"></i> Buscador de rutas en el lado izquierdo',
        'guide.scrollToRoomFinder': 'Despl\u00e1zate hasta la secci\u00f3n <strong>Buscador de salones</strong>',
        'guide.typeRoomSearch': 'Escribe un n\u00famero de sal\u00f3n, nombre de ubicaci\u00f3n o t\u00e9rmino relacionado',
        'guide.selectSuggestion': 'Selecciona de las sugerencias que aparecen',
        'guide.clickFind': 'Haz clic en <strong>Buscar</strong> \u2014 el mapa se acercar\u00e1 a esa ubicaci\u00f3n y la resaltar\u00e1 con una estrella amarilla',
        'guide.tappingMap': 'Tocar en el mapa',
        'guide.tapRoomDesc': 'Haz clic o toca cualquier nombre de sal\u00f3n directamente en el mapa para abrir un panel de informaci\u00f3n que muestra:',
        'guide.infoRoomName': '<strong>Nombre del sal\u00f3n</strong> y <strong>n\u00famero de sal\u00f3n</strong>',
        'guide.infoFloor': '<strong>Piso / edificio</strong> ubicaci\u00f3n',
        'guide.infoDesc': '<strong>Descripci\u00f3n</strong> (si se ha agregado una)',
        'guide.infoImages': '<strong>Im\u00e1genes</strong> (si se han agregado)',
        'guide.infoDirections': 'Botones de <strong>Direcciones desde</strong> / <strong>Direcciones hacia</strong> para iniciar navegaci\u00f3n r\u00e1pidamente',
        'guide.searchTips': 'Consejos de b\u00fasqueda',
        'guide.searchByRoom': 'Puedes buscar por <strong>n\u00famero de sal\u00f3n</strong> o <strong>nombres de ubicaci\u00f3n</strong> (p. ej., "ba\u00f1o", "cafeter\u00eda", "gimnasio")',
        'guide.searchAliases': 'Muchas ubicaciones tienen alias \u2014 por ejemplo, buscar "comedor" encontrar\u00e1 la cafeter\u00eda',
        'guide.searchTryRelated': 'Si no puedes encontrar algo, prueba con un t\u00e9rmino relacionado',

        // Directions tab
        'guide.dirTitle': 'Obtener direcciones',
        'guide.usingPathfinder': 'Usar el Buscador de rutas',
        'guide.fromField': 'En el campo <strong>Desde</strong>, escribe tu ubicaci\u00f3n de inicio',
        'guide.toField': 'En el campo <strong>Hasta</strong>, escribe tu destino',
        'guide.clickFindRoute': 'Haz clic en <strong>Buscar ruta</strong>',
        'guide.readingRoute': 'Leer tu ruta',
        'guide.coloredPath': 'Un <strong>camino de color</strong> aparece en el mapa mostrando tu ruta con un <strong>punto verde</strong> que se mueve a lo largo del camino para indicar la direcci\u00f3n',
        'guide.perFloorInstructions': '<strong>Instrucciones por piso</strong> aparecen en la barra superior de la pantalla',
        'guide.clickableSteps': 'Cada paso en la barra superior es <strong>seleccionable</strong> \u2014 toca cualquier paso para volver a \u00e9l',
        'guide.crossesFloors': 'Si la ruta cruza pisos, ver\u00e1s qu\u00e9 escaleras o ascensor usar',
        'guide.quickDirections': 'Direcciones r\u00e1pidas desde un sal\u00f3n',
        'guide.quickDirectionsDesc': 'Tambi\u00e9n puedes iniciar direcciones directamente desde el panel de informaci\u00f3n de cualquier sal\u00f3n:',
        'guide.tapForDirections': 'Toca un nombre de sal\u00f3n en el mapa para abrir el panel de informaci\u00f3n',
        'guide.clickDirFromTo': 'Haz clic en <strong>Direcciones desde</strong> para establecerlo como punto de inicio, o <strong>Direcciones hacia</strong> para establecerlo como destino',
        'guide.fillOtherField': 'Completa el otro campo y haz clic en <strong>Buscar ruta</strong>',
        'guide.elevatorMode': 'Modo ascensor',
        'guide.avoidStairs': 'Si necesitas evitar escaleras:',
        'guide.elevatorCheckbox': 'Marca la casilla <strong>"Necesito acceso al ascensor"</strong> en el panel principal antes de iniciar sesi\u00f3n, O',
        'guide.elevatorToggle': 'Activa el <strong>Modo ascensor</strong> en el panel del Buscador de rutas en cualquier momento',
        'guide.elevatorModeDesc': 'Cuando est\u00e1 activado, todas las rutas usar\u00e1n ascensores en lugar de escaleras. Si no es posible el acceso por ascensor para una ruta dada, aparecer\u00e1 un mensaje de advertencia.',
        'guide.routeTips': 'Consejos de ruta',
        'guide.clickClear': 'Haz clic en <strong>Borrar</strong> para eliminar la ruta actual y empezar de nuevo',
        'guide.searchInFields': 'Puedes buscar por n\u00famero de sal\u00f3n o nombres comunes de ubicaci\u00f3n en ambos campos Desde y Hasta',

        // Help tab
        'guide.helpTitle': 'Cambio de piso y soluci\u00f3n de problemas',
        'guide.switchingStaircases': 'Cambiar de piso por escaleras',
        'guide.clickStaircase': 'Cuando haces clic en una escalera o ascensor en el mapa:',
        'guide.infoPanelAppears': 'Aparece un panel de informaci\u00f3n con datos del piso',
        'guide.clickGoUpDown': 'Haz clic en el bot\u00f3n <strong>Subir</strong> o <strong>Bajar</strong>',
        'guide.mapAutoSwitches': 'El mapa cambia autom\u00e1ticamente a ese piso y abre el panel de informaci\u00f3n de la escalera correspondiente en el nuevo piso',
        'guide.switchFloorsTip': '<strong>Consejo:</strong> Tambi\u00e9n puedes cambiar de edificio/piso en cualquier momento usando el men\u00fa desplegable en la esquina superior izquierda.',
        'guide.troubleshooting': 'Soluci\u00f3n de problemas',
        'guide.mapNotLoading': '\u00bfEl mapa no carga?',
        'guide.refreshPage': 'Actualiza la p\u00e1gina',
        'guide.checkInternet': 'Aseg\u00farate de estar conectado a internet',
        'guide.cantFindRoom': '\u00bfNo encuentras un sal\u00f3n?',
        'guide.tryRelatedTerm': 'Prueba buscar por un t\u00e9rmino relacionado (p. ej., "gimnasio" en vez de "gym")',
        'guide.checkCorrectFloor': 'Verifica si est\u00e1s buscando en el edificio o piso correcto',
        'guide.routeNotShowing': '\u00bfLa ruta no aparece?',
        'guide.bothFieldsFilled': 'Aseg\u00farate de que ambos campos Desde y Hasta est\u00e9n completos',
        'guide.clearAndRetry': 'Borra la ruta e int\u00e9ntalo de nuevo',
        'guide.gettingHelp': 'Obtener ayuda',
        'guide.clickSupport': 'Haz clic en el bot\u00f3n <strong>?</strong> en la esquina inferior derecha de cualquier p\u00e1gina para contactar soporte',
        'guide.sendFeedbackHelp': 'Puedes enviar comentarios, reportar errores o hacer preguntas directamente desde ah\u00ed',
    }
};

// ============================================
// i18n ENGINE
// ============================================

const I18N_STORAGE_KEY = 'guidepost360_language';
let currentLanguage = localStorage.getItem(I18N_STORAGE_KEY) || 'en';

/**
 * Get translated string by key, with optional interpolation.
 * Usage: t('pathfinder.aboutSteps', { count: 42 })
 * replaces {count} in the string with 42.
 */
function t(key, params) {
    let text = (TRANSLATIONS[currentLanguage] && TRANSLATIONS[currentLanguage][key])
        || (TRANSLATIONS['en'] && TRANSLATIONS['en'][key])
        || key;

    if (params) {
        for (const param in params) {
            text = text.replace(new RegExp('\\{' + param + '\\}', 'g'), params[param]);
        }
    }
    return text;
}

/** Get current language code */
function getCurrentLanguage() {
    return currentLanguage;
}

/** Set language, persist, and apply to page */
function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem(I18N_STORAGE_KEY, lang);
    applyTranslations();
}

/** Toggle between en and es */
function toggleLanguage() {
    setLanguage(currentLanguage === 'en' ? 'es' : 'en');
}

/**
 * Apply translations to all elements with data-i18n attributes.
 * Also updates language button, html lang attribute, and re-renders
 * dynamic button labels that mix icons with text.
 */
function applyTranslations() {
    // Translate text content
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        var translated = t(key);
        // Use innerHTML for keys that contain HTML (tips with <strong>, <kbd>, <i> tags)
        if (translated.includes('<strong>') || translated.includes('<a ') || translated.includes('<i ') || translated.includes('<kbd>')) {
            el.innerHTML = translated;
        } else {
            el.textContent = translated;
        }
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    // Translate title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
        el.title = t(el.getAttribute('data-i18n-title'));
    });

    // Translate aria-label attributes
    document.querySelectorAll('[data-i18n-aria]').forEach(function(el) {
        el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });

    // Translate flash messages (arrive as keys from server)
    document.querySelectorAll('[data-i18n-flash]').forEach(function(el) {
        var key = el.getAttribute('data-i18n-flash');
        var translated = t(key);
        if (translated !== key) {
            el.innerHTML = translated;
        }
    });

    // Update HTML lang attribute
    document.documentElement.lang = currentLanguage;

    // Update language toggle button(s)
    updateLanguageButtons();

    // Re-render theme toggle button if on map editor page
    if (typeof updateThemeToggleButton === 'function') {
        updateThemeToggleButton();
    }

    // Re-render view toggle button if present
    var viewBtn = document.getElementById('viewToggleBtn');
    if (viewBtn) {
        var isNav = document.body.classList.contains('navigation-view');
        viewBtn.innerHTML = isNav
            ? '<i data-lucide="edit"></i> ' + t('editor.switchToEditor')
            : '<i data-lucide="smartphone"></i> ' + t('editor.switchToNav');
        if (window.lucide) lucide.createIcons();
    }

    // Re-render login theme button if on dashboard page
    if (typeof updateLoginThemeButton === 'function') {
        var theme = document.documentElement.getAttribute('data-theme') || 'light';
        updateLoginThemeButton(theme);
    }

    // Re-create Lucide icons after innerHTML changes
    if (window.lucide) {
        setTimeout(function() { lucide.createIcons(); }, 10);
    }
}

/** Update all language toggle buttons on the page */
function updateLanguageButtons() {
    var buttons = document.querySelectorAll('.lang-toggle-btn, .login-lang-toggle, .guide-lang-toggle');
    var label = currentLanguage === 'en' ? 'ES' : 'EN';
    var ariaLabel = currentLanguage === 'en' ? 'Cambiar a espa\u00f1ol' : 'Switch to English';
    var title = currentLanguage === 'en' ? 'Espa\u00f1ol' : 'English';

    buttons.forEach(function(btn) {
        btn.textContent = label;
        btn.setAttribute('aria-label', ariaLabel);
        btn.title = title;
    });
}

/** Initialize language on page load. Call after DOM is ready. */
function initLanguage() {
    currentLanguage = localStorage.getItem(I18N_STORAGE_KEY) || 'en';
    applyTranslations();
}

// Auto-initialize when script loads (works with defer since DOM is ready)
initLanguage();
