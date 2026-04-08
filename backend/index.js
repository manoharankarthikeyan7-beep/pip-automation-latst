const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const getAdoHeader = () => {
    const pat = process.env.DEVOPS_PAT;
    return pat ? `Basic ${Buffer.from(`:${pat}`).toString('base64')}` : null;
};

// --- STEP 1: IDENTITY HANDSHAKE (HARDENED) ---
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

const validateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Unauthorized');

  jwt.verify(token, getKey, {
    audience: `api://${process.env.AZURE_API_CLIENT_ID}`,
    issuer: `https://sts.windows.net/${process.env.AZURE_TENANT_ID}/`,
    algorithms: ['RS256']
  }, (err, decoded) => {
    if (err) return res.status(403).send('Invalid Token');
    
    // SECURITY UPGRADE: Verify this token belongs to your specific company tenant
    if (decoded.tid !== process.env.AZURE_TENANT_ID) {
        console.error("Tenant ID Mismatch!");
        return res.status(403).send('Unauthorized: Tenant Mismatch');
    }

    req.user = decoded;
    next();
  });
};

// --- STEP 2: DYNAMIC RESOURCE DISCOVERY (OPTIMIZED) ---
app.get('/api/repos', validateToken, async (req, res) => {
    try {
        const response = await axios.get(
            `https://dev.azure.com/${process.env.ADO_ORG_NAME}/${process.env.ADO_PROJECT_NAME}/_apis/git/repositories?api-version=7.1`,
            { 
                headers: { 'Authorization': getAdoHeader() },
                timeout: 10000 // 10s timeout to prevent hanging
            }
        );
        
        // Sorting alphabetically for a better user experience
        const sortedRepos = response.data.value.sort((a, b) => a.name.localeCompare(b.name));
        res.json(sortedRepos);
    } catch (e) {
        console.error("Discovery Error:", e.message);
        res.status(502).json({ error: "Failed to fetch repos from Azure DevOps" });
    }
});

// (Keep your existing /api/repos/:repoId/branches and /api/pipelines/create routes below this)
// ... [Existing Routes] ...

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Server online on port ${PORT}`));