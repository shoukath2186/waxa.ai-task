const driver = require('./db');

const seedData = async () => {
    const session = driver.session();
    try {
        console.log('Clearing existing data...');
        await session.run(`MATCH (n) DETACH DELETE n`);

        console.log('Creating Nodes and Relationships...');
        // Create Devices
        await session.run(`
            CREATE (d1:Device {id: 'dev-001', type: 'mobile', os: 'iOS'})
            CREATE (d2:Device {id: 'dev-002', type: 'desktop', os: 'Windows'})
            CREATE (d3:Device {id: 'dev-003', type: 'mobile', os: 'Android'})
        `);

        // Create People and Accounts, and link them to Devices
        await session.run(`
            MATCH (d1:Device {id: 'dev-001'}), (d2:Device {id: 'dev-002'}), (d3:Device {id: 'dev-003'})
            
            // Normal User 1
            CREATE (p1:Person {id: 'p-001', name: 'Alice Smith'})-[:OWNS]->(a1:BankAccount {id: 'acc-001', balance: 5000})
            CREATE (p1)-[:USES]->(d1)
            
            // Normal User 2
            CREATE (p2:Person {id: 'p-002', name: 'Bob Jones'})-[:OWNS]->(a2:BankAccount {id: 'acc-002', balance: 3000})
            CREATE (p2)-[:USES]->(d2)

            // Normal transaction
            CREATE (a1)-[:TRANSFERS_TO {amount: 200, date: '2023-10-01'}]->(a2)
            
            // --- Fraud Ring 1 (Cyclic Transfers) ---
            CREATE (f1:Person {id: 'f-001', name: 'Charlie (Fraud)'})-[:OWNS]->(fa1:BankAccount {id: 'facc-001', balance: 100})
            CREATE (f2:Person {id: 'f-002', name: 'Dave (Fraud)'})-[:OWNS]->(fa2:BankAccount {id: 'facc-002', balance: 100})
            CREATE (f3:Person {id: 'f-003', name: 'Eve (Fraud)'})-[:OWNS]->(fa3:BankAccount {id: 'facc-003', balance: 100})
            
            // They all share the same device (Suspicious!)
            CREATE (f1)-[:USES]->(d3)
            CREATE (f2)-[:USES]->(d3)
            CREATE (f3)-[:USES]->(d3)

            // Cyclic transfers to launder money
            CREATE (fa1)-[:TRANSFERS_TO {amount: 5000, date: '2023-10-02'}]->(fa2)
            CREATE (fa2)-[:TRANSFERS_TO {amount: 4900, date: '2023-10-03'}]->(fa3)
            CREATE (fa3)-[:TRANSFERS_TO {amount: 4800, date: '2023-10-04'}]->(fa1) // Closes the ring
            
            // --- Fraud Ring 2 (Longer Cycle) ---
            CREATE (l1:Person {id: 'l-001', name: 'Frank'})-[:OWNS]->(la1:BankAccount {id: 'lacc-001'})
            CREATE (l2:Person {id: 'l-002', name: 'Grace'})-[:OWNS]->(la2:BankAccount {id: 'lacc-002'})
            CREATE (l3:Person {id: 'l-003', name: 'Heidi'})-[:OWNS]->(la3:BankAccount {id: 'lacc-003'})
            CREATE (l4:Person {id: 'l-004', name: 'Ivan'})-[:OWNS]->(la4:BankAccount {id: 'lacc-004'})
            CREATE (l1)-[:USES]->(d1)
            
            CREATE (la1)-[:TRANSFERS_TO {amount: 1000, date: '2023-10-05'}]->(la2)
            CREATE (la2)-[:TRANSFERS_TO {amount: 1000, date: '2023-10-06'}]->(la3)
            CREATE (la3)-[:TRANSFERS_TO {amount: 1000, date: '2023-10-07'}]->(la4)
            CREATE (la4)-[:TRANSFERS_TO {amount: 1000, date: '2023-10-08'}]->(la1)
        `);

        console.log('Seed completed successfully!');
    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await session.close();
        await driver.close();
    }
};

seedData();
