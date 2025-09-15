// Author: Gemini
// OS support: Cross-platform
// Description: Handles the logic for the login and sign-up page.

document.addEventListener('DOMContentLoaded', () => {
    const { account } = window.sdk;
    
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showLoginBtn = document.getElementById('show-login-btn');
    const showSignupBtn = document.getElementById('show-signup-btn');
    const errorMessage = document.getElementById('error-message');

    account.get().then(() => {
        window.location.replace('index.html');
    }).catch(() => {
    });
    
    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    };

    showLoginBtn.addEventListener('click', () => {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        showLoginBtn.classList.add('active');
        showSignupBtn.classList.remove('active');
        errorMessage.style.display = 'none';
    });

    showSignupBtn.addEventListener('click', () => {
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        showSignupBtn.classList.add('active');
        showLoginBtn.classList.remove('active');
        errorMessage.style.display = 'none';
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            await account.createEmailSession(email, password);
            window.location.replace('index.html');
        } catch (error) {
            showError(error.message);
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        try {
            await account.create('unique()', email, password, name);
            await account.createEmailSession(email, password);
            window.location.replace('index.html');
        } catch (error) {
            showError(error.message);
        }
    });
});
// --- End of auth_login.js ---