// Author: Gemini
// OS support: Cross-platform
// Description: Logic for the Reports module (BOQ, PERT-CPM, and Gantt Chart).
const boqProjectsListDiv = document.getElementById('boq-projects-list');
const boqProjectName = document.getElementById('boq-project-name');
const boqStatusMessage = document.getElementById('boq-status-message');
const boqTbody = document.querySelector('#boq-table tbody');
const boqTfoot = document.querySelector('#boq-table tfoot');
const deleteBoqBtn = document.getElementById('delete-boq-btn');
const viewPertCpmBtn = document.getElementById('view-pert-cpm-btn');
const viewGanttChartBtn = document.getElementById('view-gantt-chart-btn');
const viewSCurveBtn = document.getElementById('view-s-curve-btn');
const viewNetworkDiagramBtn = document.getElementById('view-network-diagram-btn');
const viewResourceScheduleBtn = document.getElementById('view-resource-schedule-btn');

const pertCpmProjectName = document.getElementById('pert-cpm-project-name');
const pertCpmTbody = document.querySelector('#pert-cpm-table tbody');
const ganttChartProjectName = document.getElementById('gantt-chart-project-name');
const sCurveProjectName = document.getElementById('s-curve-project-name');
const sCurveChartCanvas = document.getElementById('s-curve-chart');
const networkDiagramProjectName = document.getElementById('network-diagram-project-name');

const revisedBoqProjectsListDiv = document.getElementById('revised-boq-projects-list');
const revisedBoqProjectName = document.getElementById('revised-boq-project-name');
const revisedBoqTableContainer = document.getElementById('revised-boq-table-container');
const viewRevisedPertCpmBtn = document.getElementById('view-revised-pert-cpm-btn');
const revisedPertCpmProjectName = document.getElementById('revised-pert-cpm-project-name');
const revisedPertCpmTableContainer = document.getElementById('revised-pert-cpm-table-container');

let sCurveChart = null;
let ganttChart = null;

const showReportsProjectList = () => {
    boqDisplayView.classList.add('hidden');
    pertCpmDisplayView.classList.add('hidden');
    ganttChartDisplayView.classList.add('hidden');
    sCurveDisplayView.classList.add('hidden');
    pertCpmNetworkView.classList.add('hidden');
    resourceScheduleView.classList.add('hidden');
    boqProjectListView.classList.remove('hidden');
    displayBoqProjects();
};

const displayBoqProjects = async () => {
    const allProjects = await db.projects.orderBy('projectName').toArray();
    boqProjectsListDiv.innerHTML = '';
    if (allProjects.length === 0) {
        boqProjectsListDiv.innerHTML = '<p>No projects created yet.</p>';
    } else {
        allProjects.forEach(p => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `<h3>${p.projectName}</h3><button class="btn btn-primary view-boq-btn" data-id="${p.id}" data-name="${p.projectName}">View BOQ</button>`;
            boqProjectsListDiv.appendChild(item);
        });
    }
};

const displayBoqFromData = (boqData) => {
    boqTbody.innerHTML = '';
    boqTfoot.innerHTML = '';
    let grandTotal = 0;
    const sortedCategories = Object.keys(boqData).sort();
    for (const category of sortedCategories) {
        const categorySubtotal = boqData[category].reduce((sum, item) => sum + item.totalAmount, 0);
        grandTotal += categorySubtotal;

        const headerRow = boqTbody.insertRow();
        headerRow.className = 'category-header-row';
        headerRow.innerHTML = `
            <td colspan="4"><strong>${category}</strong></td>
            <td style="text-align: right;"><strong>${categorySubtotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</strong></td>
            <td></td>
        `;

        boqData[category].forEach(item => {
            const row = boqTbody.insertRow();
            row.innerHTML = `
                <td>${item.scopeOfWork}</td>
                <td>${item.quantity.toLocaleString()}</td>
                <td>${item.unit}</td>
                <td style="text-align: right;">${item.unitPrice.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                <td style="text-align: right;">${item.totalAmount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                <td class="actions-cell"><button class="btn btn-secondary view-dupa-details-btn" data-quantity-id="${item.quantityId}">View DUPA</button></td>
            `;
        });
    }
    boqTfoot.innerHTML = `
        <tr class="boq-summary-row">
            <td colspan="5" style="text-align: right;">Grand Total</td>
            <td style="text-align: right;">${grandTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
        </tr>
    `;
};

const generateAndLockBoq = async () => {
    const quantities = await db.quantities.where('projectId').equals(currentBoqProjectId).toArray();
    if (quantities.length === 0) {
        alert("Cannot generate a BOQ with no quantities.");
        return;
    }
    const dupas = await db.dupas.where('quantityId').anyOf(quantities.map(q => q.id)).toArray();
    const dupaMap = new Map(dupas.map(d => [d.quantityId, d]));
    const boqData = quantities.reduce((acc, q) => {
        const category = q.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        const dupa = dupaMap.get(q.id);
        const totalAmount = calculateDupaTotalCost(dupa);
        const unitPrice = (q.quantity > 0) ? (totalAmount / q.quantity) : 0;
        acc[category].push({
            quantityId: q.id,
            scopeOfWork: q.scopeOfWork,
            quantity: q.quantity,
            unit: q.unit,
            unitPrice: unitPrice,
            totalAmount: totalAmount
        });
        return acc;
    }, {});
    await db.boqs.add({
        projectId: currentBoqProjectId,
        generatedAt: new Date(),
        boqData: boqData
    });
    await showBoqForProject(currentBoqProjectId, boqProjectName.textContent.replace('Bill of Quantities: ', ''));
};

const promptToGenerateBoq = () => {
    const modal = document.getElementById('generate-boq-modal');
    if (!modal) {
        console.error('Generate BOQ Modal not found in the HTML file.');
        if (confirm("No locked BOQ found for this project. Do you want to generate one? This will lock all pre-construction data.")) {
             generateAndLockBoq();
        }
        return;
    }

    const confirmBtn = document.getElementById('confirm-generate-boq-btn');
    const cancelBtn = document.getElementById('cancel-generate-boq-btn');
    const closeBtn = document.getElementById('close-generate-boq-modal');

    const confirmHandler = async () => {
        confirmBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
        closeBtn.removeEventListener('click', cancelHandler);
        modal.style.display = 'none';
        await generateAndLockBoq();
    };

    const cancelHandler = () => {
        confirmBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
        closeBtn.removeEventListener('click', cancelHandler);
        modal.style.display = 'none';
    };

    confirmBtn.addEventListener('click', confirmHandler);
    cancelBtn.addEventListener('click', cancelHandler);
    closeBtn.addEventListener('click', cancelHandler);

    modal.style.display = 'block';
};

const showBoqForProject = async (projectId, projectName) => {
    currentBoqProjectId = projectId;
    boqProjectName.textContent = `Bill of Quantities: ${projectName}`;
    boqProjectListView.classList.add('hidden');
    pertCpmDisplayView.classList.add('hidden');
    ganttChartDisplayView.classList.add('hidden');
    sCurveDisplayView.classList.add('hidden');
    pertCpmNetworkView.classList.add('hidden');
    resourceScheduleView.classList.add('hidden');
    boqDisplayView.classList.remove('hidden');

    const lockedBoq = await db.boqs.where({ projectId: projectId }).first();

    if (lockedBoq) {
        boqStatusMessage.textContent = `This BOQ was generated and locked on ${lockedBoq.generatedAt.toLocaleString()}. Data can no longer be edited.`;
        deleteBoqBtn.classList.remove('hidden');
        viewPertCpmBtn.classList.remove('hidden');
        displayBoqFromData(lockedBoq.boqData);
    } else {
        boqStatusMessage.textContent = '';
        deleteBoqBtn.classList.add('hidden');
        viewPertCpmBtn.classList.add('hidden');
        boqTbody.innerHTML = '<tr><td colspan="6">No locked BOQ found for this project.</td></tr>';
        boqTfoot.innerHTML = '';
        promptToGenerateBoq();
    }
};

const handleDeleteBoq = () => {
    const modal = document.getElementById('delete-boq-modal');
    if (!modal) {
        console.error('Delete Confirmation Modal not found in the HTML file.');
        alert('Error: Could not find the confirmation dialog. Please ensure the HTML is up to date.');
        return;
    }

    const confirmBtn = document.getElementById('confirm-delete-boq-btn');
    const cancelBtn = document.getElementById('cancel-delete-boq-btn');
    const closeBtn = document.getElementById('close-delete-boq-modal');

    const confirmHandler = async () => {
        confirmBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
        closeBtn.removeEventListener('click', cancelHandler);

        modal.style.display = 'none';

        if (!currentBoqProjectId) {
            alert('Error: No project selected.');
            return;
        }

        try {
            await db.transaction('rw', ['boqs', 'quantities', 'accomplishments', 'projects'], async () => {
                const boqToDelete = await db.boqs.where({ projectId: currentBoqProjectId }).first();
                if (boqToDelete) {
                    await db.boqs.delete(boqToDelete.id);
                }
                const quantitiesToReset = await db.quantities.where({ projectId: currentBoqProjectId }).toArray();
                const quantityIds = quantitiesToReset.map(q => q.id);
                if (quantityIds.length > 0) {
                    await db.accomplishments
                        .where('taskId').anyOf(quantityIds)
                        .and(record => record.type === 'quantity')
                        .delete();
                    await db.quantities.where('projectId').equals(currentBoqProjectId).modify({ percentComplete: null });
                }
                await db.projects.update(currentBoqProjectId, { startDate: null });
            });

            alert("BOQ and all construction progress deleted successfully. Pre-construction data is now unlocked.");
            showReports();
        } catch (error) {
            console.error("Failed to delete BOQ and related data:", error);
            alert("An error occurred during the deletion process. Please check the console for details.");
        }
    };

    const cancelHandler = () => {
        confirmBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
        closeBtn.removeEventListener('click', cancelHandler);
        modal.style.display = 'none';
    };

    confirmBtn.addEventListener('click', confirmHandler);
    cancelBtn.addEventListener('click', cancelHandler);
    closeBtn.addEventListener('click', cancelHandler);

    modal.style.display = 'block';
};

const showPertCpmForProject = async () => {
    boqDisplayView.classList.add('hidden');
    ganttChartDisplayView.classList.add('hidden');
    sCurveDisplayView.classList.add('hidden');
    pertCpmNetworkView.classList.add('hidden');
    resourceScheduleView.classList.add('hidden');
    pertCpmDisplayView.classList.remove('hidden');
    pertCpmProjectName.textContent = `PERT-CPM: ${boqProjectName.textContent.replace('Bill of Quantities: ', '')}`;
    const data = await getPertCpmData(currentBoqProjectId);
    if (!data) {
        pertCpmTbody.innerHTML = '<tr><td colspan="7">No tasks found for this project.</td></tr>';
        return;
    }

    data.quantities.sort((a,b) => {
        const taskA = data.tasks.get(a.uniqueId);
        const taskB = data.tasks.get(b.uniqueId);
        if (!taskA || !taskB) return 0;
        return taskA.es - taskB.es;
    });

    pertCpmTbody.innerHTML = '';
    data.quantities.forEach(q => {
        const task = data.tasks.get(q.uniqueId);
        if (!task) return;
        const slack = task.ls - task.es;
        const isCritical = slack <= 0;
        const row = pertCpmTbody.insertRow();
        if (isCritical) row.classList.add('critical-path');
        row.innerHTML = `<td>${task.name}</td><td>${task.duration}</td><td>${task.es}</td><td>${task.ef}</td><td>${task.ls}</td><td>${task.lf}</td><td>${slack}</td>`;
    });
};

const showGanttChartForProject = async () => {
    pertCpmDisplayView.classList.add('hidden');
    sCurveDisplayView.classList.add('hidden');
    pertCpmNetworkView.classList.add('hidden');
    resourceScheduleView.classList.add('hidden');
    ganttChartDisplayView.classList.remove('hidden');
    ganttChartProjectName.textContent = `Gantt Chart: ${boqProjectName.textContent.replace('Bill of Quantities: ', '')}`;
    
    const ganttContainer = document.getElementById('gantt-chart-target');
    ganttContainer.innerHTML = 'Loading Chart...';

    const data = await getPertCpmData(currentBoqProjectId, false);
    const project = await db.projects.get(currentBoqProjectId);

    if (!data || data.quantities.length === 0) {
        ganttContainer.innerHTML = 'No tasks to display.';
        return;
    }

    const projectStartDate = new Date();
    projectStartDate.setMinutes(projectStartDate.getMinutes() + projectStartDate.getTimezoneOffset());

    let tasksForGantt = data.quantities.map(q => {
        const task = data.tasks.get(q.uniqueId);
        if (!task) return null;

        const isCritical = (task.ls - task.es) <= 0;
        const startDate = new Date(projectStartDate);
        startDate.setDate(startDate.getDate() + task.es);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + task.duration);
        
        const dependencies = Array.from(task.predecessors)
            .filter(pId => typeof pId !== 'string' || !pId.startsWith('PROJECT'))
            .join(', ');

        return {
            id: q.uniqueId,
            name: task.name,
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
            progress: 0,
            dependencies: dependencies,
            custom_class: isCritical ? 'bar-critical' : '',
            duration: task.duration
        };
    }).filter(Boolean);

    const sortBy = document.getElementById('reports-gantt-sort').value;
    tasksForGantt.sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'duration') return a.duration - b.duration;
        return new Date(a.start) - new Date(b.start);
    });

    ganttContainer.innerHTML = '';
    ganttChart = new Gantt("#gantt-chart-target", tasksForGantt, {
        view_mode: 'Week',
        custom_popup_html: function(task) {
            return `<div class="gantt-popup-wrapper">
                <strong>${task.name}</strong>
                <p>Duration: ${task.duration} days</p>
            </div>`;
        }
    });
    setTimeout(() => {
    document.querySelectorAll(`#gantt-chart-target .bar-wrapper.bar-critical`).forEach(wrapper => {
        const taskId = wrapper.dataset.id;
        document.querySelectorAll(`#gantt-chart-target .arrow-line.dep-${taskId}`).forEach(arrow => {
            arrow.classList.add('arrow-critical');
        });
    });
}, 100);
};


const showSCurveForProject = async () => {
    pertCpmDisplayView.classList.add('hidden');
    ganttChartDisplayView.classList.add('hidden');
    pertCpmNetworkView.classList.add('hidden');
    resourceScheduleView.classList.add('hidden');
    sCurveDisplayView.classList.remove('hidden');
    sCurveProjectName.textContent = `S-Curve: ${boqProjectName.textContent.replace('Bill of Quantities: ', '')}`;

    const data = await getSCurveData(currentBoqProjectId);

    if (sCurveChart) {
        sCurveChart.destroy();
    }

    if (!data) {
        sCurveChartCanvas.getContext('2d').clearRect(0, 0, sCurveChartCanvas.width, sCurveChartCanvas.height);
        alert("Could not generate S-Curve. Ensure the project has tasks with durations and costs.");
        return;
    }

    sCurveChart = new Chart(sCurveChartCanvas, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Planned Cumulative % Completion',
                data: data.plannedPercentage,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Cumulative Completion (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Project Day'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Planned S-Curve (Total Project Cost: PHP ${data.grandTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                },
                tooltip: {
                        callbacks: {
                            label: function(context) {
                                const y_percent = context.parsed.y;
                                if (y_percent === null) return '';

                                const y_cost = data.cumulativeCosts[context.dataIndex];

                                const percentString = y_percent.toFixed(2) + '%';
                                const costString = y_cost.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

                                return `${context.dataset.label}: ${percentString} (${costString})`;
                            }
                        }
                    }
            }
        }
    });
};

const showNetworkDiagram = async () => {
    pertCpmDisplayView.classList.add('hidden');
    ganttChartDisplayView.classList.add('hidden');
    sCurveDisplayView.classList.add('hidden');
    resourceScheduleView.classList.add('hidden');
    pertCpmNetworkView.classList.remove('hidden');
    networkDiagramProjectName.textContent = `Network Diagram: ${boqProjectName.textContent.replace('Bill of Quantities: ', '')}`;

    const diagramContainer = pertCpmNetworkView.querySelector('.mermaid');
    diagramContainer.innerHTML = 'Loading diagram...';

    const data = await getPertCpmData(currentBoqProjectId, false);
    if (!data || !data.tasks) {
        diagramContainer.innerHTML = 'No data to display.';
        return;
    }

    let mermaidSyntax = 'graph TD;\n';

    data.quantities.forEach(q => {
        const task = data.tasks.get(q.uniqueId);
        if (!task) return;

        const slack = task.ls - task.es;
        const isCritical = slack <= 0;
        const nodeId = q.uniqueId.replace(/-/g, '_'); 
        const nodeText = `"${task.name}<br/>D:${task.duration} ES:${task.es} EF:${task.ef}<br/>LS:${task.ls} LF:${task.lf} S:${slack}"`;
        
        mermaidSyntax += `    ${nodeId}[${nodeText}];\n`;
        if (isCritical) {
            mermaidSyntax += `    style ${nodeId} fill:#f8d7da,stroke:#c00,stroke-width:2px;\n`;
        }
    });

    mermaidSyntax += '    PRJ_START((Start));\n';
    mermaidSyntax += '    PRJ_END((End));\n';
    mermaidSyntax += '    style PRJ_START fill:#d1e7dd,stroke:#333,stroke-width:2px;\n';
    mermaidSyntax += '    style PRJ_END fill:#d1e7dd,stroke:#333,stroke-width:2px;\n';

    data.tasks.forEach((task, taskId) => {
        const predecessorNodeId = (taskId === 'PROJECT_START') ? 'PRJ_START' : taskId.replace(/-/g, '_');

        task.successors.forEach(successorId => {
            const successorNodeId = (successorId === 'PROJECT_END') ? 'PRJ_END' : successorId.replace(/-/g, '_');
            
            if (data.tasks.has(taskId) && data.tasks.has(successorId)) {
                mermaidSyntax += `    ${predecessorNodeId} --> ${successorNodeId};\n`;
            }
        });
    });
    try {
        const { svg } = await mermaid.render('mermaid-graph-render', mermaidSyntax);
        diagramContainer.innerHTML = svg;
    } catch (e) {
        diagramContainer.innerHTML = 'Error rendering diagram. Check console for details.';
        console.error("Mermaid rendering error:", e);
    }
};

const showManpowerEquipmentSchedule = async () => {
    pertCpmDisplayView.classList.add('hidden');
    ganttChartDisplayView.classList.add('hidden');
    sCurveDisplayView.classList.add('hidden');
    pertCpmNetworkView.classList.add('hidden');
    resourceScheduleView.classList.remove('hidden');

    const resourceScheduleProjectName = document.getElementById('resource-schedule-project-name');
    resourceScheduleProjectName.textContent = `Resource Schedule: ${boqProjectName.textContent.replace('Bill of Quantities: ', '')}`;

    const scheduleContainer = document.getElementById('resource-schedule-container');
    scheduleContainer.innerHTML = 'Loading schedule...';

    const pertData = await getPertCpmData(currentBoqProjectId, true);
    if (!pertData || pertData.projectDuration === 0) {
        scheduleContainer.innerHTML = '<p>No data available to generate schedule.</p>';
        return;
    }

    const { tasks, projectDuration } = pertData;
    const { allDupas } = await getAllTasksForReport(currentBoqProjectId, true);
    const dupaMap = new Map();
    allDupas.forEach(d => {
        const key = d.quantityId || d.changeOrderItemId;
        dupaMap.set(key, d);
    });

    const dailyResources = {};

    for (const [taskId, task] of tasks.entries()) {
        if (taskId === 'PROJECT_START' || taskId === 'PROJECT_END' || !task.duration || task.duration <= 0) continue;

        const numericId = parseInt(taskId.split('-')[1]);
        const dupa = dupaMap.get(numericId);
        if (!dupa) continue;

        const totalTaskCost = calculateDupaTotalCost(dupa);
        if (totalTaskCost > 0) {
            const costPerDay = totalTaskCost / task.duration;
            const resourceName = "Cash Flow (Daily Cost)";
            if (!dailyResources[resourceName]) {
                dailyResources[resourceName] = { unit: "PHP", schedule: new Array(projectDuration).fill(0) };
            }
            for (let day = task.es; day < task.ef; day++) {
                if (day < projectDuration) {
                    dailyResources[resourceName].schedule[day] += costPerDay;
                }
            }
        }
        
        if (!dupa.directCosts) continue;

        dupa.directCosts.forEach(dc => {
            let resourceName = '';
            let dailyAmount = 0;
            let unit = '';

            if (dc.type === 'labor') {
                resourceName = dc.laborType;
                dailyAmount = dc.mandays / task.duration;
                unit = 'md';
            } else if (dc.type === 'equipment') {
                resourceName = dc.name;
                dailyAmount = dc.hours / task.duration;
                unit = 'hrs';
            }

            if (resourceName) {
                if (!dailyResources[resourceName]) {
                    dailyResources[resourceName] = {
                        unit: unit,
                        schedule: new Array(projectDuration).fill(0)
                    };
                }
                for (let day = task.es; day < task.ef; day++) {
                    if (day < projectDuration) {
                        dailyResources[resourceName].schedule[day] += dailyAmount;
                    }
                }
            }
        });
    }

    if (Object.keys(dailyResources).length === 0) {
        scheduleContainer.innerHTML = '<p>No labor or equipment resources found in DUPAs.</p>';
        return;
    }

    let tableHtml = '<table id="resource-schedule-table"><thead><tr><th class="sticky-col">Resource</th>';
    for (let i = 1; i <= projectDuration; i++) {
        tableHtml += `<th>${i}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';

    const laborResources = [];
    const equipmentResources = [];
    const financialResources = [];

    Object.keys(dailyResources).sort().forEach(name => {
        const unit = dailyResources[name].unit;
        if (unit === 'md') laborResources.push(name);
        else if (unit === 'hrs') equipmentResources.push(name);
        else if (unit === 'PHP') financialResources.push(name);
    });

    const renderGroup = (groupName, resources) => {
        if (resources.length > 0) {
            tableHtml += `<tr class="category-header-row"><td class="sticky-col" colspan="${projectDuration + 1}">${groupName}</td></tr>`;
            resources.forEach(resourceName => {
                const data = dailyResources[resourceName];
                tableHtml += `<tr><td class="sticky-col">${resourceName} (${data.unit})</td>`;
                data.schedule.forEach(amount => {
                    let displayAmount = '-';
                    if (amount > 0) {
                        displayAmount = (data.unit === 'PHP')
                            ? amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                            : amount.toFixed(2);
                    }
                    tableHtml += `<td>${displayAmount}</td>`;
                });
                tableHtml += '</tr>';
            });
        }
    };

    renderGroup('Labor', laborResources);
    renderGroup('Equipment', equipmentResources);
    renderGroup('Financials', financialResources);

    tableHtml += '</tbody></table>';
    scheduleContainer.innerHTML = tableHtml;
};

const showDupaDetails = async (quantityId) => {
    const quantity = await db.quantities.get(quantityId);
    const dupa = await db.dupas.where('quantityId').equals(quantityId).first();
    if (!quantity || !dupa) {
        alert('DUPA details not found for this item.');
        return;
    }
    let content = '';
    
    const laborCosts = dupa.directCosts.filter(dc => dc.type === 'labor');
    const materialCosts = dupa.directCosts.filter(dc => dc.type === 'material');
    const equipmentCosts = dupa.directCosts.filter(dc => dc.type === 'equipment');

    content += '<h5 class="dupa-category-header">Direct Costs</h5><table class="dupa-table"><thead><tr><th>Description</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';

    let laborSubtotal = 0;
    if (laborCosts.length > 0) {
        laborSubtotal = laborCosts.reduce((sum, item) => sum + (item.mandays * item.rate), 0);
        content += `<tr class="category-header-row"><td style="font-weight:bold;">Labor</td><td style="text-align:right; font-weight:bold;">${laborSubtotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
        laborCosts.forEach(item => {
            const itemTotal = item.mandays * item.rate;
            const description = `${item.laborType} (${item.mandays} md @ ${item.rate.toFixed(2)})`;
            content += `<tr><td>${description}</td><td style="text-align:right;">${itemTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
        });
    }

    let materialSubtotal = 0;
    if (materialCosts.length > 0) {
        materialSubtotal = materialCosts.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        content += `<tr class="category-header-row"><td style="font-weight:bold;">Materials</td><td style="text-align:right; font-weight:bold;">${materialSubtotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
        materialCosts.forEach(item => {
            const itemTotal = item.quantity * item.unitPrice;
            const description = `${item.name} (${item.quantity} ${item.unit} @ ${item.unitPrice.toFixed(2)})`;
            content += `<tr><td>${description}</td><td style="text-align:right;">${itemTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
        });
    }
    
    let equipmentSubtotal = 0;
    if (equipmentCosts.length > 0) {
        equipmentSubtotal = equipmentCosts.reduce((sum, item) => sum + (item.hours * item.rate), 0);
        content += `<tr class="category-header-row"><td style="font-weight:bold;">Equipment</td><td style="text-align:right; font-weight:bold;">${equipmentSubtotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
        equipmentCosts.forEach(item => {
            const itemTotal = item.hours * item.rate;
            const description = `${item.name} (${item.hours} hrs @ ${item.rate.toFixed(2)})`;
            content += `<tr><td>${description}</td><td style="text-align:right;">${itemTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
        });
    }

    const directCostTotal = laborSubtotal + materialSubtotal + equipmentSubtotal;
    content += `<tr><td style="text-align:right; font-weight:bold;">Total Direct Cost</td><td style="text-align:right; font-weight:bold;">${directCostTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    content += '</tbody></table>';

    const ocmCost = directCostTotal * (dupa.indirectCosts.ocm / 100);
    const profitCost = directCostTotal * (dupa.indirectCosts.profit / 100);
    const subtotal = directCostTotal + ocmCost + profitCost;
    const taxCost = subtotal * (dupa.indirectCosts.taxes / 100);
    const totalAmount = subtotal + taxCost;
    const unitPrice = quantity.quantity > 0 ? totalAmount / quantity.quantity : 0;

    content += '<h5 class="dupa-category-header">Cost Summary</h5><table class="dupa-table"><tbody>';
    content += `<tr><td>Total Direct Cost</td><td style="text-align:right;">${directCostTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    content += `<tr><td>OCM (${dupa.indirectCosts.ocm}%)</td><td style="text-align:right;">${ocmCost.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    content += `<tr><td>Contractor's Profit (${dupa.indirectCosts.profit}%)</td><td style="text-align:right;">${profitCost.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    content += `<tr><td>VAT (${dupa.indirectCosts.taxes}%)</td><td style="text-align:right;">${taxCost.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    content += `<tr style="font-weight:bold; border-top: 2px solid black;"><td >Item Total Amount</td><td style="text-align:right;">${totalAmount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    content += '</tbody></table>';

    content += '<h5 class="dupa-category-header">Unit Price Computation</h5><table class="dupa-table"><tbody>';
    content += `<tr><td>(Total Amount / Quantity)</td><td style="text-align:right;">(${totalAmount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })} / ${quantity.quantity} ${quantity.unit})</td></tr>`;
    content += `<tr style="font-weight:bold;"><td >Final Unit Price</td><td style="text-align:right;">${unitPrice.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    content += '</tbody></table>';

    dupaReportContent.innerHTML = content;
    dupaReportTitle.textContent = `DUPA Breakdown: ${quantity.scopeOfWork}`;
    openDupaReportModal();
};

const showCoItemDupaDetails = async (coItemId) => {
    const item = await db.changeOrderItems.get(coItemId);
    const dupa = await db.changeOrderDupas.where('changeOrderItemId').equals(coItemId).first();
    if (!item || !dupa) {
        alert('DUPA details not found for this change order item.');
        return;
    }
    let content = '';
    let directCostTotal = 0;
    content += '<h5 class="dupa-category-header">Direct Costs</h5><table class="dupa-table"><thead><tr><th>Description</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';
    dupa.directCosts.forEach(dc_item => {
        let itemTotal = 0;
        let description = '';
        switch (dc_item.type) {
            case 'labor':
                itemTotal = dc_item.mandays * dc_item.rate;
                description = `${dc_item.laborType} (${dc_item.mandays} md @ ${dc_item.rate.toFixed(2)})`;
                break;
            case 'material':
                itemTotal = dc_item.quantity * dc_item.unitPrice;
                description = `${dc_item.name} (${dc_item.quantity} ${dc_item.unit} @ ${dc_item.unitPrice.toFixed(2)})`;
                break;
            case 'equipment':
                itemTotal = dc_item.hours * dc_item.rate;
                description = `${dc_item.name} (${dc_item.hours} hrs @ ${dc_item.rate.toFixed(2)})`;
                break;
        }
        directCostTotal += itemTotal;
        content += `<tr><td>${description}</td><td style="text-align:right;">${itemTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    });
    content += `<tr><td style="text-align:right; font-weight:bold;">Total Direct Cost</td><td style="text-align:right; font-weight:bold;">${directCostTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    content += '</tbody></table>';

    const ocmCost = directCostTotal * (dupa.indirectCosts.ocm / 100);
    const profitCost = directCostTotal * (dupa.indirectCosts.profit / 100);
    const subtotal = directCostTotal + ocmCost + profitCost;
    const taxCost = subtotal * (dupa.indirectCosts.taxes / 100);
    const totalAmount = subtotal + taxCost;
    const unitPrice = item.quantity > 0 ? totalAmount / item.quantity : 0;

    content += '<h5 class="dupa-category-header">Cost Summary</h5><table class="dupa-table"><tbody>';
    content += `<tr><td>Total Direct Cost</td><td style="text-align:right;">${directCostTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    content += `<tr><td>OCM (${dupa.indirectCosts.ocm}%)</td><td style="text-align:right;">${ocmCost.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    content += `<tr><td>Contractor's Profit (${dupa.indirectCosts.profit}%)</td><td style="text-align:right;">${profitCost.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    content += `<tr><td>VAT (${dupa.indirectCosts.taxes}%)</td><td style="text-align:right;">${taxCost.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    content += `<tr style="font-weight:bold; border-top: 2px solid black;"><td >Item Total Amount</td><td style="text-align:right;">${totalAmount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    content += '</tbody></table>';

    content += '<h5 class="dupa-category-header">Unit Price Computation</h5><table class="dupa-table"><tbody>';
    content += `<tr><td>(Total Amount / Quantity)</td><td style="text-align:right;">(${totalAmount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })} / ${item.quantity} ${item.unit})</td></tr>`;
    content += `<tr style="font-weight:bold;"><td >Final Unit Price</td><td style="text-align:right;">${unitPrice.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td></tr>`;
    content += '</tbody></table>';

    dupaReportContent.innerHTML = content;
    dupaReportTitle.textContent = `DUPA Breakdown (Change Order)`;
    openDupaReportModal();
};

const displayRevisedBoqProjects = async () => {
    const constructionReadyProjects = await getConstructionReadyProjects();
    revisedBoqProjectsListDiv.innerHTML = '';
    if (constructionReadyProjects.length === 0) {
        revisedBoqProjectsListDiv.innerHTML = '<p>No projects with a generated BOQ found.</p>';
        return;
    }
    constructionReadyProjects.forEach(p => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `<h3>${p.projectName}</h3><button class="btn btn-primary view-revised-boq-btn" data-id="${p.id}" data-name="${p.projectName}">View Revised BOQ</button>`;
        revisedBoqProjectsListDiv.appendChild(item);
    });
};

const showRevisedNetworkDiagram = async () => {
    revisedPertCpmDisplayView.classList.add('hidden');
    revisedPertCpmNetworkView.classList.remove('hidden');
    document.getElementById('revised-network-diagram-project-name').textContent = `Revised Network Diagram: ${revisedBoqProjectName.textContent.replace('Revised BOQ: ', '')}`;
    const diagramContainer = revisedPertCpmNetworkView.querySelector('.mermaid');
    diagramContainer.innerHTML = 'Loading diagram...';

    const data = await getPertCpmData(currentBoqProjectId, true);
    if (!data || !data.tasks) {
        diagramContainer.innerHTML = 'No data to display.';
        return;
    }

    let mermaidSyntax = 'graph TD;\n';
    data.quantities.forEach(q => {
        const task = data.tasks.get(q.uniqueId);
        if (!task) return;
        const slack = task.ls - task.es;
        const isCritical = slack <= 0;
        const nodeId = q.uniqueId.replace(/-/g, '_');
        const nodeText = `"${task.name}<br/>D:${task.duration} ES:${task.es} EF:${task.ef}<br/>LS:${task.ls} LF:${task.lf} S:${slack}"`;
        mermaidSyntax += `    ${nodeId}[${nodeText}];\n`;
        if (isCritical) {
            mermaidSyntax += `    style ${nodeId} fill:#f8d7da,stroke:#c00,stroke-width:2px;\n`;
        }
    });

    mermaidSyntax += '    PRJ_START((Start));\n    PRJ_END((End));\n';
    mermaidSyntax += '    style PRJ_START fill:#d1e7dd,stroke:#333,stroke-width:2px;\n';
    mermaidSyntax += '    style PRJ_END fill:#d1e7dd,stroke:#333,stroke-width:2px;\n';

    data.tasks.forEach((task, taskId) => {
        const predecessorNodeId = (taskId === 'PROJECT_START') ? 'PRJ_START' : taskId.replace(/-/g, '_');
        task.successors.forEach(successorId => {
            const successorNodeId = (successorId === 'PROJECT_END') ? 'PRJ_END' : successorId.replace(/-/g, '_');
            if (data.tasks.has(taskId) && data.tasks.has(successorId)) {
                mermaidSyntax += `    ${predecessorNodeId} --> ${successorNodeId};\n`;
            }
        });
    });

    try {
        const { svg } = await mermaid.render('mermaid-graph-render-revised', mermaidSyntax);
        diagramContainer.innerHTML = svg;
    } catch (e) {
        diagramContainer.innerHTML = 'Error rendering diagram.';
        console.error("Mermaid rendering error:", e);
    }
};

const showRevisedResourceSchedule = async () => {
    revisedPertCpmDisplayView.classList.add('hidden');
    revisedResourceScheduleView.classList.remove('hidden');
    document.getElementById('revised-resource-schedule-project-name').textContent = `Revised Resource Schedule: ${revisedBoqProjectName.textContent.replace('Revised BOQ: ', '')}`;
    const scheduleContainer = document.getElementById('revised-resource-schedule-container');
    scheduleContainer.innerHTML = 'Loading schedule...';

    const pertData = await getPertCpmData(currentBoqProjectId, true);
    if (!pertData || pertData.projectDuration === 0) {
        scheduleContainer.innerHTML = '<p>No data available to generate schedule.</p>';
        return;
    }

    const { tasks, projectDuration } = pertData;
    const { allDupas } = await getAllTasksForReport(currentBoqProjectId, true);
    const dupaMap = new Map();
    allDupas.forEach(d => {
        const key = d.quantityId || d.changeOrderItemId;
        dupaMap.set(key, d);
    });

    const dailyResources = {};

    for (const [taskId, task] of tasks.entries()) {
        if (taskId === 'PROJECT_START' || taskId === 'PROJECT_END' || !task.duration || task.duration <= 0) continue;

        const numericId = parseInt(taskId.split('-')[1]);
        const dupa = dupaMap.get(numericId);
        if (!dupa) continue;

        const totalTaskCost = calculateDupaTotalCost(dupa);
        if (totalTaskCost > 0) {
            const costPerDay = totalTaskCost / task.duration;
            const resourceName = "Cash Flow (Daily Cost)";
            if (!dailyResources[resourceName]) {
                dailyResources[resourceName] = { unit: "PHP", schedule: new Array(projectDuration).fill(0) };
            }
            for (let day = task.es; day < task.ef; day++) {
                if (day < projectDuration) {
                    dailyResources[resourceName].schedule[day] += costPerDay;
                }
            }
        }
        
        if (!dupa.directCosts) continue;

        dupa.directCosts.forEach(dc => {
            let resourceName = '';
            let dailyAmount = 0;
            let unit = '';
            if (dc.type === 'labor') {
                resourceName = dc.laborType;
                dailyAmount = dc.mandays / task.duration;
                unit = 'md';
            } else if (dc.type === 'equipment') {
                resourceName = dc.name;
                dailyAmount = dc.hours / task.duration;
                unit = 'hrs';
            }
            if (resourceName) {
                if (!dailyResources[resourceName]) {
                    dailyResources[resourceName] = { unit: unit, schedule: new Array(projectDuration).fill(0) };
                }
                for (let day = task.es; day < task.ef; day++) {
                    if (day < projectDuration) {
                        dailyResources[resourceName].schedule[day] += dailyAmount;
                    }
                }
            }
        });
    }

    if (Object.keys(dailyResources).length === 0) {
        scheduleContainer.innerHTML = '<p>No labor or equipment resources found in DUPAs.</p>';
        return;
    }

    let tableHtml = '<table id="revised-resource-schedule-table"><thead><tr><th class="sticky-col">Resource</th>';
    for (let i = 1; i <= projectDuration; i++) {
        tableHtml += `<th>${i}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';

    const laborResources = [];
    const equipmentResources = [];
    const financialResources = [];

    Object.keys(dailyResources).sort().forEach(name => {
        const unit = dailyResources[name].unit;
        if (unit === 'md') laborResources.push(name);
        else if (unit === 'hrs') equipmentResources.push(name);
        else if (unit === 'PHP') financialResources.push(name);
    });

    const renderGroup = (groupName, resources) => {
        if (resources.length > 0) {
            tableHtml += `<tr class="category-header-row"><td class="sticky-col" colspan="${projectDuration + 1}">${groupName}</td></tr>`;
            resources.forEach(resourceName => {
                const data = dailyResources[resourceName];
                tableHtml += `<tr><td class="sticky-col">${resourceName} (${data.unit})</td>`;
                data.schedule.forEach(amount => {
                    let displayAmount = '-';
                    if (amount > 0) {
                        displayAmount = (data.unit === 'PHP')
                            ? amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                            : amount.toFixed(2);
                    }
                    tableHtml += `<td>${displayAmount}</td>`;
                });
                tableHtml += '</tr>';
            });
        }
    };

    renderGroup('Labor', laborResources);
    renderGroup('Equipment', equipmentResources);
    renderGroup('Financials', financialResources);

    tableHtml += '</tbody></table>';
    scheduleContainer.innerHTML = tableHtml;
};

const showRevisedBoqForProject = async (projectId, projectName) => {
    currentBoqProjectId = projectId;
    revisedBoqProjectName.textContent = `Revised BOQ: ${projectName}`;
    revisedBoqProjectListView.classList.add('hidden');
    revisedPertCpmDisplayView.classList.add('hidden');
    revisedBoqDisplayView.classList.remove('hidden');

    const { allTasks, allDupas } = await getAllTasksForReport(projectId, true);
    const dupaMap = new Map();
    allDupas.forEach(d => {
        const key = d.quantityId || d.changeOrderItemId;
        dupaMap.set(key, d);
    });

    const originalItems = allTasks.filter(task => !task.changeOrderId);
    const changeOrderItems = allTasks.filter(task => task.changeOrderId);

    const groupedOriginals = originalItems.reduce((acc, task) => {
        const category = task.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(task);
        return acc;
    }, {});

    let tableHtml = '<table id="revised-boq-table"><thead><tr><th>Scope of Work</th><th>Quantity</th><th>Unit</th><th>Unit Price</th><th>Total Amount</th><th>Actions</th></tr></thead><tbody>';
    let grandTotal = 0;

    const sortedCategories = Object.keys(groupedOriginals).sort();
    for (const category of sortedCategories) {
        const categoryTasks = groupedOriginals[category];
        const categorySubtotal = categoryTasks.reduce((sum, task) => {
            const dupa = dupaMap.get(task.id);
            return sum + calculateDupaTotalCost(dupa);
        }, 0);
        grandTotal += categorySubtotal;

        tableHtml += `<tr class="category-header-row">
                        <td colspan="5"><strong>${category}</strong></td>
                        <td style="text-align: right;"><strong>${categorySubtotal.toLocaleString('en-ph', { style: 'currency', currency: 'PHP' })}</strong></td>
                      </tr>`;

        categoryTasks.forEach(task => {
            const dupa = dupaMap.get(task.id);
            const totalAmount = calculateDupaTotalCost(dupa);
            const unitPrice = (task.quantity !== 0) ? (totalAmount / task.quantity) : 0;
            tableHtml += `
                <tr>
                    <td>${task.displayName}</td>
                    <td>${task.quantity.toLocaleString()}</td>
                    <td>${task.unit}</td>
                    <td style="text-align: right;">${unitPrice.toLocaleString('en-ph', { style: 'currency', currency: 'PHP' })}</td>
                    <td style="text-align: right;">${totalAmount.toLocaleString('en-ph', { style: 'currency', currency: 'PHP' })}</td>
                    <td></td>
                </tr>
            `;
        });
    }

    if (changeOrderItems.length > 0) {
        const coSubtotal = changeOrderItems.reduce((sum, task) => {
            const dupa = dupaMap.get(task.id);
            return sum + calculateDupaTotalCost(dupa);
        }, 0);
        grandTotal += coSubtotal;

        tableHtml += `<tr class="category-header-row">
                        <td colspan="5"><strong>Change Orders</strong></td>
                        <td style="text-align: right;"><strong>${coSubtotal.toLocaleString('en-ph', { style: 'currency', currency: 'PHP' })}</strong></td>
                      </tr>`;

        changeOrderItems.forEach(task => {
            const dupa = dupaMap.get(task.id);
            const totalAmount = calculateDupaTotalCost(dupa);
            const unitPrice = (task.quantity !== 0) ? (totalAmount / task.quantity) : 0;
            tableHtml += `
                <tr>
                    <td>${task.displayName}</td>
                    <td>${task.quantity.toLocaleString()}</td>
                    <td>${task.unit}</td>
                    <td style="text-align: right;">${unitPrice.toLocaleString('en-ph', { style: 'currency', currency: 'PHP' })}</td>
                    <td style="text-align: right;">${totalAmount.toLocaleString('en-ph', { style: 'currency', currency: 'PHP' })}</td>
                    <td class="actions-cell"><button class="btn btn-secondary view-co-dupa-details-btn" data-co-item-id="${task.id}">View DUPA</button></td>
                </tr>
            `;
        });
    }

    tableHtml += `</tbody><tfoot><tr class="boq-summary-row"><td colspan="5" style="text-align:right;">Revised Grand Total</td><td style="text-align: right;">${grandTotal.toLocaleString('en-ph', { style: 'currency', currency: 'PHP' })}</td></tr></tfoot></table>`;
    revisedBoqTableContainer.innerHTML = tableHtml;
};

const showRevisedPertCpmForProject = async () => {
    revisedBoqDisplayView.classList.add('hidden');
    revisedPertCpmDisplayView.classList.remove('hidden');
    revisedPertCpmProjectName.textContent = `Revised PERT-CPM: ${revisedBoqProjectName.textContent.replace('Revised BOQ: ', '')}`;

    const data = await getPertCpmData(currentBoqProjectId, true);
    if (!data) {
        revisedPertCpmTableContainer.innerHTML = '<p>No data to display.</p>';
        return;
    }

    data.quantities.sort((a, b) => {
        const taskA = data.tasks.get(a.uniqueId);
        const taskB = data.tasks.get(b.uniqueId);
        if (!taskA || !taskB) return 0;
        if (taskA.es === taskB.es) return taskA.name.localeCompare(taskB.name);
        return taskA.es - taskB.es;
    });

    let tableHtml = '<table id="revised-pert-cpm-table"><thead><tr><th>Task</th><th>Duration</th><th>ES</th><th>EF</th><th>LS</th><th>LF</th><th>Slack</th></tr></thead><tbody>';
    data.quantities.forEach(q => {
        const task = data.tasks.get(q.uniqueId);
        if(!task) return;
        const slack = task.ls - task.es;
        const isCritical = slack <= 0;
        tableHtml += `<tr class="${isCritical ? 'critical-path' : ''}">
            <td>${task.name}</td><td>${task.duration}</td><td>${task.es}</td><td>${task.ef}</td><td>${task.ls}</td><td>${task.lf}</td><td>${slack}</td>
        </tr>`;
    });
    tableHtml += '</tbody></table>';
    revisedPertCpmTableContainer.innerHTML = tableHtml;
};
function initializeReportsModule() {
    boqProjectsListDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-boq-btn')) {
            showBoqForProject(parseInt(e.target.dataset.id), e.target.dataset.name);
        }
    });
    deleteBoqBtn.addEventListener('click', handleDeleteBoq);
    viewPertCpmBtn.addEventListener('click', showPertCpmForProject);
    viewSCurveBtn.addEventListener('click', showSCurveForProject);
    viewGanttChartBtn.addEventListener('click', showGanttChartForProject);

    document.getElementById('gantt-view-day').addEventListener('click', () => {
        if (ganttChart) ganttChart.change_view_mode('Day');
    });
    document.getElementById('gantt-view-week').addEventListener('click', () => {
        if (ganttChart) ganttChart.change_view_mode('Week');
    });
    document.getElementById('gantt-view-month').addEventListener('click', () => {
        if (ganttChart) ganttChart.change_view_mode('Month');
    });
    document.getElementById('reports-gantt-sort').addEventListener('change', showGanttChartForProject);

    viewNetworkDiagramBtn.addEventListener('click', showNetworkDiagram);
    viewResourceScheduleBtn.addEventListener('click', showManpowerEquipmentSchedule);

    dupaReportModalClose.addEventListener('click', closeDupaReportModal);

    boqTbody.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-dupa-details-btn')) {
            const quantityId = parseInt(e.target.dataset.quantityId);
            if (isNaN(quantityId)) {
                alert('This BOQ is outdated and does not support this feature. Please delete this BOQ and regenerate it to use this function.');
                return;
            }
            showDupaDetails(quantityId);
        }
    });

    revisedBoqTableContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-co-dupa-details-btn')) {
            const coItemId = parseInt(e.target.dataset.coItemId);
            showCoItemDupaDetails(coItemId);
        }
    });

    revisedBoqProjectsListDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-revised-boq-btn')) {
            showRevisedBoqForProject(parseInt(e.target.dataset.id), e.target.dataset.name);
        }
    });
    
    viewRevisedPertCpmBtn.addEventListener('click', showRevisedPertCpmForProject);
    
    const viewRevisedNetworkDiagramBtn = document.getElementById('view-revised-network-diagram-btn');
    const viewRevisedResourceScheduleBtn = document.getElementById('view-revised-resource-schedule-btn');

    if (viewRevisedNetworkDiagramBtn) viewRevisedNetworkDiagramBtn.addEventListener('click', showRevisedNetworkDiagram);
    if (viewRevisedResourceScheduleBtn) viewRevisedResourceScheduleBtn.addEventListener('click', showRevisedResourceSchedule);
}
// --- End of js/reports.js ---