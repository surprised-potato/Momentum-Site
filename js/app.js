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

        // This function checks if the database is empty and loads sample data if it is.
const populateInitialDataIfNeeded = async () => {
    try {
        const projectCount = await db.projects.count();
        // If there's already data, do nothing.
        if (projectCount > 0) {
            return;
        }

        console.log('First-time setup: Populating database with sample data...');

        // --- 1. Populate the Libraries ---
        const libraryResponse = await fetch('./import samples/Sample Libraries/bat-os Materials.json');
        const libraryData = await libraryResponse.json();
        
        await db.transaction('rw', db.materials, db.resources, db.crews, db.crewComposition, async () => {
            // We use bulkPut to add the items. Dexie will handle the auto-incrementing IDs.
            await db.materials.bulkPut(libraryData.materials);
            await db.resources.bulkPut(libraryData.resources);
            
            // For crews, we need to re-link compositions, but since this is a fresh DB, we can add them directly.
            await db.crews.bulkPut(libraryData.crews);
            await db.crewComposition.bulkPut(libraryData.crewComposition);
        });

        // --- 2. Populate the Default Project ---
        const projectResponse = await fetch('./import samples/sample projects/default multistory.json');
        const projectData = await projectResponse.json();

        // Use the existing import function to handle all the complex ID re-linking
        await importProjectData(projectData);

        // --- 3. Refresh the page to show the new data ---
        alert('Welcome! Sample project and library data have been loaded.');
        window.location.reload();

    } catch (error) {
        console.error("Failed to populate initial database:", error);
        alert("There was an error loading the initial sample data.");
    }
};

        // Universal modal closing listener
// Universal modal closing listener (handles both background and 'X' clicks)
window.addEventListener('load', () => {
    db.open().then(async () => { // Make the function async
        console.log("Database opened successfully.");
        
        // NEW: Check for and populate initial data if needed.
        await populateInitialDataIfNeeded();
        
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
