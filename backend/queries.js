const driver = require('./db');

const getGraphSummary = async () => {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (n)
      RETURN count(n) as nodeCount
    `);
    
    const relResult = await session.run(`
      MATCH ()-[r]->()
      RETURN count(r) as relCount
    `);
    
    return {
      nodes: result.records[0].get('nodeCount').toNumber(),
      relationships: relResult.records[0].get('relCount').toNumber()
    };
  } finally {
    await session.close();
  }
};

const getFraudRings = async () => {
    const session = driver.session();
    try {
        // Find cycles of transfers between BankAccounts
        // We use explicit length paths to ensure compatibility with all graph database engines
        // (some engines restrict variable-length cyclic paths like *3..5)
        const result = await session.run(`
            MATCH path = (a:BankAccount)-[:TRANSFERS_TO]->()-[:TRANSFERS_TO]->()-[:TRANSFERS_TO]->(a)
            RETURN [n in nodes(path) | n.id] AS ring, 
                   [r in relationships(path) | r.amount] AS amounts
            UNION
            MATCH path = (a:BankAccount)-[:TRANSFERS_TO]->()-[:TRANSFERS_TO]->()-[:TRANSFERS_TO]->()-[:TRANSFERS_TO]->(a)
            RETURN [n in nodes(path) | n.id] AS ring, 
                   [r in relationships(path) | r.amount] AS amounts
        `);

        // We use a Set to filter out permutations of the same ring
        const uniqueRings = new Map();
        
        result.records.forEach(record => {
            const ring = record.get('ring');
            const amounts = record.get('amounts');
            
            // Create a sorted string of the node IDs to use as a unique key for the cycle
            // Ignore the last node since it's the same as the first in a cycle
            const cycleNodes = ring.slice(0, -1);
            const sortedKey = [...cycleNodes].sort().join('-');
            
            if (!uniqueRings.has(sortedKey)) {
                uniqueRings.set(sortedKey, {
                    path: ring,
                    amounts: amounts,
                    length: cycleNodes.length
                });
            }
        });
        
        return Array.from(uniqueRings.values());
    } finally {
        await session.close();
    }
};

const getDetailedAnalytics = async () => {
    const session = driver.session();
    try {
        const volumeResult = await session.run(`
            MATCH ()-[r:TRANSFERS_TO]->()
            RETURN sum(r.amount) as totalVolume, count(r) as totalTransactions
        `);
        
        const activeAccountsResult = await session.run(`
            MATCH (p:Person)-[:OWNS]->(a:BankAccount)-[r:TRANSFERS_TO]->()
            RETURN p.name as ownerName, a.id as accountId, count(r) as outboundCount, sum(r.amount) as outboundVolume
            ORDER BY outboundVolume DESC
            LIMIT 3
        `);

        const suspiciousDevicesResult = await session.run(`
            MATCH (p:Person)-[:USES]->(d:Device)
            WITH d, count(p) as userCount
            WHERE userCount > 1
            RETURN count(d) as suspiciousCount
        `);

        return {
            totalVolume: volumeResult.records[0].get('totalVolume').toNumber(),
            totalTransactions: volumeResult.records[0].get('totalTransactions').toNumber(),
            suspiciousDevices: suspiciousDevicesResult.records[0].get('suspiciousCount').toNumber(),
            topAccounts: activeAccountsResult.records.map(record => ({
                name: record.get('ownerName'),
                id: record.get('accountId'),
                count: record.get('outboundCount').toNumber(),
                volume: record.get('outboundVolume').toNumber()
            }))
        };
    } finally {
        await session.close();
    }
};

const getSharedDevices = async () => {
    const session = driver.session();
    try {
        // Multi-hop: Find devices used by multiple people who also own bank accounts
        const result = await session.run(`
            MATCH (p1:Person)-[:USES]->(d:Device)<-[:USES]-(p2:Person)
            WHERE id(p1) < id(p2)
            MATCH (p1)-[:OWNS]->(a1:BankAccount)
            MATCH (p2)-[:OWNS]->(a2:BankAccount)
            RETURN p1.name as person1, a1.id as account1, p2.name as person2, a2.id as account2, d.id as deviceId
        `);
        
        return result.records.map(record => ({
            person1: record.get('person1'),
            account1: record.get('account1'),
            person2: record.get('person2'),
            account2: record.get('account2'),
            deviceId: record.get('deviceId')
        }));
    } finally {
        await session.close();
    }
}

const getFullGraph = async () => {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (n)
            OPTIONAL MATCH (n)-[r]->(m)
            RETURN n, r, m
        `);
        
        const nodes = new Map();
        const edges = [];
        
        result.records.forEach(record => {
            const n = record.get('n');
            const r = record.get('r');
            const m = record.get('m');
            
            if (n && !nodes.has(n.identity.toNumber())) {
                nodes.set(n.identity.toNumber(), { id: n.identity.toNumber(), labels: n.labels, properties: n.properties });
            }
            if (m && !nodes.has(m.identity.toNumber())) {
                nodes.set(m.identity.toNumber(), { id: m.identity.toNumber(), labels: m.labels, properties: m.properties });
            }
            if (r) {
                edges.push({
                    id: r.identity.toNumber(),
                    source: r.start.toNumber(),
                    target: r.end.toNumber(),
                    type: r.type,
                    properties: r.properties
                });
            }
        });
        
        return {
            nodes: Array.from(nodes.values()),
            edges
        };
    } finally {
        await session.close();
    }
}

// Example of parameterized query
const getAccountDetails = async (accountId) => {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (a:BankAccount {id: $accountId})<-[:OWNS]-(p:Person)
            RETURN a, p
        `, { accountId: accountId });
        
        if (result.records.length === 0) return null;
        
        const record = result.records[0];
        return {
            account: record.get('a').properties,
            owner: record.get('p').properties
        };
    } finally {
        await session.close();
    }
}

module.exports = {
  getGraphSummary,
  getDetailedAnalytics,
  getFraudRings,
  getSharedDevices,
  getFullGraph,
  getAccountDetails
};
