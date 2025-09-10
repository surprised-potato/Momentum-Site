// Author: Gemini
// OS support: Cross-platform
// Description: Logic for the application's main dashboard view.

let projectStatusChart = null;
let projectsGanttChart = null;

const getProjectActualPercentComplete = async (projectId) => {
    // Note: Depends on the corrected getAllTasksForReport function from the previous step
    const { allTasks, allDupas } = await getAllTasksForReport(projectId, true);
    if (allTasks.length === 0) return 0;

    const dupaMap = new Map();
    allDupas.forEach(d => {
        const key = d.quantityId || d.changeOrderItemId;
        dupaMap.set(key, d);
    });

    let totalProjectValue = 0;
    let accomplishedValue = 0;

    // We need the original quantities to correctly apportion costs for sub-tasks
    const quantities = await db.quantities.where({ projectId }).toArray();
    const parentQuantityMap = new Map(quantities.map(q => [q.id, q]));

    for (const task of allTasks) {
        let taskCost = 0;
        // Determine the cost for each type of task
        if (task.type === 'subquantity') {
            const parentDupa = dupaMap.get(task.quantityId);
            const parentQuantity = parentQuantityMap.get(task.quantityId);
            const parentTotalCost = calculateDupaTotalCost(parentDupa);
            const numSubtasks = parentQuantity?.subquantities?.length || 1;
            taskCost = parentTotalCost / numSubtasks; // Apportion the parent's cost
        } else { // For regular 'quantity' or 'changeOrderItem' tasks
            const dupa = dupaMap.get(task.id);
            taskCost = calculateDupaTotalCost(dupa);
        }
        
        totalProjectValue += taskCost;
        accomplishedValue += taskCost * ((task.percentComplete || 0) / 100);
    }

    if (totalProjectValue === 0) return 0;
    return (accomplishedValue / totalProjectValue) * 100;
};

const getProjectPlannedPercentComplete = async (project) => {
    const sCurveData = await getSCurveData(project.id, true);
    if (!sCurveData || !project.startDate) return 0;

    const today = new Date();
    const startDate = new Date(project.startDate);
    const daysElapsed = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    if (daysElapsed < 0) return 0;
    if (daysElapsed >= sCurveData.plannedPercentage.length) return 100;
    
    return sCurveData.plannedPercentage[daysElapsed];
};

const updateDashboard = async () => {
    try {
        const allProjects = await db.projects.toArray();
        const allChangeOrders = await db.changeOrders.toArray();

        updateSummaryCards(allProjects, allChangeOrders);
        updateStatusChart(allProjects);
        await updateAttentionList(allProjects); // Use await for the async function
        updateDashboardGanttChart(allProjects);

    } catch (error) {
        console.error("Failed to update dashboard:", error);
    }
};

const updateSummaryCards = (projects, changeOrders) => {
    const onGoingProjects = projects.filter(p => (p.projectStatus || 'On-Going') === 'On-Going');
    const completedProjects = projects.filter(p => p.projectStatus === 'Completed');
    const pendingChangeOrders = changeOrders.filter(co => co.status === 'Pending');
    const totalActiveValue = onGoingProjects.reduce((sum, p) => sum + (p.contractAmount || 0), 0);
    document.getElementById('ongoing-project-count').textContent = onGoingProjects.length;
    document.getElementById('completed-project-count').textContent = completedProjects.length;
    document.getElementById('pending-co-count').textContent = pendingChangeOrders.length;
    document.getElementById('active-contract-value').textContent = totalActiveValue.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
};

const updateStatusChart = (projects) => {
    const statusCounts = projects.reduce((acc, p) => {
        const status = p.projectStatus || 'On-Going';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    const chartCanvas = document.getElementById('project-status-chart');
    if (projectStatusChart) {
        projectStatusChart.destroy();
    }
    projectStatusChart = new Chart(chartCanvas, {
        type: 'pie',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                label: 'Projects',
                data: Object.values(statusCounts),
                backgroundColor: [
                    'rgba(13, 110, 253, 0.7)', 'rgba(25, 135, 84, 0.7)',
                    'rgba(255, 193, 7, 0.7)', 'rgba(108, 117, 125, 0.7)', 'rgba(220, 53, 69, 0.7)'
                ],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
};

const updateAttentionList = async (projects) => {
    const attentionList = document.getElementById('attention-projects-list');
    attentionList.innerHTML = '<li>Checking project statuses...</li>';

    const today = new Date().toISOString().split('T')[0];

    // Category 1: Stalled Projects (Not yet started)
    const stalledProjects = projects.filter(p => 
        (p.projectStatus || 'On-Going') === 'On-Going' && p.targetStartDate && p.targetStartDate < today && !p.startDate 
    );

    // Category 2: Slipped Projects (Started but behind schedule)
    const ongoingStartedProjects = projects.filter(p =>
        (p.projectStatus || 'On-Going') === 'On-Going' && p.startDate
    );

    const slippedProjects = [];
    const SLIPPAGE_THRESHOLD = 5.0; // Only show projects more than 5% behind schedule

    for (const p of ongoingStartedProjects) {
        const planned = await getProjectPlannedPercentComplete(p);
        const actual = await getProjectActualPercentComplete(p.id);
        const slippage = planned - actual;

        if (slippage > SLIPPAGE_THRESHOLD) {
            slippedProjects.push({
                ...p,
                slippage: slippage,
                planned: planned,
                actual: actual
            });
        }
    }

    // Sort slipped projects to show the most critical ones first
    slippedProjects.sort((a, b) => b.slippage - a.slippage);

    // Render the final list
    attentionList.innerHTML = '';

    if (stalledProjects.length === 0 && slippedProjects.length === 0) {
        attentionList.innerHTML = '<li>All projects are on track! ✨</li>';
        return;
    }

    if (stalledProjects.length > 0) {
        const header = document.createElement('li');
        header.innerHTML = `<h4>Not Yet Started</h4>`;
        header.className = 'attention-header';
        attentionList.appendChild(header);
        stalledProjects.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${p.projectName}</strong><span>Target start was ${p.targetStartDate}, but no progress has been reported.</span>`;
            attentionList.appendChild(li);
        });
    }

    if (slippedProjects.length > 0) {
        const header = document.createElement('li');
        header.innerHTML = `<h4>Behind Schedule</h4>`;
        header.className = 'attention-header';
        attentionList.appendChild(header);
        slippedProjects.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${p.projectName}</strong><span>Slippage of <strong>${p.slippage.toFixed(2)}%</strong> (Planned: ${p.planned.toFixed(2)}%, Actual: ${p.actual.toFixed(2)}%)</span>`;
            attentionList.appendChild(li);
        });
    }
};

const updateDashboardGanttChart = async (projects) => {
    const ganttContainer = document.getElementById('dashboard-gantt-chart-target');
    ganttContainer.innerHTML = '';

    const ongoingProjects = projects.filter(p =>
        (p.projectStatus || 'On-Going') === 'On-Going' && p.startDate && p.contractDuration > 0
    );

    if (ongoingProjects.length === 0) {
        ganttContainer.innerHTML = '<p style="text-align: center; color: var(--grey-color);">No active projects with a start date to display.</p>';
        return;
    }

    let tasksForGantt = [];
    for (const p of ongoingProjects) {
        const startDate = new Date(p.startDate);
        startDate.setMinutes(startDate.getMinutes() + startDate.getTimezoneOffset());
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + p.contractDuration);
        const { allTasks } = await getAllTasksForReport(p.id, true);
        let overallProgress = 0;
        if(allTasks.length > 0) {
            const total = allTasks.reduce((sum, task) => sum + (task.percentComplete || 0), 0);
            overallProgress = total / allTasks.length;
        }
        tasksForGantt.push({
            id: `proj_${p.id}`,
            name: p.projectName,
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
            progress: overallProgress,
        });
    }
    
    const sortBy = document.getElementById('dashboard-gantt-sort').value;
    tasksForGantt.sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'progress') return a.progress - b.progress;
        return new Date(a.start) - new Date(b.start);
    });

    projectsGanttChart = new Gantt("#dashboard-gantt-chart-target", tasksForGantt, {
        view_mode: 'Week',
        custom_popup_html: function(task) {
            return `<div class="gantt-popup-wrapper">
                <strong>${task.name}</strong>
                <p>Overall Progress: ${task.progress.toFixed(1)}%</p>
            </div>`;
        }
    });
};
function initializeDashboardModule() {
    // Add these three event listeners
    document.getElementById('dashboard-gantt-view-day').addEventListener('click', () => {
        if (projectsGanttChart) projectsGanttChart.change_view_mode('Day');
    });
    document.getElementById('dashboard-gantt-view-week').addEventListener('click', () => {
        if (projectsGanttChart) projectsGanttChart.change_view_mode('Week');
    });
    document.getElementById('dashboard-gantt-view-month').addEventListener('click', () => {
        if (projectsGanttChart) projectsGanttChart.change_view_mode('Month');
    });
}

// --- End of dashboard.js ---