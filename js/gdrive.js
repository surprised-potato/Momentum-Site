// --- Google Drive API Configuration ---
const API_KEY = 'AIzaSyAlOvTeEBPIXOiiNa3N9Ai7H4y4Mpd3U0g';
const CLIENT_ID = '994807186446-sgs6mfccb85bqc9t9jv5u91rrsti51mc.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const FOLDER_NAME = 'momentum-projects';

// --- Global State ---
let tokenClient;
let gapiReady = false;
let gisReady = false;

// --- Initialization ---

/**
 * Called once the Google API client script has loaded.
 */
function gapiLoaded() {
    gapi.load('client:picker', initializeGapiClient);
}

/**
 * Called once the Google Identity Services (GIS) script has loaded.
 */
function gisLoaded() {
    initializeGisClient();
}

/**
 * Initializes the GAPI client library.
 */
async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
    });
    gapiReady = true;
    updateSigninStatus(gapi.client.getToken() !== null);
    tryStartApp();
}

/**
 * Initializes the GIS client library.
 */
function initializeGisClient() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse.error) {
                alert('Google sign-in error: ' + tokenResponse.error);
                return;
            }
            gapi.client.setToken(tokenResponse);
            updateSigninStatus(true);
        },
    });
    gisReady = true;
    tryStartApp();
}

/**
 * Checks if both libraries are ready and then starts the main application.
 */
function tryStartApp() {
    if (gapiReady && gisReady) {
        startApp(); // This function is defined in app.js
    }
}


/**
 * Updates the Sign In/Out button text based on the current auth state.
 * @param {boolean} isSignedIn 
 */
function updateSigninStatus(isSignedIn) {
    const authButton = document.getElementById('google-auth-btn');
    if (!authButton) return;

    const buttonTextSpan = authButton.querySelector('.google-btn-text');
    const buttonIconSvg = authButton.querySelector('.google-icon');

    if (buttonTextSpan && buttonIconSvg) {
        if (isSignedIn) {
            buttonIconSvg.style.display = 'none'; // Hide the Google logo when signed in
            buttonTextSpan.textContent = 'Sign Out';
        } else {
            buttonIconSvg.style.display = 'block'; // Show the Google logo when signed out
            buttonTextSpan.textContent = 'Sign In with Google';
        }
    }
}

/**
 * Main entry point for authentication.
 * It will request an access token or sign out if one exists.
 */
function handleAuthClick() {
    if (gapi.client.getToken() === null) {
        // This forces the account chooser to appear.
        tokenClient.requestAccessToken({ prompt: 'select_account' });
    } else {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token, () => {
                gapi.client.setToken('');
                updateSigninStatus(false);
            });
        }
    }
}

/**
 * Gathers all data for a specific project into a single JSON object.
 * @param {number} projectId The ID of the project to package.
 * @returns {Promise<string>} A JSON string of the complete project data.
 */
async function getProjectDataAsJson(projectId) {
    // This ensures all data is fetched before proceeding.
    const [
        project,
        quantities,
        tasks,
        boq,
        changeOrders
    ] = await Promise.all([
        db.projects.get(projectId),
        db.quantities.where({ projectId }).toArray(),
        db.tasks.where({ projectId }).toArray(),
        db.boqs.where({ projectId }).first(),
        db.changeOrders.where({ projectId }).toArray()
    ]);

    const quantityIds = quantities.map(q => q.id);
    const changeOrderIds = changeOrders.map(co => co.id);

    const [
        dupas,
        changeOrderItems
    ] = await Promise.all([
        quantityIds.length > 0 ? db.dupas.where('quantityId').anyOf(quantityIds).toArray() : Promise.resolve([]),
        changeOrderIds.length > 0 ? db.changeOrderItems.where('changeOrderId').anyOf(changeOrderIds).toArray() : Promise.resolve([])
    ]);

    const changeOrderItemIds = changeOrderItems.map(item => item.id);

    const [
        changeOrderDupas,
        qtyAccomplishments,
        coAccomplishments
    ] = await Promise.all([
        changeOrderItemIds.length > 0 ? db.changeOrderDupas.where('changeOrderItemId').anyOf(changeOrderItemIds).toArray() : Promise.resolve([]),
        quantityIds.length > 0 ? db.accomplishments.where('taskId').anyOf(quantityIds).and(r => r.type === 'quantity').toArray() : Promise.resolve([]),
        changeOrderItemIds.length > 0 ? db.accomplishments.where('taskId').anyOf(changeOrderItemIds).and(r => r.type === 'changeOrderItem').toArray() : Promise.resolve([])
    ]);

    const accomplishments = [...qtyAccomplishments, ...coAccomplishments];

    const exportData = {
        project, quantities, dupas, tasks, boq,
        accomplishments, changeOrders, changeOrderItems, changeOrderDupas
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 * Finds the ID of the 'momentum-projects' folder, or creates it if it doesn't exist.
 * @returns {Promise<string>} The ID of the folder.
 */
async function getOrCreateFolderId() {
    const response = await gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
        fields: 'files(id, name)',
    });
    if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
    } else {
        const createResponse = await gapi.client.drive.files.create({
            resource: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
            fields: 'id',
        });
        return createResponse.result.id;
    }
}

/**
 * The main function to trigger saving a project to Google Drive.
 * @param {number} projectId The ID of the project to save.
 */
async function saveProjectToDrive(projectId) {
    // If not signed in, prompt for sign-in and wait for the token.
    if (gapi.client.getToken() === null) {
        tokenClient.callback = async (tokenResponse) => {
            if (tokenResponse.error) {
                throw new Error('Google sign-in error: ' + tokenResponse.error);
            }
            gapi.client.setToken(tokenResponse);
            await saveProjectToDrive(projectId); // Retry the save operation
        };
        // This forces the account chooser to appear.
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
    }

    try {
        const projectJsonString = await getProjectDataAsJson(projectId);
        const project = JSON.parse(projectJsonString).project;
        let fileName = `${project.projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;

        alert(`Checking Google Drive for existing files...`);

        const folderId = await getOrCreateFolderId();

        const searchResponse = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and name='${fileName}' and trashed=false`,
            fields: 'files(id)',
        });
        
        let existingFileId = searchResponse.result.files.length > 0 ? searchResponse.result.files[0].id : null;
        let method = 'POST'; // Default to creating a new file

        if (existingFileId) {
            const shouldOverwrite = confirm(`A file named "${fileName}" already exists.\n\nClick 'OK' to overwrite it.\nClick 'Cancel' to save a new file with a "(copy)" suffix.`);
            
            if (shouldOverwrite) {
                // User wants to overwrite. Set method to PATCH to update the existing file.
                method = 'PATCH';
            } else {
                // User wants to save a copy. Reset the file ID and update the filename.
                existingFileId = null; 
                if (fileName.endsWith('.json')) {
                    fileName = fileName.replace('.json', ' (copy).json');
                } else {
                    fileName += ' (copy)';
                }
            }
        }

        alert(`Preparing to ${method === 'PATCH' ? 'overwrite' : 'create'} "${fileName}"...`);

        const metadata = { name: fileName, mimeType: 'application/json' };
        if (!existingFileId) {
            metadata.parents = [folderId];
        }

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            projectJsonString +
            close_delim;

        const path = `/upload/drive/v3/files${existingFileId ? `/${existingFileId}` : ''}`;
        
        const request = gapi.client.request({
            'path': path,
            'method': method,
            'params': { 'uploadType': 'multipart' },
            'headers': { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
            'body': multipartRequestBody
        });

        await request;
        alert(`Project "${project.projectName}" saved successfully as "${fileName}" in the "${FOLDER_NAME}" folder in your Google Drive.`);

    } catch (err) {
        console.error('Error saving to Google Drive:', err);
        alert(`An error occurred while saving the project. The error was: ${err.result?.error?.message || err.message}`);
    }
}

/**
 * Main function to trigger the Google Drive import process.
 */
function handleImportClick() {
     if (gapi.client.getToken() === null) {
        alert('Please sign in to import a project.');
        handleAuthClick();
        return;
    }
    createPicker();
}

/**
 * Creates and displays the Google Picker interface.
 */
async function createPicker() {
    const token = gapi.client.getToken();
    if (token === null) return;

    // First, get the ID of the dedicated app folder.
    const folderId = await getOrCreateFolderId();

    const view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setMimeTypes("application/json");
    
    // Tell the Picker to start inside our specific folder.
    view.setParent(folderId);

    const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .setAppId('PASTE_YOUR_PROJECT_NUMBER_HERE')
        .setOAuthToken(token.access_token)
        .addView(view)
        .setDeveloperKey(API_KEY)
        .setCallback(pickerCallback)
        .build();
    picker.setVisible(true);
}

/**
 * Callback function that is executed when a user selects a file in the Picker.
 * @param {object} data The data returned from the Picker API.
 */
async function pickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        const fileId = data.docs[0].id;
        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            
            const projectDataString = typeof response.body === 'string' ? response.body : JSON.stringify(response.result);
            const projectData = JSON.parse(projectDataString);
            
            await importProjectData(projectData);

        } catch (error) {
            console.error('Error fetching file from Google Drive:', error);
            alert(`Could not import the selected file. Error: ${error.result?.error?.message || error.message}`);
        }
    }
}