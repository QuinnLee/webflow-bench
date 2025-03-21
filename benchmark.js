require("dotenv").config();
const { neon } = require("@neondatabase/serverless");
const { createClient } = require("@libsql/client");
const fs = require("fs");

// Get the number of records from command line argument, default to 100
const recordCount = parseInt(process.argv[2]) || 100;
console.log(`Running benchmark with ${recordCount} records...`);

// Initialize results object
const benchmarkResults = {
  timestamp: new Date().toISOString(),
  configuration: {
    recordCount: recordCount,
  },
  coldStart: {},
  writeTest: {},
  readTest: {
    simpleQuery: {},
    filterQuery: {},
  },
};

// Database clients
const sql = neon(process.env.NEON_DATABASE_URL);
const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Sample data generator
function generateSampleData(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Task ${i + 1}`,
    description: `This is a sample task description for task ${i + 1}`,
    created_at: new Date().toISOString(),
  }));
}

// Write results to file
function saveResults() {
  const fileName = `benchmark-results-${recordCount}-rows-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(fileName, JSON.stringify(benchmarkResults, null, 2));
  console.log(`\nResults saved to ${fileName}`);
}

// Benchmark utilities
async function measureTime(fn) {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
}

// Database setup
async function setupDatabases() {
  // Clean up existing tables first
  try {
    await sql`DROP TABLE IF EXISTS neon_tasks`;
    await tursoClient.execute("DROP TABLE IF EXISTS turso_tasks");
  } catch (error) {
    console.log("Tables did not exist, proceeding with creation...");
  }

  // Neon setup
  await sql`
    CREATE TABLE IF NOT EXISTS neon_tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Turso setup
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS turso_tasks (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT
    )
  `);
}

// Write test
async function runWriteTest(data) {
  console.log(`\n=== Write Test (${data.length} rows) ===`);

  // Neon write test
  const neonTime = await measureTime(async () => {
    for (const item of data) {
      await sql`
        INSERT INTO neon_tasks (title, description, created_at) 
        VALUES (${item.title}, ${item.description}, ${item.created_at})
      `;
    }
  });
  console.log(`Neon Write Time: ${neonTime.toFixed(2)}ms`);

  // Turso write test
  const tursoTime = await measureTime(async () => {
    for (const item of data) {
      await tursoClient.execute({
        sql: "INSERT INTO turso_tasks (title, description, created_at) VALUES (?, ?, ?)",
        args: [item.title, item.description, item.created_at],
      });
    }
  });
  console.log(`Turso Write Time: ${tursoTime.toFixed(2)}ms`);

  // Save results
  benchmarkResults.writeTest = {
    neon: neonTime,
    turso: tursoTime,
    rowCount: data.length,
    neonAvgPerRow: neonTime / data.length,
    tursoAvgPerRow: tursoTime / data.length,
  };
}

// Read test
async function runReadTest() {
  console.log("\n=== Read Test ===");

  // Simple query test
  console.log("\nSimple Query (SELECT * LIMIT 100):");
  const neonQueryTime = await measureTime(async () => {
    await sql`SELECT * FROM neon_tasks LIMIT 100`;
  });
  console.log(`Neon Query Time: ${neonQueryTime.toFixed(2)}ms`);

  const tursoQueryTime = await measureTime(async () => {
    await tursoClient.execute("SELECT * FROM turso_tasks LIMIT 100");
  });
  console.log(`Turso Query Time: ${tursoQueryTime.toFixed(2)}ms`);

  // Filter test
  console.log("\nFilter Query (WHERE title LIKE):");
  const neonFilterTime = await measureTime(async () => {
    await sql`SELECT * FROM neon_tasks WHERE title LIKE ${"%Task 1%"}`;
  });
  console.log(`Neon Filter Time: ${neonFilterTime.toFixed(2)}ms`);

  const tursoFilterTime = await measureTime(async () => {
    await tursoClient.execute(
      "SELECT * FROM turso_tasks WHERE title LIKE '%Task 1%'"
    );
  });
  console.log(`Turso Filter Time: ${tursoFilterTime.toFixed(2)}ms`);

  // Save results
  benchmarkResults.readTest = {
    simpleQuery: {
      neon: neonQueryTime,
      turso: tursoQueryTime,
    },
    filterQuery: {
      neon: neonFilterTime,
      turso: tursoFilterTime,
    },
  };
}

// Cold start test
async function runColdStartTest() {
  console.log("\n=== Cold Start Test ===");

  // Neon cold start
  const neonColdStart = await measureTime(async () => {
    const tempSql = neon(process.env.NEON_DATABASE_URL);
    await tempSql`SELECT 1`;
  });
  console.log(`Neon Cold Start Time: ${neonColdStart.toFixed(2)}ms`);

  // Turso cold start
  const tursoColdStart = await measureTime(async () => {
    const tempTursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    await tempTursoClient.execute("SELECT 1");
  });
  console.log(`Turso Cold Start Time: ${tursoColdStart.toFixed(2)}ms`);

  // Save results
  benchmarkResults.coldStart = {
    neon: neonColdStart,
    turso: tursoColdStart,
  };
}

// Main benchmark function
async function runBenchmarks() {
  try {
    console.log("Setting up databases...");
    await setupDatabases();

    const sampleData = generateSampleData(recordCount);

    // Run tests
    await runColdStartTest();
    await runWriteTest(sampleData);
    await runReadTest();

    // Save all results to file
    saveResults();

    console.log("\nBenchmark completed successfully!");
  } catch (error) {
    console.error("Error during benchmark:", error);
    // Save results even if there's an error
    saveResults();
  } finally {
    process.exit(0);
  }
}

runBenchmarks();
