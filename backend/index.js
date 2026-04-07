const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const path = require('path');
const axios = require('axios'); // Add this to your package.json
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. SECURITY SETUP (Keep your existing logic) ---
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

const validateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, getKey, {
    audience: `api://${process.env.AZURE_API_CLIENT_ID}`,
    issuer: `https://sts.windows.net/${process.env.AZURE_TENANT_ID}/`,
    algorithms: ['RS256']
  }, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded; 
    next();
  });
};

// --- 2. AZURE DEVOPS CONFIG ---
// Make sure these match your "Environment Variables" in the Azure Portal
const ADO_PAT = process.env.DEVOPS_PAT; 
const ADO_ORG = "YOUR_ORG_NAME";     // Add this to your Environment Variables too
const ADO_PROJECT = "YOUR_PROJECT";  // Add this to your Environment Variables too

const authHeader = `Basic ${Buffer.from(`:${ADO_PAT}`).toString('base64')}`;

// --- 3. THE ACTUAL CREATION ROUTE ---
app.post('/api/pipelines/create', validateToken, async (req, res) => {
    const { pipelineName, repoId, yamlPath } = req.body;

    console.log(`User ${req.user.upn} is creating pipeline: ${pipelineName}`);

    try {
        const response = await axios.post(
            `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis/pipelines?api-version=7.0`,
            {
                name: pipelineName,
                configuration: {
                    type: "yaml",
                    path: yamlPath || "/azure-pipelines.yml",
                    repository: {
                        id: repoId, // This is the GUID of your Repo
                        type: "azureReposGit"
                    }
                }
            },
            { 
                headers: { 
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                } 
            }
        );
        res.json({ message: 'Pipeline Created!', id: response.data.id });
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to create pipeline in Azure DevOps' });
    }
});

// --- 4. STATIC HOSTING ---
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Self-Service Portal live on ${PORT}`));