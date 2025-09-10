// js/materials.js

let materialsModuleInitialized = false;

// --- DOM References ---
const materialsTableBody = document.querySelector('#materials-table tbody');
const materialSearchInput = document.getElementById('material-search-input');
const addNewMaterialBtn = document.getElementById('add-new-material-btn');

// --- Modal References ---
const materialModal = document.getElementById('material-modal');
const materialModalTitle = document.getElementById('material-modal-title');
const materialModalClose = document.querySelector('.material-modal-close');
const materialForm = document.getElementById('material-form');
const materialIdInput = document.getElementById('material-id');
const materialNameInput = document.getElementById('material-name');
const materialUnitInput = document.getElementById('material-unit');
const materialPriceInput = document.getElementById('material-price');

// --- Functions ---
const openMaterialModal = () => materialModal.style.display = 'block';
const closeMaterialModal = () => materialModal.style.display = 'none';

const displayMaterials = async () => {
    const filter = materialSearchInput.value.toLowerCase();
    const allMaterials = await db.materials.orderBy('name').toArray();

    materialsTableBody.innerHTML = '';
    const filteredMaterials = allMaterials.filter(m => m.name.toLowerCase().includes(filter));

    if (filteredMaterials.length === 0) {
        materialsTableBody.innerHTML = `<tr><td colspan="4">No materials found.</td></tr>`;
        return;
    }

    filteredMaterials.forEach(material => {
        const row = materialsTableBody.insertRow();
        row.innerHTML = `
            <td>${material.name}</td>
            <td>${material.unit}</td>
            <td>${material.unitPrice.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
            <td class="actions-cell">
                <button class="btn btn-warning edit-material-btn" data-id="${material.id}">Edit</button>
                <button class="btn btn-danger delete-material-btn" data-id="${material.id}">Delete</button>
            </td>
        `;
    });
};

function initializeMaterialsLibraryModule() {
    if (materialsModuleInitialized) return;

    addNewMaterialBtn.addEventListener('click', () => {
        materialModalTitle.textContent = 'Add New Material';
        materialForm.reset();
        materialIdInput.value = '';
        openMaterialModal();
    });

    materialModalClose.addEventListener('click', closeMaterialModal);

    materialSearchInput.addEventListener('input', displayMaterials);

    materialForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = materialIdInput.value ? parseInt(materialIdInput.value) : null;
        const data = {
            name: materialNameInput.value,
            unit: materialUnitInput.value,
            unitPrice: parseFloat(materialPriceInput.value)
        };

        try {
            if (id) {
                await db.materials.update(id, data);
            } else {
                await db.materials.add(data);
            }
            closeMaterialModal();
            await displayMaterials();
        } catch (error) {
            console.error("Failed to save material:", error);
            alert(`Error saving material: ${error.message}. The material name may already exist.`);
        }
    });

    materialsTableBody.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('edit-material-btn')) {
            const id = parseInt(target.dataset.id);
            const material = await db.materials.get(id);
            if (material) {
                materialModalTitle.textContent = 'Edit Material';
                materialIdInput.value = material.id;
                materialNameInput.value = material.name;
                materialUnitInput.value = material.unit;
                materialPriceInput.value = material.unitPrice;
                openMaterialModal();
            }
        }
        if (target.classList.contains('delete-material-btn')) {
            const id = parseInt(target.dataset.id);
            if (confirm('Are you sure you want to delete this material?')) {
                await db.materials.delete(id);
                await displayMaterials();
            }
        }
    });

    materialsModuleInitialized = true;
}