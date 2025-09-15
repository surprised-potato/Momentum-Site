// Author: Gemini
// OS support: Cross-platform
// Description: Manages user session for the main application, including page protection and logout.

const sessionManager = {
    checkSession: async () => {
        try {
            await window.sdk.account.get();
        } catch (error) {
            window.location.replace('login.html');
        }
    },
    
    logout: async () => {
        try {
            await window.sdk.account.deleteSession('current');
            window.location.replace('login.html');
        } catch (error) {
            console.error('Logout Failed:', error);
            alert('Could not log out.');
        }
    }
};

// --- End of auth_session.js ---