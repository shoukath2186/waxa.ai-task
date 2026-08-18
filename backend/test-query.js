const queries = require('./queries');
const driver = require('./db');

async function test() {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH path = (a:BankAccount)-[:TRANSFERS_TO]->()-[:TRANSFERS_TO]->()-[:TRANSFERS_TO]->(a)
            RETURN path
        `);
        console.log("Found:", result.records.length);
        
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await session.close();
        process.exit();
    }
}

test();
