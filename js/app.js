// Author: -REPLACE WITH YOUR NAME-
// OS support: -REPLACE WITH YOUR OS SUPPORT-
// Description: Main application entry point, state management, and initialization.

// --- Global State Variables ---
let currentProjectId = null;
let currentDupaProjectId = null;
let currentDupaQuantityId = null;
let currentSequencingProjectId = null;
let currentBoqProjectId = null;

// --- End of app.js ---

const populateInitialDataIfNeeded = async () => {
    try {
        const projectCount = await db.projects.count();
        if (projectCount > 0) {
            return;
        }

        console.log('First-time setup: Populating database with sample data...');

        const libraryResponse = await fetch('import samples/Sample Libraries/bat-os Materials.json');
        const libraryData = await libraryResponse.json();
        
        await db.transaction('rw', db.materials, db.resources, db.crews, db.crewComposition, async () => {
            const uniqueMaterials = Array.from(
                new Map(libraryData.materials.map(m => [m.name, m])).values()
            );
            await db.materials.bulkPut(uniqueMaterials);
        
            const uniqueResources = Array.from(
                new Map(libraryData.resources.map(r => [`${r.name}|${r.type}`, r])).values()
            );
            await db.resources.bulkPut(uniqueResources);
            
            const uniqueCrews = Array.from(
                new Map(libraryData.crews.map(c => [c.name, c])).values()
            );
            await db.crews.bulkPut(uniqueCrews);
        
            await db.crewComposition.bulkPut(libraryData.crewComposition);
        });

        // --- 2. Populate the Sample Projects ---
        // Use Promise.all to fetch both project files concurrently
        const [projectResponse1, projectResponse2] = await Promise.all([
            fetch('import samples/sample projects/default multistory.json'),
            fetch('import samples/sample projects/commercial_cafe.json') // New file
        ]);

        const projectData1 = await projectResponse1.json();
        const projectData2 = await projectResponse2.json(); // New data

        // Import both projects one after the other
        await importProjectData(projectData1);
        await importProjectData(projectData2); // New import call

        // Update the alert message
        alert('Welcome! Two sample projects and library data have been loaded.');
        window.location.reload();

    } catch (error) {
        console.error("Failed to populate initial database:", error);
        alert("There was an error loading the initial sample data.");
    }
};

window.addEventListener('load', () => {
    db.open().then(async () => {
        console.log("Database opened successfully.");
        
        await populateInitialDataIfNeeded();
        
        mermaid.initialize({ startOnLoad: false });
        
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

        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
                return;
            }
            const closeButton = event.target.closest('.close-button');
            if (closeButton) {
                const modal = closeButton.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            }
        });

        showDashboard();

    }).catch(err => {
        console.error("Failed to open db: ", err.stack || err);
    });
});
// --- End of app.js ---
