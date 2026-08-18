document.addEventListener('DOMContentLoaded', () => {
    // Fetch Initial Summary for the sidebar
    fetchSummary();

    // Determine which page we are on and load specific data
    const page = document.body.dataset.page;
    
    if (page === 'dashboard') {
        fetchDetailedAnalytics();
        renderGraph();
    } else if (page === 'fraud-rings') {
        fetchFraudRings();
    } else if (page === 'shared-devices') {
        fetchSharedDevices();
    }
});

async function fetchDetailedAnalytics() {
    try {
        const response = await fetch('/api/analytics');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // Formatter for currency
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        });

        // Update basic metrics
        document.getElementById('analytics-volume').textContent = formatter.format(data.totalVolume);
        document.getElementById('analytics-tx-count').textContent = `${data.totalTransactions} Total Transactions`;
        document.getElementById('analytics-devices').textContent = data.suspiciousDevices;

        // Populate top accounts list
        const accountsContainer = document.getElementById('analytics-top-accounts');
        accountsContainer.innerHTML = '';
        
        data.topAccounts.forEach(account => {
            const el = document.createElement('div');
            el.style.display = 'flex';
            el.style.justifyContent = 'space-between';
            el.style.alignItems = 'center';
            el.style.padding = '12px';
            el.style.background = '#f8fafc';
            el.style.border = '1px solid #e2e8f0';
            el.style.borderRadius = '8px';
            el.style.borderLeft = '3px solid var(--danger)';
            
            el.innerHTML = `
                <div>
                    <div style="font-weight: 600;">${account.name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">Account: ${account.id}</div>
                </div>
                <div style="text-align: right;">
                    <div style="color: var(--danger); font-weight: 600;">${formatter.format(account.volume)}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${account.count} Outbound Transfers</div>
                </div>
            `;
            accountsContainer.appendChild(el);
        });

    } catch (error) {
        console.error('Error fetching detailed analytics:', error);
        document.getElementById('analytics-top-accounts').innerHTML = '<div style="color: var(--danger); padding: 1rem;">Failed to load analytics data. Ensure backend is running.</div>';
    }
}

async function renderGraph() {
    const container = document.getElementById('graph-container');
    if (!container) return;

    try {
        const response = await fetch('/api/graph');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Vis.js requires a completely empty container to mount its canvas
        container.innerHTML = '';
        container.style.display = 'block';

        const nodes = new vis.DataSet(data.nodes.map(n => {
            let label = n.labels[0] || 'Unknown';
            let title = '';
            let color = { background: '#cbd5e1', border: '#94a3b8' };

            if (n.labels.includes('Person')) {
                label = n.properties.name || 'Person';
                color = { background: '#93c5fd', border: '#2563eb', highlight: { background: '#60a5fa', border: '#1d4ed8' } };
                title = `👤 Person: ${n.properties.name}`;
            } else if (n.labels.includes('BankAccount')) {
                label = n.properties.id || 'Account';
                color = { background: '#86efac', border: '#059669', highlight: { background: '#4ade80', border: '#047857' } };
                title = `🏦 Account ID: ${n.properties.id}`;
            } else if (n.labels.includes('Device')) {
                label = n.properties.id || 'Device';
                color = { background: '#fca5a5', border: '#dc2626', highlight: { background: '#f87171', border: '#b91c1c' } };
                title = `📱 Device ID: ${n.properties.id}`;
            }

            return {
                id: n.id,
                label: label,
                title: title,
                color: color,
                shape: 'dot',
                size: 18,
                font: { size: 13, face: 'Outfit', color: '#1e293b', bold: { color: '#0f172a' } },
                borderWidth: 2,
                shadow: { enabled: true, color: 'rgba(0,0,0,0.08)', size: 6 }
            };
        }));

        const edges = new vis.DataSet(data.edges.map(e => {
            let label = e.type.replace(/_/g, ' ');
            let color = '#94a3b8';
            let width = 2;
            if (e.type === 'TRANSFERS_TO') {
                label = `$${e.properties.amount || 0}`;
                color = '#f59e0b';
                width = 3;
            } else if (e.type === 'OWNS') {
                color = '#2563eb';
                width = 1.5;
            } else if (e.type === 'USES') {
                color = '#dc2626';
                width = 1.5;
            }
            return {
                id: e.id,
                from: e.source,
                to: e.target,
                label: label,
                color: { color: color, highlight: '#1d4ed8', hover: '#3b82f6' },
                arrows: { to: { enabled: true, scaleFactor: 0.8 } },
                font: { size: 11, align: 'middle', color: '#475569', strokeWidth: 3, strokeColor: '#ffffff' },
                width: width,
                smooth: { type: 'curvedCW', roundness: 0.15 }
            };
        }));

        const options = {
            physics: {
                enabled: true,
                stabilization: { iterations: 150 },
                barnesHut: {
                    gravitationalConstant: -3500,
                    springConstant: 0.04,
                    springLength: 120,
                    damping: 0.15
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 150,
                zoomView: true,
                dragNodes: true,
                navigationButtons: true
            },
            layout: {
                improvedLayout: true
            }
        };

        new vis.Network(container, { nodes, edges }, options);
    } catch (error) {
        console.error('Error fetching graph data:', error);
        container.innerHTML = '<div class="empty-state" style="color: var(--danger)">Failed to load interactive graph. Check backend connection.</div>';
    }
}

async function fetchSummary() {
    try {
        const response = await fetch('/api/summary');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        document.getElementById('node-count').textContent = data.nodes;
        document.getElementById('rel-count').textContent = data.relationships;
    } catch (error) {
        console.error('Error fetching summary:', error);
        document.querySelector('.status-indicator').classList.remove('online');
        document.querySelector('.status-indicator').style.color = '#ef4444';
        document.querySelector('.status-indicator .dot').style.background = '#ef4444';
        document.querySelector('.status-indicator').innerHTML = '<span class="dot" style="background: #ef4444; box-shadow: 0 0 8px #ef4444;"></span> Database Offline';
    }
}

async function fetchFraudRings() {
    const container = document.getElementById('fraud-rings-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-state">Analyzing graph data...</div>';

    try {
        const response = await fetch('/api/fraud-rings');
        if (!response.ok) throw new Error('Network response was not ok');
        const rings = await response.json();
        
        if (rings.length === 0) {
            container.innerHTML = '<div class="empty-state">No fraud rings detected in the current data.</div>';
            return;
        }

        container.innerHTML = '';
        rings.forEach((ringData) => {
            const card = document.createElement('div');
            card.className = 'data-card';
            
            const title = document.createElement('div');
            title.className = 'card-title';
            title.innerHTML = `Fraud Ring Detected <span style="color: var(--text-secondary); font-weight: normal; font-size: 0.9rem; margin-left: 8px;">(Cycle Length: ${ringData.length})</span>`;
            card.appendChild(title);

            const pathContainer = document.createElement('div');
            pathContainer.className = 'ring-path';

            for (let i = 0; i < ringData.length; i++) {
                const current = ringData.path[i];
                const next = ringData.path[(i + 1) % ringData.length];
                const amount = ringData.amounts[i];
                
                const step = document.createElement('div');
                step.className = 'path-step';
                step.innerHTML = `
                    <span>Account <strong>${current}</strong></span>
                    <span class="path-arrow">→</span>
                    <span class="transfer-amount">$${amount}</span>
                    <span class="path-arrow">→</span>
                    <span>Account <strong>${next}</strong></span>
                `;
                pathContainer.appendChild(step);
            }

            card.appendChild(pathContainer);
            container.appendChild(card);
        });

    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color: var(--danger)">Error loading data. Check backend connection.</div>';
    }
}

async function fetchSharedDevices() {
    const container = document.getElementById('shared-devices-container');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">Analyzing graph data...</div>';

    try {
        const response = await fetch('/api/shared-devices');
        if (!response.ok) throw new Error('Network response was not ok');
        const devices = await response.json();
        
        if (devices.length === 0) {
            container.innerHTML = '<div class="empty-state">No suspicious shared devices found.</div>';
            return;
        }

        container.innerHTML = '';
        devices.forEach(device => {
            const card = document.createElement('div');
            card.className = 'data-card';
            card.style.borderColor = 'rgba(245, 158, 11, 0.3)'; // Warning color
            
            const title = document.createElement('div');
            title.className = 'card-title';
            title.style.color = '#f59e0b';
            title.innerHTML = `<span style="background: #f59e0b; width: 10px; height: 10px; border-radius: 50%; display: inline-block; box-shadow: 0 0 8px #f59e0b;"></span> Shared Device: ${device.deviceId}`;
            card.appendChild(title);

            const details = document.createElement('div');
            details.innerHTML = `
                <div style="margin-bottom: 8px; font-size: 1.05rem;">
                    <strong>${device.person1}</strong> <span style="color: var(--text-secondary)">(Acct: ${device.account1})</span>
                </div>
                <div style="color: var(--text-secondary); margin: 4px 0; font-size: 0.9rem;">linked to</div>
                <div style="font-size: 1.05rem;">
                    <strong>${device.person2}</strong> <span style="color: var(--text-secondary)">(Acct: ${device.account2})</span>
                </div>
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
                    Both distinct users logged in from this same device. This indicates potential account takeover, synthetic identity fraud, or coordinated fraudulent activity.
                </div>
            `;
            
            card.appendChild(details);
            container.appendChild(card);
        });

    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color: var(--danger)">Error loading data. Check backend connection.</div>';
    }
}
