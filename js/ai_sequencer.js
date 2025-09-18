/*
- Author: Gemini
- OS support: Cross-platform
- Description: A rule-based AI wizard for automatically sequencing project tasks.
*/

const SEQUENCING_RULES = [
    { keyword: 'demolition', precedes: ['framing', 'excavation', 'masonry'] },
    { keyword: 'excavation', precedes: ['rebar', 'footing', 'foundation', 'slab'] },
    { keyword: 'rebar', precedes: ['concrete'] },
    { keyword: 'foundation', precedes: ['framing', 'masonry', 'chb'] },
    { keyword: 'framing', precedes: ['rough-in', 'electrical', 'plumbing', 'hvac', 'roofing'] },
    { keyword: 'masonry', precedes: ['plastering', 'roofing', 'closing'] },
    { keyword: 'chb', precedes: ['plastering', 'closing'] },
    { keyword: 'rough-in', precedes: ['closing', 'drywall', 'ceiling'] },
    { keyword: 'closing', precedes: ['finishes', 'painting', 'tiling'] },
    { keyword: 'drywall', precedes: ['finishes', 'painting', 'tiling'] },
    { keyword: 'ceiling', precedes: ['painting', 'fixtures'] },
    { keyword: 'tiling', precedes: ['fixtures'] },
    { keyword: 'painting', precedes: ['fixtures'] },
    { keyword: 'flooring', precedes: ['fixtures', 'partition'] }
];

const getKeywords = (text) => {
    if (!text) return [];
    return text.toLowerCase().match(/\b(\w+)\b/g) || [];
};

const runAiSequencing = async (projectId) => {
    if (!confirm('This will attempt to create sequence links for all unsequenced tasks. Existing links will not be changed. Continue?')) {
        return;
    }

    try {
        const allTasks = await getAllProjectTasks(projectId);
        const allLinks = await db.tasks.where({ projectId }).toArray();

        const sequencedIds = new Set();
        allLinks.forEach(link => {
            sequencedIds.add(link.predecessorId);
            sequencedIds.add(link.successorId);
        });

        const unsequencedTasks = allTasks.filter(task => !sequencedIds.has(task.uniqueId));

        if (unsequencedTasks.length < 2) {
            alert('Not enough unsequenced tasks to create new links.');
            return;
        }

        const tasksWithKeywords = unsequencedTasks.map(task => ({
            ...task,
            keywords: new Set(getKeywords(task.displayName))
        }));

        const newLinks = [];
        for (let i = 0; i < tasksWithKeywords.length; i++) {
            for (let j = 0; j < tasksWithKeywords.length; j++) {
                if (i === j) continue;

                const taskA = tasksWithKeywords[i];
                const taskB = tasksWithKeywords[j];

                for (const rule of SEQUENCING_RULES) {
                    if (taskA.keywords.has(rule.keyword)) {
                        for (const successorKeyword of rule.precedes) {
                            if (taskB.keywords.has(successorKeyword)) {
                                newLinks.push({
                                    projectId: projectId,
                                    predecessorId: taskA.uniqueId,
                                    successorId: taskB.uniqueId
                                });
                            }
                        }
                    }
                }
            }
        }

        if (newLinks.length > 0) {
            await db.tasks.bulkAdd(newLinks);
            alert(`AI Sequencing Complete: ${newLinks.length} new link(s) were created.`);
            await displaySequencesOverview(); // This function is in sequencing.js
        } else {
            alert('AI Sequencing Complete: No new links could be determined based on the rules.');
        }

    } catch (error) {
        console.error("AI Sequencing failed:", error);
        alert("An error occurred during AI sequencing.");
    }
};

// --- End of ai_sequencer.js ---