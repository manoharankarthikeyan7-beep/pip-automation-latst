import React, { useState, useEffect, useRef } from "react";
import { useMsal, AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

const PipelineWizard = () => {
    const { instance, accounts } = useMsal();
    const [step, setStep] = useState(1);
    const [status, setStatus] = useState("");
    const [repos, setRepos] = useState([]);
    const [branches, setBranches] = useState([]);
    const [yamlFiles, setYamlFiles] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [yamlContent, setYamlContent] = useState("");
    
    // Enhancement: Manual Path for Monorepos
    const [isManualPath, setIsManualPath] = useState(false);
    
    // Enhancement: Custom Name Logic
    const [isCustomName, setIsCustomName] = useState(false);
    const [nameError, setNameError] = useState("");

    const [formData, setFormData] = useState({ 
        repoId: '', repoName: '', branch: '', yamlPath: '', name: '' 
    });

    // Enhancement: 10-Minute Timeout Logic
    useEffect(() => {
        const timeoutLimit = 10 * 60 * 1000; // 10 minutes
        const timer = setTimeout(() => {
            alert("Session expired (10 mins). Please log in again.");
            instance.logoutRedirect();
        }, timeoutLimit);
        return () => clearTimeout(timer);
    }, [instance]);

    const styles = {
        card: { background: "#fff", padding: "30px", borderRadius: "8px", border: "1px solid #ddd", marginTop: "20px" },
        input: { width: "100%", padding: "10px", marginBottom: "15px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" },
        label: { display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "13px" },
        errorText: { color: "#d13438", fontSize: "12px", marginTop: "-10px", marginBottom: "10px" },
        toggleLink: { color: "#0078d4", cursor: "pointer", fontSize: "12px", textDecoration: "underline", marginBottom: "10px", display: "inline-block" },
        repoListWrapper: { border: "1px solid #eaeaea", borderRadius: "4px", marginTop: "10px", maxHeight: "300px", overflowY: "auto", width: "100%" },
        repoItem: { display: "flex", alignItems: "center", width: "100%", padding: "12px 16px", textAlign: "left", cursor: "pointer", border: "none", background: "#fff", borderBottom: "1px solid #f3f2f1", fontSize: "14px", boxSizing: "border-box" },
        primaryBtn: { padding: "10px 20px", background: "#0078d4", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" },
        backBtn: { marginTop: "20px", background: "none", border: "none", color: "#0078d4", cursor: "pointer", fontSize: "14px" }
    };

    // Name Validation Logic
    const validateName = (name) => {
        if (isCustomName) {
            setNameError("");
            return true;
        }
        if (name.length > 48) {
            setNameError("Pipeline name cannot exceed 48 characters.");
            return false;
        }
        const lowerName = name.toLowerCase();
        if (!lowerName.includes("k8s") && !lowerName.includes("deployment")) {
            setNameError("Standard name must include 'k8s' or 'deployment'. Use 'Custom' to skip.");
            return false;
        }
        setNameError("");
        return true;
    };

    const handleRepoSelect = async (repo) => {
        setFormData({ ...formData, repoId: repo.id, repoName: repo.name });
        try {
            const tokenResponse = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
            const res = await fetch(`/api/repos/${repo.id}/branches`, { headers: { "Authorization": `Bearer ${tokenResponse.accessToken}` } });
            const data = await res.json();
            setBranches(data || []);
            setStep(2);
        } catch (err) { console.error(err); }
    };

    const handleBranchChange = async (branchName) => {
        setFormData({ ...formData, branch: branchName, yamlPath: '' });
        if (!branchName) return;
        try {
            const tokenResponse = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
            const res = await fetch(`/api/repos/${formData.repoId}/yaml-files?branch=${branchName}`, {
                headers: { "Authorization": `Bearer ${tokenResponse.accessToken}` }
            });
            const data = await res.json();
            setYamlFiles(data || []);
        } catch (err) { console.error(err); }
    };

    return (
        <div style={styles.card}>
            {status && <p style={{ color: "#0078d4" }}><b>{status}</b></p>}

            {step === 1 && (
                <div>
                    <h2>1. Select Repository</h2>
                    <input type="text" placeholder="Filter..." style={styles.input} onChange={(e) => setSearchTerm(e.target.value.toLowerCase())} />
                    <div style={styles.repoListWrapper}>
                        {repos.filter(r => r.name.toLowerCase().includes(searchTerm)).map(r => (
                            <button key={r.id} onClick={() => handleRepoSelect(r)} style={styles.repoItem}>{r.name}</button>
                        ))}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div>
                    <h2>2. Configure Path</h2>
                    <p>Repo: <b>{formData.repoName}</b></p>
                    <label style={styles.label}>Branch</label>
                    <select style={styles.input} value={formData.branch} onChange={(e) => handleBranchChange(e.target.value)}>
                        <option value="">-- Select Branch --</option>
                        {branches.map(b => <option key={b.name} value={b.name}>{b.name.replace('refs/heads/', '')}</option>)}
                    </select>

                    <label style={styles.label}>YAML File Location</label>
                    <span style={styles.toggleLink} onClick={() => setIsManualPath(!isManualPath)}>
                        {isManualPath ? "Switch to List View" : "Enter Path Manually (Monorepo)"}
                    </span>

                    {isManualPath ? (
                        <input 
                            style={styles.input} 
                            placeholder="/folder/subfolder/azure-pipelines.yml" 
                            value={formData.yamlPath}
                            onChange={(e) => setFormData({...formData, yamlPath: e.target.value})}
                        />
                    ) : (
                        <select style={styles.input} value={formData.yamlPath} onChange={(e) => setFormData({...formData, yamlPath: e.target.value})}>
                            <option value="">-- Select File --</option>
                            {yamlFiles.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    )}

                    <button onClick={() => setStep(3)} style={styles.primaryBtn} disabled={!formData.yamlPath}>Review</button>
                    <button onClick={() => setStep(1)} style={styles.backBtn}>Back</button>
                </div>
            )}

            {step === 3 && (
                <div>
                    <h2>3. Finalize Name</h2>
                    
                    <label style={styles.label}>Pipeline Name</label>
                    <span style={styles.toggleLink} onClick={() => { setIsCustomName(!isCustomName); setNameError(""); }}>
                        {isCustomName ? "Switch to Standard Validation" : "Use Custom Name (No Restriction)"}
                    </span>
                    
                    <input 
                        style={styles.input} 
                        value={formData.name} 
                        placeholder={isCustomName ? "Enter any name" : "e.g. k8s-deployment-webapp"}
                        onChange={(e) => {
                            setFormData({...formData, name: e.target.value});
                            validateName(e.target.value);
                        }} 
                    />
                    {nameError && <p style={styles.errorText}>{nameError}</p>}

                    <button 
                        onClick={() => alert("Saving...")} 
                        style={styles.primaryBtn} 
                        disabled={!!nameError || !formData.name}
                    >
                        Save Pipeline
                    </button>
                    <button onClick={() => setStep(2)} style={styles.backBtn}>Back</button>
                </div>
            )}
        </div>
    );
};

// ... Unchanged App Component below