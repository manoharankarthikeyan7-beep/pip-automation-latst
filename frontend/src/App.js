import React, { useState, useEffect } from "react";
import { useMsal, AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

function App() {
  const { instance } = useMsal();

  const handleLogin = () => {
    console.log("Login button clicked..."); // This will now show in your F12 console
    instance.loginRedirect(loginRequest).catch((e) => {
      console.error("Login Error:", e);
    });
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Segoe UI" }}>
      <h1>Azure DevOps Pipeline Generator</h1>
      
      <UnauthenticatedTemplate>
        <p>Please sign in to manage pipelines.</p>
        {/* Added manual styling to make sure the button is clickable */}
        <button 
          onClick={handleLogin} 
          style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer", backgroundColor: "#0078d4", color: "white", border: "none", borderRadius: "4px" }}
        >
          Login
        </button>
      </UnauthenticatedTemplate>

      <AuthenticatedTemplate>
        <PipelineWizard />
      </AuthenticatedTemplate>
    </div>
  );
}

// Ensure PipelineWizard component is defined below this...
export default App;