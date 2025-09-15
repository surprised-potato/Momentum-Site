const sequencingProjectName = document.getElementById('sequencing-project-name');
const sequencesOverviewTbody = document.querySelector('#sequences-overview-tbody');
const unsequencedTasksList = document.getElementById('unsequenced-tasks-list');
const sequenceEditModal = document.getElementById('sequence-edit-modal');
const sequenceModalClose = document.querySelector('.sequence-modal-close');
const sequenceModalTitle = document.getElementById('sequence-modal-title');
const sequenceEditForm = document.getElementById('sequence-edit-form');
const editingTaskIdInput = document.getElementById('editingTaskId');
const modalPredecessorsSelect = document.getElementById('modal-predecessors-multiselect');
const modalSuccessorsSelect = document.getElementById('modal-successors-multiselect');

const openSequenceEditModal = () => sequenceEditModal.style.display = 'block';
const closeSequenceEditModal = () => sequenceEditModal.style.display = 'none';

const displaySequencesOverview = async () => {
    let allTasks = await getAllProjectTasks(currentSequencingProjectId); 
    const allLinks = await db.tasks.where('projectId').equals(currentSequencingProjectId).toArray();

    const taskMap = new Map(allTasks.map(t => [t.uniqueId, { ...t, predecessors: [], successors: [] }]));
    taskMap.set('PROJECT_START', { uniqueId: 'PROJECT_START', displayName: '-- Project Start --', successors: [] });
    taskMap.set('PROJECT_END', { uniqueId: 'PROJECT_END', displayName: '-- Project End --', predecessors: [] });

    allLinks.forEach(link => {
        const predTask = taskMap.get(link.predecessorId);
        const succTask = taskMap.get(link.successorId);
        if (predTask && succTask) {
            succTask.predecessors.push(predTask.displayName);
            predTask.successors.push(succTask.displayName);
        }
    });

    const sequencedIds = new Set();
    allLinks.forEach(link => {
        sequencedIds.add(link.predecessorId);
        sequencedIds.add(link.successorId);
    });

    unsequencedTasksList.innerHTML = '';
    const unsequencedTasks = allTasks.filter(task => !sequencedIds.has(task.uniqueId));
    if (unsequencedTasks.length === 0) {
        unsequencedTasksList.innerHTML = '<li>All tasks are sequenced!</li>';
    } else {
        unsequencedTasks.forEach(task => {
            const li = document.createElement('li');
            li.textContent = task.displayName;
            li.dataset.id = task.uniqueId;
            li.style.cursor = 'pointer';
            unsequencedTasksList.appendChild(li);
        });
    }

    sequencesOverviewTbody.innerHTML = '';
    if (allTasks.length === 0) {
        sequencesOverviewTbody.innerHTML = '<tr><td colspan="4">No tasks exist for this project.</td></tr>';
        return;
    }
    
    allTasks.sort((a, b) => a.displayName.localeCompare(b.displayName));

    allTasks.forEach(task => {
        const data = taskMap.get(task.uniqueId);
        if (!data) return;
        const predecessorsHtml = data.predecessors.length > 0 ? `<ul>${data.predecessors.map(p => `<li>${p}</li>`).join('')}</ul>` : '<em>None</em>';
        const successorsHtml = data.successors.length > 0 ? `<ul>${data.successors.map(s => `<li>${s}</li>`).join('')}</ul>` : '<em>None</em>';
        const row = sequencesOverviewTbody.insertRow();
        row.innerHTML = `
            <td>${predecessorsHtml}</td>
            <td><strong>${data.displayName}</strong></td>
            <td>${successorsHtml}</td>
            <td class="actions-cell">
                <button class="btn btn-warning edit-sequence-btn" data-id="${task.uniqueId}">Edit</button>
            </td>
        `;
    });
};

const handleEditSequenceClick = async (taskUniqueId) => {
    const allTasks = await getAllProjectTasks(currentSequencingProjectId);
    const currentTask = allTasks.find(t => t.uniqueId === taskUniqueId);
    if (!currentTask) return;

    sequenceModalTitle.textContent = `Edit Sequence for: ${currentTask.displayName}`;
    editingTaskIdInput.value = taskUniqueId;
    
    const otherTasks = allTasks.filter(t => t.uniqueId !== taskUniqueId);
    modalPredecessorsSelect.innerHTML = `<option value="PROJECT_START">-- Project Start --</option>`;
    modalSuccessorsSelect.innerHTML = `<option value="PROJECT_END">-- Project End --</option>`;
    otherTasks.forEach(t => {
        modalPredecessorsSelect.innerHTML += `<option value="${t.uniqueId}">${t.displayName}</option>`;
        modalSuccessorsSelect.innerHTML += `<option value="${t.uniqueId}">${t.displayName}</option>`;
    });

    const existingPredecessorLinks = await db.tasks.where({ projectId: currentSequencingProjectId, successorId: taskUniqueId }).toArray();
    const existingPredecessorIds = existingPredecessorLinks.map(link => link.predecessorId);
    Array.from(modalPredecessorsSelect.options).forEach(opt => {
        opt.selected = existingPredecessorIds.includes(opt.value);
    });

    const existingSuccessorLinks = await db.tasks.where({ projectId: currentSequencingProjectId, predecessorId: taskUniqueId }).toArray();
    const existingSuccessorIds = existingSuccessorLinks.map(link => link.successorId);
    Array.from(modalSuccessorsSelect.options).forEach(opt => {
        opt.selected = existingSuccessorIds.includes(opt.value);
    });

    openSequenceEditModal();
};

const showSequencesForProject = async (projectId, projectName) => {
    currentSequencingProjectId = projectId;
    sequencingProjectName.textContent = projectName;
    sequencingTasksView.classList.remove('hidden');
    await displaySequencesOverview();
};

function initializeSequencingModule() {
    sequencesOverviewTbody.addEventListener('click', (e) => {
        const button = e.target.closest('.edit-sequence-btn');
        if (button) {
            handleEditSequenceClick(button.dataset.id);
        }
    });

    unsequencedTasksList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            handleEditSequenceClick(e.target.dataset.id);
        }
    });

    // Add the missing event listeners for the dropdowns
    document.getElementById('sequence-sort').addEventListener('change', displaySequencesOverview);
    document.getElementById('sequence-group').addEventListener('change', displaySequencesOverview);

    sequenceModalClose.addEventListener('click', closeSequenceEditModal);

    sequenceEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentTaskId = editingTaskIdInput.value;
        if (!currentTaskId) return;

        const newPredecessorIds = new Set(Array.from(modalPredecessorsSelect.selectedOptions, opt => opt.value));
        const newSuccessorIds = new Set(Array.from(modalSuccessorsSelect.selectedOptions, opt => opt.value));

        await db.transaction('rw', db.tasks, async () => {
            await db.tasks.where({ successorId: currentTaskId, projectId: currentSequencingProjectId }).delete();
            await db.tasks.where({ predecessorId: currentTaskId, projectId: currentSequencingProjectId }).delete();

            const linksToAdd = [];
            newPredecessorIds.forEach(id => linksToAdd.push({ projectId: currentSequencingProjectId, predecessorId: id, successorId: currentTaskId }));
            newSuccessorIds.forEach(id => linksToAdd.push({ projectId: currentSequencingProjectId, predecessorId: currentTaskId, successorId: id }));
            
            if (linksToAdd.length > 0) await db.tasks.bulkAdd(linksToAdd);
        });
        
        closeSequenceEditModal();
        await displaySequencesOverview();
    });
}