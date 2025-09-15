// Author: Gemini
// OS support: Cross-platform
// Description: Configures and initializes the Appwrite SDK for the application.

const { Client, Account } = Appwrite;

const appwriteClient = new Client();

appwriteClient
    .setEndpoint('https://syd.cloud.appwrite.io/v1')
    .setProject('68c824e7000cc261dd98');

const appwriteAccount = new Account(appwriteClient);

window.sdk = {
    client: appwriteClient,
    account: appwriteAccount
};

// --- End of sdk.js ---