// Author: -REPLACE WITH YOUR NAME-
// OS support: -REPLACE WITH YOUR OS SUPPORT-
// Description: Main application entry point, state management, and initialization.

// --- Global State Variables ---
let currentProjectId = null;
let currentDupaProjectId = null;
let currentDupaQuantityId = null;
let currentSequencingProjectId = null;
let currentBoqProjectId = null;

// --- Application Initialization ---
// Replace the entire document.addEventListener('DOMContentLoaded',...) block with this:
window.addEventListener('load', () => {
    db.open().then(() => {
        console.log("Database opened successfully.");
        // This is now safe because the 'load' event guarantees the mermaid script is ready
        mermaid.initialize({ startOnLoad: false });
        
        // Initialize all modules
        initializeViewsModule();
        initializeProjectsModule();
        initializeTakeoffModule();
        initializeDupaModule();
        initializeSequencingModule();
        initializeConstructionModule();
        initializeReportsModule();
        initializeChangeOrdersModule();
        initializeDashboardModule();
        initializeMaterialsLibraryModule();
        initializeDupaLibraryModule();
        initializeLibraryManagementModule();

        // Universal modal closing listener
// Universal modal closing listener (handles both background and 'X' clicks)
        window.addEventListener('click', (event) => {
            // If the dark modal background is clicked, hide the modal
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
                return;
            }

            // If an 'X' close button (or anything inside it) is clicked, find the parent modal and hide it
            const closeButton = event.target.closest('.close-button');
            if (closeButton) {
                const modal = closeButton.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            }
        });

        // Show the initial view
        showDashboard();

    }).catch(err => {
        console.error("Failed to open db: ", err.stack || err);
    });
});
// --- End of app.js ---