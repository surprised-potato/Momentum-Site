Momentum 🏗️

<p align="center">
<img src="Images/Logo.png" alt="Momentum Logo" width="150">
</p>

<p align="center">
<em>A client-side, offline-first construction management application for seamless project planning, tracking, and reporting.</em>
</p>

<p align="center">
<img src="https://img.shields.io/badge/status-active-brightgreen" alt="Status">
<img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
</p>

Momentum is a comprehensive Single Page Application (SPA) designed for construction managers, project engineers, and contractors. It leverages the power of your browser's IndexedDB to provide a complete, offline-capable suite of tools to manage a project's lifecycle—from initial quantity takeoff to final progress monitoring. <a href = "https://surprised-potato.github.io/Momentum-Site/"> DEMO </a>

✨ Key Features

    Project Management: Create, edit, and manage detailed project portfolios with full import/export capabilities.

    Dashboard: Get a high-level overview of all projects, their statuses, financials, and identify projects that require attention due to stalls or schedule slippage.

    Pre-construction Suite:

        Quantity Takeoff: Define the project scope with categorized work items and optional sub-quantity breakdowns.

        DUPA (Detailed Unit Price Analysis): Perform granular cost analysis for each work item based on labor, materials, and equipment.

        Task Sequencing: Visually establish dependencies between all project tasks.

    Dynamic Reporting & Scheduling:

        Generate a Bill of Quantities (BOQ) which locks the pre-construction plan.

        Perform PERT-CPM analysis to identify the critical path.

        Visualize schedules with interactive Gantt Charts.

        Track planned vs. actual progress with S-Curve Analysis.

        Generate Network Diagrams and Resource Schedules.

    Construction Phase Tracking:

        File daily Accomplishment Reports to track on-site progress.

        Monitor real-time progress against the baseline schedule with the Tracking Gantt and Tracking S-Curve.

        Generate Look-Ahead Reports for short-term planning.

    Change Order Management:

        Create and manage variation orders.

        Clearly distinguish between additive and deductive items with automatic subtotaling.

        Integrate approved change orders seamlessly into the revised project schedule and budget.

    Centralized Libraries:

        Maintain reusable libraries for Materials, Resources (Labor & Equipment), and Crews.

        Import and export library data for backup or sharing.

💻 Tech Stack

    Frontend: HTML5, CSS3, Vanilla JavaScript (ES6+)

    Database: Dexie.js (A powerful wrapper for IndexedDB)

    Charting & Diagrams:

        Chart.js for S-Curve and pie charts.

        Frappe Gantt for Gantt chart visualizations.

        Mermaid.js for network diagrams.

🚀 Getting Started

No complex setup is required. As this is a purely client-side application, you can run it directly in your browser.

    Clone or download the repository.

    Open the index.html file in a modern web browser (e.g., Google Chrome, Firefox, Microsoft Edge).

All your project data will be saved locally in your browser's IndexedDB storage.

📋 Project Workflow

    Setup: (Optional) Go to the Libraries section to populate your common Materials, Resources, and Crews.

    Pre-construction: Create a Project, define its scope in Take Off, calculate costs in DUPA, and set dependencies in Task Sequencing.

    Lock & Plan: Generate the BOQ in the Pre-construction Reports module. This locks the initial plan and enables all scheduling reports.

    Execute & Track: Once work begins, file daily progress in the Accomplishment Report module. Monitor the project's health using the Tracking Gantt and Tracking S-Curve.

    Manage Changes: Use the Change Orders module to document any scope variations. Once approved, they will automatically update the schedule and revised reports.

📜 License

This project is licensed under the MIT License. See the LICENSE file for details.
