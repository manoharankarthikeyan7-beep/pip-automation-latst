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

// Helpers for Headers
const getAdoHeader = () => {
    const pat = process.env.DEVOPS_PAT;
    return pat ? `Basic ${Buffer.from(`:${pat}`).toString('base64')}` : null;
};

const getGitHubHeader = () => {
    return process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : null;
};

// --- AUTHENTICATION ---
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
    req.user = decoded;
    next();
  });
};

// --- API ROUTES (Defined BEFORE Static Files) ---

app.get('/api/repos', validateToken, async (req, res) => {
    try {
        const response = await axios.get(
            `https://dev.azure.com/${process.env.ADO_ORG_NAME}/${process.env.ADO_PROJECT_NAME}/_apis/git/repositories?api-version=7.1`,
            { headers: { 'Authorization': getAdoHeader() } }
        );
        res.json(response.data.value.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) { res.status(502).json({ error: "ADO Unreachable" }); }
});

app.get('/api/github/repos', validateToken, async (req, res) => {
    const ghToken = getGitHubHeader();
    try {
        const response = await axios.get('https://api.github.com/user/repos?per_page=100', {
            headers: { 'Authorization': ghToken, 'Accept': 'application/vnd.github.v3+json' }
        });
        res.json(response.data.map(r => ({ id: r.full_name, name: r.full_name })));
    } catch (e) { res.status(502).json({ error: "GitHub Unreachable" }); }
});

// Add other /api routes here...

// --- SERVE REACT FRONTEND ---
// Ensure your React 'build' folder is named 'build' or 'public'
const buildPath = path.join(__dirname, 'build'); 
app.use(express.static(buildPath));

app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));