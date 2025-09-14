// Author: Gemini
// OS support: Cross-platform
// Description: Controls view switching and navigation for the SPA.

let dashboardView, projectsView, projectSummaryView, takeoffView, dupaView, sequencingView, reportsView, accomplishmentView, accomplishmentListView, accomplishmentDetailView, trackingGanttView, trackingSCurveView, changeOrdersView, revisedReportsView, lookaheadView, materialsLibraryView, dupaLibraryView, libraryManagementView, documentationView;
let allViews = [];

let takeoffQuantitiesView, dupaQuantityListView, dupaFormView, sequencingTasksView, boqDisplayView, pertCpmDisplayView, ganttChartDisplayView, sCurveDisplayView, pertCpmNetworkView, resourceScheduleView;
let revisedBoqProjectListView, revisedBoqDisplayView, revisedPertCpmDisplayView, revisedPertCpmNetworkView, revisedResourceScheduleView;
let dupaReportModal, dupaReportModalClose, dupaReportTitle, dupaReportContent, coItemTypeModal, coItemTypeModalClose, coExistingItemModal, coExistingItemModalClose, importPreviewModal, importPreviewModalClose, libraryPickerModal, libraryPickerModalClose, libraryPickerTitle, libraryPickerSearch, libraryPickerList, libraryPickerCrewMultiplier, libraryPickerCrewCount;
let navDashboard, navProjects, navMaterialsLibrary, navDupaLibrary, navLibraryManagement, navDocumentation;
let backToTakeoffListBtn, backToDupaProjectsBtn, backToDupaQuantitiesBtn, backToSequencingProjectsBtn, backToBoqProjectsBtn, backToBoqViewBtn, backToPertCpmViewBtn, backToPertCpmViewFromSCurveBtn, backToPertCpmFromNetworkBtn, backToPertCpmFromResourceBtn, backToRevisedBoqProjectsBtn, backToRevisedBoqViewBtn;
let backToRevisedPertCpmBtn, backToRevisedPertCpmFromNetworkBtn, backToRevisedPertCpmFromResourceBtn;

const openDupaReportModal = () => dupaReportModal.style.display = 'block';
const closeDupaReportModal = () => dupaReportModal.style.display = 'none';
const openCoItemTypeModal = () => coItemTypeModal.style.display = 'block';
const closeCoItemTypeModal = () => coItemTypeModal.style.display = 'none';
const openCoExistingItemModal = () => coExistingItemModal.style.display = 'block';
const closeCoExistingItemModal = () => coExistingItemModal.style.display = 'none';
const openImportPreviewModal = () => importPreviewModal.style.display = 'block';
const closeImportPreviewModal = () => importPreviewModal.style.display = 'none';
const openLibraryPickerModal = () => libraryPickerModal.style.display = 'block';
const closeLibraryPickerModal = () => libraryPickerModal.style.display = 'none';

const openLibraryPicker = (config) => {
    libraryPickerTitle.textContent = config.title;
    libraryPickerSearch.value = '';
    libraryPickerCrewMultiplier.classList.toggle('hidden', !config.isCrewPicker);
    libraryPickerCrewCount.value = 1;
    
    const renderList = (items) => {
        libraryPickerList.innerHTML = '';
        if (items.length === 0) {
            libraryPickerList.innerHTML = '<p>No items found.</p>';
            return;
        }
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.dataset.id = item.id;
            div.style.cursor = 'pointer';
            let itemText = `<h3>${item.name}</h3>`;
            if (item.type) itemText += `<span>(${item.type})</span>`;
            if (item.productivityRate) itemText += `<span> - ${item.productivityRate} ${item.productivityUnit}</span>`;
            div.innerHTML = itemText;
            libraryPickerList.appendChild(div);
        });
    };

    renderList(config.dataSource);

    libraryPickerSearch.oninput = () => {
        const filter = libraryPickerSearch.value.toLowerCase();
        const filteredItems = config.dataSource.filter(item => 
            config.searchKeys.some(key => item[key].toLowerCase().includes(filter))
        );
        renderList(filteredItems);
    };

    libraryPickerList.onclick = (e) => {
        const itemElement = e.target.closest('.list-item');
        if (itemElement) {
            const itemId = parseInt(itemElement.dataset.id);
            const selectedItem = config.dataSource.find(item => item.id === itemId);
            if (selectedItem) {
                const multiplier = config.isCrewPicker ? parseInt(libraryPickerCrewCount.value) : 1;
                config.onSelect(selectedItem, multiplier);
                closeLibraryPickerModal();
            }
        }
    };
    
    openLibraryPickerModal();
};

const setActiveNav = (activeLink) => {
    const allNavLinks = document.querySelectorAll('.navbar ul a');
    allNavLinks.forEach(l => l.classList.remove('active'));

    if (activeLink) {
        activeLink.classList.add('active');
        const parentDropdown = activeLink.closest('.dropdown');
        if (parentDropdown) {
            parentDropdown.querySelector('.dropbtn').classList.add('active');
        }
    }
};
const showView = (activeView) => allViews.forEach(v => v.classList.toggle('hidden', v !== activeView));

const showDashboard = () => { showView(dashboardView); setActiveNav(navDashboard); updateDashboard(); };
const showProjects = () => { showView(projectsView); setActiveNav(navProjects); displayProjects(); };
const showDocumentation = () => {
    showView(documentationView);
    setActiveNav(navDocumentation);
};
const showTakeOff = () => showProjects();
const showDupa = () => showProjects();
const showSequencing = () => showProjects();
const showReports = () => showProjects();
const showChangeOrders = () => showProjects();
const showAccomplishment = () => showProjects();
const showTrackingGantt = () => showProjects();
const showTrackingSCurve = () => showProjects();
const showRevisedReports = () => showProjects();
const showLookahead = () => showProjects();
const showMaterialsLibrary = () => {
    showView(materialsLibraryView);
    setActiveNav(navMaterialsLibrary);
    displayMaterials();
};
const showDupaLibrary = () => {
    showView(dupaLibraryView);
    setActiveNav(navDupaLibrary);
    displayResources();
    displayCrews();
};
const showLibraryManagement = () => {
    showView(libraryManagementView);
    setActiveNav(navLibraryManagement);
};

function initializeViewsModule() {
    dashboardView = document.getElementById('dashboard-view');
    projectsView = document.getElementById('projects-view');
    projectSummaryView = document.getElementById('project-summary-view');
    takeoffView = document.getElementById('takeoff-view');
    dupaView = document.getElementById('dupa-view');
    sequencingView = document.getElementById('sequencing-view');
    reportsView = document.getElementById('reports-view');
    accomplishmentView = document.getElementById('accomplishment-view');
    accomplishmentListView = document.getElementById('accomplishment-list-view');
    accomplishmentDetailView = document.getElementById('accomplishment-detail-view');
    trackingGanttView = document.getElementById('tracking-gantt-view');
    trackingSCurveView = document.getElementById('tracking-s-curve-view');
    changeOrdersView = document.getElementById('change-orders-view');
    revisedReportsView = document.getElementById('revised-reports-view');
    lookaheadView = document.getElementById('lookahead-view');
    materialsLibraryView = document.getElementById('materials-library-view');
    dupaLibraryView = document.getElementById('dupa-library-view');
    libraryManagementView = document.getElementById('library-management-view');
    documentationView = document.getElementById('documentation-view');
    
    revisedPertCpmNetworkView = document.getElementById('revised-pert-cpm-network-view');
    revisedResourceScheduleView = document.getElementById('revised-resource-schedule-view');

    allViews = [dashboardView, projectsView, projectSummaryView, takeoffView, dupaView, sequencingView, reportsView, accomplishmentView, accomplishmentListView, accomplishmentDetailView, trackingGanttView, trackingSCurveView, lookaheadView, changeOrdersView, revisedReportsView, materialsLibraryView, dupaLibraryView, libraryManagementView, documentationView, revisedPertCpmNetworkView, revisedResourceScheduleView];

    takeoffQuantitiesView = document.getElementById('takeoff-quantities-view');
    dupaQuantityListView = document.getElementById('dupa-quantity-list-view');
    dupaFormView = document.getElementById('dupa-form-view');
    sequencingTasksView = document.getElementById('sequencing-tasks-view');
    boqDisplayView = document.getElementById('boq-display-view');
    pertCpmDisplayView = document.getElementById('pert-cpm-display-view');
    ganttChartDisplayView = document.getElementById('gantt-chart-display-view');
    sCurveDisplayView = document.getElementById('s-curve-display-view');
    pertCpmNetworkView = document.getElementById('pert-cpm-network-view');
    resourceScheduleView = document.getElementById('resource-schedule-view');

    revisedBoqDisplayView = document.getElementById('revised-boq-display-view');
    revisedPertCpmDisplayView = document.getElementById('revised-pert-cpm-display-view');

    dupaReportModal = document.getElementById('dupa-details-modal');
    dupaReportModalClose = document.querySelector('.dupa-details-modal-close');
    dupaReportTitle = document.getElementById('dupa-details-title');
    dupaReportContent = document.getElementById('dupa-details-content');
    coItemTypeModal = document.getElementById('co-item-type-modal');
    coItemTypeModalClose = document.querySelector('.co-item-type-modal-close');
    coExistingItemModal = document.getElementById('co-existing-item-modal');
    coExistingItemModalClose = document.querySelector('.co-existing-item-modal-close');
    importPreviewModal = document.getElementById('import-preview-modal');
    importPreviewModalClose = document.querySelector('.import-preview-modal-close');
    libraryPickerModal = document.getElementById('library-picker-modal');
    libraryPickerModalClose = document.getElementById('library-picker-modal-close');
    libraryPickerTitle = document.getElementById('library-picker-title');
    libraryPickerSearch = document.getElementById('library-picker-search');
    libraryPickerList = document.getElementById('library-picker-list');
    libraryPickerCrewMultiplier = document.getElementById('library-picker-crew-multiplier');
    libraryPickerCrewCount = document.getElementById('library-picker-crew-count');

    navDashboard = document.getElementById('nav-dashboard');
    navProjects = document.getElementById('nav-projects');
    navMaterialsLibrary = document.getElementById('nav-materials-library');
    navDupaLibrary = document.getElementById('nav-dupa-library');
    navLibraryManagement = document.getElementById('nav-library-management');
    navDocumentation = document.getElementById('nav-documentation');
    navBrandLink = document.getElementById('nav-brand-link');

    navDashboard.addEventListener('click', (e) => { e.preventDefault(); showDashboard(); });
    navProjects.addEventListener('click', (e) => { e.preventDefault(); showProjects(); });
    navMaterialsLibrary.addEventListener('click', (e) => { e.preventDefault(); showMaterialsLibrary(); });
    navDupaLibrary.addEventListener('click', (e) => { e.preventDefault(); showDupaLibrary(); });
    navLibraryManagement.addEventListener('click', (e) => { e.preventDefault(); showLibraryManagement(); });
    navDocumentation.addEventListener('click', (e) => { e.preventDefault(); showDocumentation(); });
    navBrandLink.addEventListener('click', (e) => { e.preventDefault(); showDashboard(); });

    const backToHub = () => { if(currentHubProjectId) showProjectSummary(currentHubProjectId); };

    document.getElementById('back-to-projects-from-summary').addEventListener('click', showProjects);
    document.getElementById('view-past-reports-btn').addEventListener('click', () => showAccomplishmentList(currentConstructionProjectId));
    document.getElementById('back-to-accomplishment-list').addEventListener('click', () => showAccomplishmentList(currentConstructionProjectId));

    backToTakeoffListBtn = document.getElementById('back-to-takeoff-list');
    backToDupaProjectsBtn = document.getElementById('back-to-dupa-projects');
    backToDupaQuantitiesBtn = document.getElementById('back-to-dupa-quantities');
    backToSequencingProjectsBtn = document.getElementById('back-to-sequencing-projects');
    backToBoqProjectsBtn = document.getElementById('back-to-boq-projects');
    backToBoqViewBtn = document.getElementById('back-to-boq-view');
    backToPertCpmViewBtn = document.getElementById('back-to-pert-cpm-view');
    backToPertCpmViewFromSCurveBtn = document.getElementById('back-to-pert-cpm-view-from-s-curve');
    backToPertCpmFromNetworkBtn = document.getElementById('back-to-pert-cpm-from-network-btn');
    backToPertCpmFromResourceBtn = document.getElementById('back-to-pert-cpm-from-resource-btn');
    backToRevisedBoqProjectsBtn = document.getElementById('back-to-revised-boq-projects');
    backToRevisedBoqViewBtn = document.getElementById('back-to-revised-boq-view');
    
    backToRevisedPertCpmBtn = document.getElementById('back-to-revised-boq-view');
    backToRevisedPertCpmFromNetworkBtn = document.getElementById('back-to-revised-pert-cpm-from-network-btn');
    backToRevisedPertCpmFromResourceBtn = document.getElementById('back-to-revised-pert-cpm-from-resource-btn');
    
    backToTakeoffListBtn.addEventListener('click', backToHub);
    backToDupaProjectsBtn.addEventListener('click', backToHub);
    backToDupaQuantitiesBtn.addEventListener('click', () => showDupaQuantitiesForProject(currentDupaProjectId, dupaProjectName.textContent));
    backToSequencingProjectsBtn.addEventListener('click', backToHub);
    backToBoqProjectsBtn.addEventListener('click', backToHub);
    
    backToBoqViewBtn.addEventListener('click', () => {
        pertCpmDisplayView.classList.add('hidden');
        ganttChartDisplayView.classList.add('hidden');
        sCurveDisplayView.classList.add('hidden');
        pertCpmNetworkView.classList.add('hidden');
        resourceScheduleView.classList.add('hidden');
        boqDisplayView.classList.remove('hidden');
    });

    const goBackToPertCpm = () => {
        ganttChartDisplayView.classList.add('hidden');
        sCurveDisplayView.classList.add('hidden');
        pertCpmNetworkView.classList.add('hidden');
        resourceScheduleView.classList.add('hidden');
        pertCpmDisplayView.classList.remove('hidden');
    };

    backToPertCpmViewBtn.addEventListener('click', goBackToPertCpm);
    backToPertCpmViewFromSCurveBtn.addEventListener('click', goBackToPertCpm);
    backToPertCpmFromNetworkBtn.addEventListener('click', goBackToPertCpm);
    backToPertCpmFromResourceBtn.addEventListener('click', goBackToPertCpm);

    backToRevisedBoqProjectsBtn.addEventListener('click', backToHub);
    backToRevisedBoqViewBtn.addEventListener('click', () => {
        revisedPertCpmDisplayView.classList.add('hidden');
        revisedBoqDisplayView.classList.remove('hidden');
    });

    const goBackToRevisedPertCpm = () => {
        revisedPertCpmNetworkView.classList.add('hidden');
        revisedResourceScheduleView.classList.add('hidden');
        revisedPertCpmDisplayView.classList.remove('hidden');
    };
    if (backToRevisedPertCpmBtn) backToRevisedPertCpmBtn.addEventListener('click', () => {
        revisedPertCpmDisplayView.classList.add('hidden');
        revisedBoqDisplayView.classList.remove('hidden');
    });
    if (backToRevisedPertCpmFromNetworkBtn) backToRevisedPertCpmFromNetworkBtn.addEventListener('click', goBackToRevisedPertCpm);
    if (backToRevisedPertCpmFromResourceBtn) backToRevisedPertCpmFromResourceBtn.addEventListener('click', goBackToRevisedPertCpm);

    document.getElementById('back-to-co-projects').addEventListener('click', backToHub);
    document.getElementById('back-to-accomplishment-projects').addEventListener('click', backToHub);
    document.getElementById('back-to-tracking-gantt-projects').addEventListener('click', backToHub);
    document.getElementById('back-to-tracking-s-curve-projects').addEventListener('click', backToHub);
    document.getElementById('back-to-lookahead-projects').addEventListener('click', backToHub);
    
    projectSummaryView.addEventListener('click', (e) => {
        const target = e.target.closest('.hub-buttons button');
        if (!target) return;

        const projectId = parseInt(target.dataset.id);
        const projectName = target.dataset.name;

        if (!projectId || !projectName) return;

        switch (target.id) {
            case 'hub-btn-takeoff':
                setActiveNav(navProjects);
                showView(takeoffView);
                showQuantitiesForProject(projectId, projectName);
                break;
            case 'hub-btn-dupa':
                setActiveNav(navProjects);
                showView(dupaView);
                showDupaQuantitiesForProject(projectId, projectName);
                break;
            case 'hub-btn-sequencing':
                setActiveNav(navProjects);
                showView(sequencingView);
                showSequencesForProject(projectId, projectName);
                break;
            case 'hub-btn-reports':
                setActiveNav(navProjects);
                showView(reportsView);
                showBoqForProject(projectId, projectName);
                break;
            case 'hub-btn-change-orders':
                setActiveNav(navProjects);
                showView(changeOrdersView);
                showChangeOrdersForProject(projectId, projectName);
                break;
            case 'hub-btn-accomplishment':
                setActiveNav(navProjects);
                showView(accomplishmentView);
                showAccomplishmentForm(projectId, projectName);
                break;
            case 'hub-btn-tracking-gantt':
                setActiveNav(navProjects);
                showView(trackingGanttView);
                showTrackingGanttChart(projectId, projectName);
                break;
            case 'hub-btn-tracking-scurve':
                setActiveNav(navProjects);
                showView(trackingSCurveView);
                renderTrackingSCurve(projectId, projectName);
                break;
            case 'hub-btn-revised-reports':
                setActiveNav(navProjects);
                showView(revisedReportsView);
                showRevisedBoqForProject(projectId, projectName);
                break;
            case 'hub-btn-lookahead':
                setActiveNav(navProjects);
                showView(lookaheadView);
                showLookAheadReportView(projectId, projectName);
                break;
        }
    });
}