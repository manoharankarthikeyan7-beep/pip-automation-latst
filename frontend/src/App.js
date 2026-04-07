const PipelineWizard = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ repoId: '', branch: '', yamlPath: '/azure-pipelines.yml', name: '' });
    const [options, setOptions] = useState({ repos: [], branches: [] });

    // Step 1: Load Repos
    useEffect(() => { 
        // Fetch /api/repos and setOptions({ ...options, repos: data }) 
    }, []);

    // Step 2: Load Branches when Repo changes
    const handleRepoSelect = async (id) => {
        setFormData({ ...formData, repoId: id });
        // Fetch /api/repos/${id}/branches and setOptions({ ...options, branches: data })
        setStep(2);
    };

    return (
        <div className="wizard">
            {step === 1 && (
                <div>
                    <h3>Select Repository</h3>
                    {options.repos.map(r => <button key={r.id} onClick={() => handleRepoSelect(r.id)}>{r.name}</button>)}
                </div>
            )}

            {step === 2 && (
                <div>
                    <h3>Select Branch & YAML Path</h3>
                    <select onChange={(e) => setFormData({...formData, branch: e.target.value})}>
                        {options.branches.map(b => <option value={b.name}>{b.name}</option>)}
                    </select>
                    <input placeholder="YAML Path" value={formData.yamlPath} onChange={(e) => setFormData({...formData, yamlPath: e.target.value})} />
                    <button onClick={() => setStep(3)}>Next</button>
                </div>
            )}

            {step === 3 && (
                <div>
                    <h3>Review & Rename</h3>
                    <input placeholder="Pipeline Name" onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    <p>Repo: {formData.repoId} | Branch: {formData.branch}</p>
                    <button onClick={finalCreateCall}>Save & Run</button>
                </div>
            )}
        </div>
    );
};