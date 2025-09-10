// js/dupa_library.js

let dupaLibraryModuleInitialized = false;

// --- DOM References ---
const resourcesTableBody = document.querySelector('#resources-table tbody');
const resourceSearchInput = document.getElementById('resource-search-input');
const addNewResourceBtn = document.getElementById('add-new-resource-btn');
const crewsTableBody = document.querySelector('#crews-table tbody');
const crewSearchInput = document.getElementById('crew-search-input');
const addNewCrewBtn = document.getElementById('add-new-crew-btn');

// --- Modal References ---
const resourceModal = document.getElementById('resource-modal');
const resourceModalTitle = document.getElementById('resource-modal-title');
const resourceModalClose = resourceModal.querySelector('.resource-modal-close');
const resourceForm = document.getElementById('resource-form');
const resourceIdInput = document.getElementById('resource-id');
const resourceNameInput = document.getElementById('resource-name');
const resourceTypeInput = document.getElementById('resource-type');
const resourceRateInput = document.getElementById('resource-rate');
const resourceUnitInput = document.getElementById('resource-unit');

const crewModal = document.getElementById('crew-modal');
const crewModalTitle = document.getElementById('crew-modal-title');
const crewModalClose = crewModal.querySelector('.crew-modal-close');
const crewForm = document.getElementById('crew-form');
const crewIdInput = document.getElementById('crew-id');
const crewNameInput = document.getElementById('crew-name');
const crewRateInput = document.getElementById('crew-productivity-rate');
const crewUnitInput = document.getElementById('crew-productivity-unit');

const availableResourcesList = document.getElementById('available-resources-list');
const crewCompositionTableBody = document.querySelector('#crew-composition-table tbody');
const availableResourceSearch = document.getElementById('available-resource-search');

// --- Functions ---
const openResourceModal = () => resourceModal.style.display = 'block';
const closeResourceModal = () => resourceModal.style.display = 'none';
const openCrewModal = () => crewModal.style.display = 'block';
const closeCrewModal = () => crewModal.style.display = 'none';

const displayResources = async () => {
    const filter = resourceSearchInput.value.toLowerCase();
    const allResources = await db.resources.orderBy('name').toArray();
    resourcesTableBody.innerHTML = '';
    const filtered = allResources.filter(r => r.name.toLowerCase().includes(filter));
    if (filtered.length === 0) {
        resourcesTableBody.innerHTML = `<tr><td colspan="5">No resources found.</td></tr>`;
        return;
    }
    filtered.forEach(resource => {
        const row = resourcesTableBody.insertRow();
        row.innerHTML = `
            <td>${resource.name}</td>
            <td>${resource.type}</td>
            <td>${resource.rate.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
            <td>${resource.unit}</td>
            <td class="actions-cell">
                <button class="btn btn-warning edit-resource-btn" data-id="${resource.id}">Edit</button>
                <button class="btn btn-danger delete-resource-btn" data-id="${resource.id}">Delete</button>
            </td>
        `;
    });
};

const displayCrews = async () => {
    const filter = crewSearchInput.value.toLowerCase();
    const allCrews = await db.crews.orderBy('name').toArray();
    crewsTableBody.innerHTML = '';
    const filtered = allCrews.filter(c => c.name.toLowerCase().includes(filter));
    if (filtered.length === 0) {
        crewsTableBody.innerHTML = `<tr><td colspan="3">No crews found.</td></tr>`;
        return;
    }
    filtered.forEach(crew => {
        const row = crewsTableBody.insertRow();
        row.innerHTML = `
            <td>${crew.name}</td>
            <td>${crew.productivityRate} ${crew.productivityUnit}</td>
            <td class="actions-cell">
                <button class="btn btn-warning edit-crew-btn" data-id="${crew.id}">Edit</button>
                <button class="btn btn-danger delete-crew-btn" data-id="${crew.id}">Delete</button>
            </td>
        `;
    });
};

const openAndPopulateCrewModal = async (crewId = null) => {
    crewForm.reset();
    crewIdInput.value = '';
    crewCompositionTableBody.innerHTML = '';
    availableResourcesList.innerHTML = '';
    
    const allResources = await db.resources.orderBy('name').toArray();
    let currentResourceIds = new Set();

    if (crewId) {
        // This is an EDIT operation
        const crew = await db.crews.get(crewId);
        const currentComposition = await db.crewComposition.where({ crewId }).toArray();
        currentResourceIds = new Set(currentComposition.map(c => c.resourceId));

        crewModalTitle.textContent = 'Edit Crew';
        crewIdInput.value = crew.id;
        crewNameInput.value = crew.name;
        crewRateInput.value = crew.productivityRate;
        crewUnitInput.value = crew.productivityUnit;

        for (const comp of currentComposition) {
            const resource = allResources.find(r => r.id === comp.resourceId);
            if (resource) {
                const row = crewCompositionTableBody.insertRow();
                row.dataset.id = resource.id;
                row.innerHTML = `
                    <td>${resource.name}</td>
                    <td><input type="number" class="composition-quantity" value="${comp.quantity}" min="0.1" step="any" required></td>
                    <td><button type="button" class="btn-remove">X</button></td>
                `;
            }
        }
    } else {
        // This is an ADD operation
        crewModalTitle.textContent = 'Add New Crew';
    }
    
    // Populate available resources for both Add and Edit
    allResources
        .filter(r => !currentResourceIds.has(r.id))
        .forEach(r => {
            const li = document.createElement('li');
            li.dataset.id = r.id;
            li.innerHTML = `<span>${r.name} <i>(${r.type})</i></span><button type="button" class="btn-add-sm">+</button>`;
            availableResourcesList.appendChild(li);
        });

    openCrewModal();
};

function initializeDupaLibraryModule() {
    if (dupaLibraryModuleInitialized) return;

    // --- Resource Listeners ---
    addNewResourceBtn.addEventListener('click', () => {
        resourceModalTitle.textContent = 'Add New Resource';
        resourceForm.reset();
        resourceIdInput.value = '';
        openResourceModal();
    });
    resourceModalClose.addEventListener('click', closeResourceModal);
    resourceSearchInput.addEventListener('input', displayResources);
    resourceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = resourceIdInput.value ? parseInt(resourceIdInput.value) : null;
        const data = { name: resourceNameInput.value, type: resourceTypeInput.value, rate: parseFloat(resourceRateInput.value), unit: resourceUnitInput.value };
        try {
            if (id) {
                await db.resources.update(id, data);
            } else {
                await db.resources.add(data);
            }
            closeResourceModal();
            await displayResources();
        } catch (error) {
            console.error("Failed to save resource:", error);
            alert(`Error saving resource: ${error.message}. The resource name may already exist for that type.`);
        }
    });
    resourcesTableBody.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('edit-resource-btn')) {
            const resource = await db.resources.get(parseInt(target.dataset.id));
            if (resource) {
                resourceModalTitle.textContent = 'Edit Resource';
                resourceIdInput.value = resource.id;
                resourceNameInput.value = resource.name;
                resourceTypeInput.value = resource.type;
                resourceRateInput.value = resource.rate;
                resourceUnitInput.value = resource.unit;
                openResourceModal();
            }
        }
        if (target.classList.contains('delete-resource-btn')) {
            const id = parseInt(target.dataset.id);
            if (confirm('Are you sure you want to delete this resource? Note: This will not remove it from existing crews.')) {
                await db.resources.delete(id);
                await displayResources();
            }
        }
    });

    // --- Crew Listeners (Unified) ---
    addNewCrewBtn.addEventListener('click', () => openAndPopulateCrewModal());
    crewModalClose.addEventListener('click', closeCrewModal);
    crewSearchInput.addEventListener('input', displayCrews);

    crewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = crewIdInput.value ? parseInt(crewIdInput.value) : null;
        const crewData = { 
            name: crewNameInput.value, 
            productivityRate: parseFloat(crewRateInput.value), 
            productivityUnit: crewUnitInput.value 
        };
    
        const compositionData = [];
        crewCompositionTableBody.querySelectorAll('tr').forEach(row => {
            compositionData.push({
                resourceId: parseInt(row.dataset.id),
                quantity: parseFloat(row.querySelector('.composition-quantity').value)
            });
        });
    
        try {
            await db.transaction('rw', db.crews, db.crewComposition, async () => {
                if (id) { // Update existing crew
                    await db.crews.update(id, crewData);
                    await db.crewComposition.where({ crewId: id }).delete();
                    if (compositionData.length > 0) {
                        await db.crewComposition.bulkAdd(compositionData.map(c => ({ ...c, crewId: id })));
                    }
                } else { // Add new crew
                    const newCrewId = await db.crews.add(crewData);
                    if (compositionData.length > 0) {
                        await db.crewComposition.bulkAdd(compositionData.map(c => ({ ...c, crewId: newCrewId })));
                    }
                }
            });
            closeCrewModal();
            await displayCrews();
        } catch (error) {
            console.error("Failed to save crew:", error);
            alert(`Error saving crew: ${error.message}. The crew name may already exist.`);
        }
    });

    crewsTableBody.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('edit-crew-btn')) {
            openAndPopulateCrewModal(parseInt(target.dataset.id));
        }
        if (target.classList.contains('delete-crew-btn')) {
            const id = parseInt(target.dataset.id);
            if (confirm('Are you sure you want to delete this crew? This will also remove its composition.')) {
                await db.transaction('rw', db.crews, db.crewComposition, async () => {
                    await db.crewComposition.where({ crewId: id }).delete();
                    await db.crews.delete(id);
                });
                await displayCrews();
            }
        }
    });
    
    availableResourcesList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-add-sm')) {
            const li = e.target.closest('li');
            const resourceId = parseInt(li.dataset.id);
            const resource = await db.resources.get(resourceId);
            if (resource) {
                const row = crewCompositionTableBody.insertRow();
                row.dataset.id = resource.id;
                row.innerHTML = `
                    <td>${resource.name}</td>
                    <td><input type="number" class="composition-quantity" value="1" min="0.1" step="any" required></td>
                    <td><button type="button" class="btn-remove">X</button></td>
                `;
                li.remove();
            }
        }
    });

     crewCompositionTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-remove')) {
            const row = e.target.closest('tr');
            const resourceId = parseInt(row.dataset.id);
            const resource = await db.resources.get(resourceId);
            if (resource) {
                // Add it back to the available list
                const li = document.createElement('li');
                li.dataset.id = resource.id;
                li.innerHTML = `<span>${resource.name} <i>(${resource.type})</i></span><button type="button" class="btn-add-sm">+</button>`;
                availableResourcesList.appendChild(li);
            }
            row.remove();
        }
    });
    
    dupaLibraryModuleInitialized = true;
}