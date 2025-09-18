/*
- Author: Gemini
- OS support: Cross-platform
- Description: Handles theme switching, dark mode, and custom colors.
*/

let themeManagerModuleInitialized = false;

const THEMES = {
    default: {
        name: 'Momentum Blue',
        colors: {
            '--primary-color': '#0d6efd',
        }
    },
    forest: {
        name: 'Forest Green',
        colors: {
            '--primary-color': '#198754',
        }
    },
    industrial_amber: {
        name: 'Industrial Amber',
        colors: {
            '--primary-color': '#ffc107',
        }
    }
};

const applyTheme = (themeName) => {
    const theme = THEMES[themeName];
    if (!theme) return;
    for (const [variable, value] of Object.entries(theme.colors)) {
        document.documentElement.style.setProperty(variable, value);
    }
    document.getElementById('custom-color-picker').value = theme.colors['--primary-color'];
};

const applyCustomColor = (color) => {
    document.documentElement.style.setProperty('--primary-color', color);
};

const applyDarkMode = (isDark) => {
    document.body.classList.toggle('dark-theme', isDark);
};

const loadAndApplyTheme = () => {
    const savedDarkMode = localStorage.getItem('momentum-dark-mode') === 'true';
    const savedTheme = localStorage.getItem('momentum-theme') || 'default';
    const savedCustomColor = localStorage.getItem('momentum-custom-color');
    
    applyDarkMode(savedDarkMode);
    document.getElementById('dark-mode-toggle').checked = savedDarkMode;
    
    if (savedTheme === 'custom' && savedCustomColor) {
        applyCustomColor(savedCustomColor);
        document.getElementById('custom-color-picker').value = savedCustomColor;
    } else {
        applyTheme(savedTheme);
    }
};

function initializeThemeManagerModule() {
    if (themeManagerModuleInitialized) return;

    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const themePickerContainer = document.getElementById('theme-picker-container');
    const customColorPicker = document.getElementById('custom-color-picker');

    Object.entries(THEMES).forEach(([key, theme]) => {
        const card = document.createElement('div');
        card.className = 'theme-preview-card';
        card.dataset.theme = key;
        card.innerHTML = `
            <h4>${theme.name}</h4>
            <div class="theme-color-swatches">
                <div class="theme-color-swatch" style="background-color: ${theme.colors['--primary-color']};"></div>
            </div>
        `;
        themePickerContainer.appendChild(card);
    });

    darkModeToggle.addEventListener('change', (e) => {
        const isDark = e.target.checked;
        applyDarkMode(isDark);
        localStorage.setItem('momentum-dark-mode', isDark);
        mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' });
    });

    themePickerContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.theme-preview-card');
        if (!card) return;
        
        const themeName = card.dataset.theme;
        applyTheme(themeName);
        localStorage.setItem('momentum-theme', themeName);
        localStorage.removeItem('momentum-custom-color');

        document.querySelectorAll('.theme-preview-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
    });

    customColorPicker.addEventListener('input', (e) => {
        const color = e.target.value;
        applyCustomColor(color);
        localStorage.setItem('momentum-theme', 'custom');
        localStorage.setItem('momentum-custom-color', color);
        document.querySelectorAll('.theme-preview-card').forEach(c => c.classList.remove('active'));
    });
    
    themeManagerModuleInitialized = true;
}

// --- End of theme_manager.js ---