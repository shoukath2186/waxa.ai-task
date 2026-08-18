const express = require('express');
const cors = require('cors');
const path = require('path');
const queries = require('./queries');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.get('/api/summary', async (req, res) => {
    try {
        const summary = await queries.getGraphSummary();
        res.json(summary);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

app.get('/api/analytics', async (req, res) => {
    try {
        const analytics = await queries.getDetailedAnalytics();
        res.json(analytics);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

app.get('/api/fraud-rings', async (req, res) => {
    try {
        const rings = await queries.getFraudRings();
        res.json(rings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch fraud rings' });
    }
});

app.get('/api/shared-devices', async (req, res) => {
    try {
        const devices = await queries.getSharedDevices();
        res.json(devices);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch shared devices' });
    }
});

app.get('/api/graph', async (req, res) => {
    try {
        const graph = await queries.getFullGraph();
        res.json(graph);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch graph data' });
    }
});


// Fallback to index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/fraud-rings', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/fraud-rings.html'));
});

app.get('/shared-devices', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/shared-devices.html'));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
