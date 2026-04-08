import React, { useState, useEffect } from "react";
import { useMsal, AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

function App() {
    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
            <h1>Azure DevOps Pipeline Generator</h1>
            <UnauthenticatedTemplate>
                <p>Please sign in to manage pipelines.</p>
                <button onClick={() => window.location.reload()}>Login</button>
            </UnauthenticatedTemplate>
            <AuthenticatedTemplate>
                <PipelineWizard />
            </AuthenticatedTemplate>
        </div>
    );
}

const PipelineWizard = () => {
    const { instance, accounts } = useMsal();
    const [step, setStep] = useState(1);
    const [repos, setRepos] = useState([]);
    const [branches, setBranches] = useState([]);
    const [status, setStatus] = useState("");
    const [formData, setFormData] = useState({ 
        repoId: '', repoName: '', branch: '', yamlPath: '/azure-pipelines.yml', name: '' 
    });

    // Step 1: Load Repos
    useEffect(() => {
        const fetchRepos = async () => {
            const token = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
            const res = await fetch("/api/repos", { headers: { Authorization: `Bearer ${token.accessToken}` } });
            const data = await res.json();
            setRepos(data);
        };
        fetchRepos();
    }, [instance, accounts]);

    // Step 2: Select Repo & Load Branches
    const handleRepoSelect = async (repo) => {
        setFormData({ ...formData, repoId: repo.id, repoName: repo.name });
        const token = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
        const res = await fetch(`/api/repos/${repo.id}/branches`, { headers: { Authorization: `Bearer ${token.accessToken}` } });
        const data = await res.json();
        setBranches(data);
        setStep(2);
    };

    const finalCreateCall = async () => {
        setStatus("Creating...");
        const token = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
        const res = await fetch("/api/pipelines/create", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.accessToken}` },
            body: JSON.stringify({
                pipelineName: formData.name,
                repoId: formData.repoId,
                branch: formData.branch,
                yamlPath: formData.yamlPath
            })
        });
        if (res.ok) setStatus("✅ Success!"); else setStatus("❌ Failed.");
    };

    return (
        <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px" }}>
            {step === 1 && (
                <div>
                    <h3>1. Select Repository</h3>
                    {repos.map(r => (
                        <button key={r.id} onClick={() => handleRepoSelect(r)} style={{ display: "block", margin: "5px 0", padding: "10px" }}>
                            {r.name}
                        </button>
                    ))}
                </div>
            )}
            {step === 2 && (
                <div>
                    <h3>2. Select Branch & Path</h3>
                    <p>Repo: {formData.repoName}</p>
                    <select onChange={(e) => setFormData({...formData, branch: e.target.value})} style={{ padding: "8px", width: "100%" }}>
                        <option value="">-- Choose Branch --</option>
                        {branches.map(b => <option key={b.name} value={b.name}>{b.name.replace('refs/heads/', '')}</option>)}
                    </select>
                    <input style={{ marginTop: "10px", padding: "8px", width: "100%" }} value={formData.yamlPath} onChange={(e) => setFormData({...formData, yamlPath: e.target.value})} />
                    <button onClick={() => setStep(3)} style={{ marginTop: "10px" }}>Next</button>
                </div>
            )}
            {step === 3 && (
                <div>
                    <h3>3. Rename & Save</h3>
                    <input placeholder="New Pipeline Name" onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ padding: "8px", width: "100%" }} />
                    <button onClick={finalCreateCall} style={{ marginTop: "10px", background: "green", color: "white", padding: "10px" }}>Save & Run</button>
                </div>
            )}
            <p>{status}</p>
        </div>
    );
};

export default App; // <--- CRITICAL: Build fails if this is missing or renamed.