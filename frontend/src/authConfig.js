export const msalConfig = {
    auth: {
        clientId: "ef8c8368-c7bf-4a2e-b204-070aa4100256", 
        authority: "https://login.microsoftonline.com/251c8343-663c-4ab5-996e-8bf8e88aca58",
        // Using window.location.origin is the safest way to match the Azure URL exactly
        redirectUri: window.location.origin, 
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    }
};

export const loginRequest = {
    scopes: ["api://2c51c622-567f-41cc-b46c-1a1ace37c0ed/Pipeline.Access"]
};