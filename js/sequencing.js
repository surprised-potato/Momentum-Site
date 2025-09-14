// Author: Gemini
// OS support: Cross-platform
// Description: Logic for the Task Sequencing module.

const sequencingProjectName = document.getElementById('sequencing-project-name');
const sequencesOverviewTbody = document.getElementById('sequences-overview-tbody');
const unsequencedTasksList = document.getElementById('unsequenced-tasks-list');
const sequenceEditModal = document.getElementById('sequence-edit-modal');
const sequenceModalClose = document.querySelector('.sequence-modal-close');
const sequenceModalTitle = document.getElementById('sequence-modal-title');
const sequenceEditForm = document.getElementById('sequence-edit-form');
const editingTaskIdInput = document.getElementById('editingTaskId');
const modalPredecessorsSelect = document.getElementById('modal-predecessors-multiselect');
const modalSuccessorsSelect = document.getElementById('modal-successors-multiselect');
const sortSequencesBtn = document.getElementById('sort-sequences-btn');

const openSequenceEditModal = () => sequenceEditModal.style.display = 'block';
const closeSequenceEditModal = () => sequenceEditModal.style.display = 'none';

const getAllProjectTasks = async (projectId) => {
    const quantities = await db.quantities.where({ projectId }).toArray();
    const approvedChangeOrders = await db.changeOrders.where({ projectId, status: 'Approved' }).toArray();
    const approvedChangeOrderIds = approvedChangeOrders.map(co => co.id);
    const changeOrderItems = approvedChangeOrderIds.length > 0 ? await db.changeOrderItems.where('changeOrderId').anyOf(approvedChangeOrderIds).toArray() : [];

    const allTasks = [];

    quantities.forEach(q => {
        if (q.subquantities && q.subquantities.length > 0) {
            q.subquantities.forEach((sub, index) => {
                allTasks.push({
                    id: `q_${q.id}_sub_${index}`,
                    displayName: `${q.scopeOfWork}: ${sub.name}`
                });
            });
        } else {
            allTasks.push({ id: q.id, displayName: q.scopeOfWork });
        }
    });

    allTasks.push(...changeOrderItems.map(ci => ({ id: ci.id, displayName: `(CO) ${ci.scopeOfWork}` })));
    
    return allTasks;
};


const displayUnsequencedTasks = async (allTasks, allLinks) => {
    const sequencedIds = new Set();
    allLinks.forEach(link => {
        sequencedIds.add(link.predecessorId);
        sequencedIds.add(link.successorId);
    });

    unsequencedTasksList.innerHTML = '';
    const unsequencedTasks = allTasks.filter(task => !sequencedIds.has(task.id));
    
    if (unsequencedTasks.length === 0) {
        unsequencedTasksList.innerHTML = '<li>All tasks are sequenced!</li>';
    } else {
        unsequencedTasks.forEach(task => {
            const li = document.createElement('li');
            li.textContent = task.displayName;
            li.dataset.id = task.id;
            li.style.cursor = 'pointer';
            unsequencedTasksList.appendChild(li);
        });
    }
};

const displaySequencesOverview = async () => {
    let allTasks = await getProjectTasks(currentSequencingProjectId); 
    const allLinks = await db.tasks.where('projectId').equals(currentSequencingProjectId).toArray();
    const pertData = await getPertCpmData(currentSequencingProjectId, true);

    sequencesOverviewTbody.innerHTML = '';
    
    await displayUnsequencedTasks(allTasks, allLinks);

    if (allTasks.length === 0) {
        sequencesOverviewTbody.innerHTML = '<tr><td colspan="4">No tasks exist for this project.</td></tr>';
        return;
    }

    const sortBy = document.getElementById('sequence-sort').value;
    const startTaskIds = new Set(allLinks.filter(l => l.predecessorId === 'PROJECT_START').map(l => l.successorId));

    if (pertData && pertData.tasks) {
        const esMap = new Map(Array.from(pertData.tasks.values()).map(task => [task.id, task.es]));
        allTasks.sort((a, b) => {
            const aIsStart = startTaskIds.has(a.id);
            const bIsStart = startTaskIds.has(b.id);
            if (aIsStart && !bIsStart) return -1;
            if (bIsStart && !aIsStart) return 1;
            
            if (sortBy === 'name') return a.displayName.localeCompare(b.displayName);
            
            const taskA_es = esMap.get(a.uniqueId || a.id) || Infinity;
            const taskB_es = esMap.get(b.uniqueId || b.id) || Infinity;
            if (taskA_es === taskB_es) return a.displayName.localeCompare(b.displayName);
            return taskA_es - taskB_es;
        });
    }

    const taskMap = new Map(allTasks.map(t => [t.uniqueId, { ...t, predecessors: [], successors: [] }]));
    taskMap.set('PROJECT_START', { displayName: '-- Project Start --', successors: [] });
    taskMap.set('PROJECT_END', { displayName: '-- Project End --', predecessors: [] });

    allLinks.forEach(link => {
        const predTaskObj = allTasks.find(t => t.id == link.predecessorId && t.type !== 'subquantity');
        const succTaskObj = allTasks.find(t => t.id == link.successorId && t.type !== 'subquantity');
        
        const predDisplayName = predTaskObj ? predTaskObj.displayName : (link.predecessorId === 'PROJECT_START' ? '-- Project Start --' : '');
        const succDisplayName = succTaskObj ? succTaskObj.displayName : (link.successorId === 'PROJECT_END' ? '-- Project End --' : '');
        
        const predTask = taskMap.get(predTaskObj?.uniqueId || link.predecessorId);
        const succTask = taskMap.get(succTaskObj?.uniqueId || link.successorId);

        if (succTask && predDisplayName) succTask.predecessors.push(predDisplayName);
        if (predTask && succDisplayName) predTask.successors.push(succDisplayName);
    });
    
    const groupBy = document.getElementById('sequence-group').value;

    const renderTaskRow = (task) => {
        const data = taskMap.get(task.uniqueId);
        const predecessorsHtml = data.predecessors.length > 0 ? `<ul>${data.predecessors.map(p => `<li>${p}</li>`).join('')}</ul>` : '<em>None</em>';
        const successorsHtml = data.successors.length > 0 ? `<ul>${data.successors.map(s => `<li>${s}</li>`).join('')}</ul>` : '<em>None</em>';
        const isSubtask = task.type === 'subquantity';
        const disabledAttr = isSubtask ? 'disabled title="Sub-tasks inherit sequencing from their parent and cannot be edited individually."' : '';
        const row = sequencesOverviewTbody.insertRow();
        row.innerHTML = `
            <td>${predecessorsHtml}</td>
            <td><strong>${data.displayName}</strong></td>
            <td>${successorsHtml}</td>
            <td class="actions-cell">
                <button class="btn btn-warning edit-sequence-btn" data-id="${task.id}" ${disabledAttr}>Edit</button>
            </td>
        `;
    };

    if (groupBy === 'category') {
        const groupedTasks = allTasks.reduce((acc, task) => {
            const category = task.category || (task.type === 'changeOrderItem' ? 'Change Orders' : 'Uncategorized');
            if (!acc[category]) acc[category] = [];
            acc[category].push(task);
            return acc;
        }, {});
        Object.keys(groupedTasks).sort().forEach(category => {
            const headerRow = sequencesOverviewTbody.insertRow();
            headerRow.className = 'category-header-row';
            headerRow.innerHTML = `<td colspan="4">${category}</td>`;
            groupedTasks[category].forEach(renderTaskRow);
        });
    } else {
        allTasks.forEach(renderTaskRow);
    }
};

const handleEditSequenceClick = async (taskId) => {
    const allTasks = await getAllProjectTasks(currentSequencingProjectId);
    const currentTask = allTasks.find(t => String(t.id) === String(taskId));
    if (!currentTask) return;

    sequenceModalTitle.textContent = `Edit Sequence for: ${currentTask.displayName}`;
    editingTaskIdInput.value = taskId;
    
    const otherTasks = allTasks.filter(t => String(t.id) !== String(taskId));
    modalPredecessorsSelect.innerHTML = `<option value="PROJECT_START">-- Project Start --</option>`;
    modalSuccessorsSelect.innerHTML = `<option value="PROJECT_END">-- Project End --</option>`;
    otherTasks.forEach(t => {
        const optionHtml = `<option value="${t.id}">${t.displayName}</option>`;
        modalPredecessorsSelect.innerHTML += optionHtml;
        modalSuccessorsSelect.innerHTML += optionHtml;
    });

    const parsedTaskId = isNaN(parseInt(taskId)) ? taskId : parseInt(taskId);

    const existingPredecessorLinks = await db.tasks.where({ projectId: currentSequencingProjectId, successorId: parsedTaskId }).toArray();
    const existingPredecessorIds = existingPredecessorLinks.map(link => link.predecessorId);
    Array.from(modalPredecessorsSelect.options).forEach(opt => {
        opt.selected = existingPredecessorIds.some(id => String(id) === opt.value);
    });

    const existingSuccessorLinks = await db.tasks.where({ projectId: currentSequencingProjectId, predecessorId: parsedTaskId }).toArray();
    const existingSuccessorIds = existingSuccessorLinks.map(link => link.successorId);
    Array.from(modalSuccessorsSelect.options).forEach(opt => {
        opt.selected = existingSuccessorIds.some(id => String(id) === opt.value);
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
        if (e.target.classList.contains('edit-sequence-btn')) {
            const taskId = e.target.dataset.id;
            console.log('Edit button clicked in main table. Task ID:', taskId);
            handleEditSequenceClick(taskId);
        }
    });

    unsequencedTasksList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const taskId = e.target.dataset.id;
            console.log('Unsequenced task item clicked. Task ID:', taskId);
            handleEditSequenceClick(taskId);
        }
    });

    // REMOVE the old button listener for 'sort-sequences-btn'
    // sortSequencesBtn.addEventListener('click', displaySequencesOverview);

    // ADD these new listeners for the dropdowns
    document.getElementById('sequence-sort').addEventListener('change', displaySequencesOverview);
    document.getElementById('sequence-group').addEventListener('change', displaySequencesOverview);

    sequenceModalClose.addEventListener('click', closeSequenceEditModal);

    sequenceEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const parseTaskId = (id) => {
            if (id === 'PROJECT_START' || id === 'PROJECT_END') return id;
            const numId = parseInt(id, 10);
            return isNaN(numId) ? id : numId;
        };

        const currentTaskId = parseTaskId(editingTaskIdInput.value);
        if (!currentTaskId) return;

        const newPredecessorIds = new Set(
            Array.from(modalPredecessorsSelect.selectedOptions).map(opt => parseTaskId(opt.value))
        );
        const newSuccessorIds = new Set(
            Array.from(modalSuccessorsSelect.selectedOptions).map(opt => parseTaskId(opt.value))
        );

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