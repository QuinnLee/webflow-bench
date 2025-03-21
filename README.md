# Database Benchmark: Neon vs Turso

This project benchmarks the performance of Neon (Postgres) and Turso (SQLite) databases in a serverless environment. It measures write speed, read performance, and cold start latency.

## Benchmarks Performed

1. **Cold Start Test**

   - Measures initial connection time
   - Tests first query execution

2. **Write Test**

   - Inserts a configurable number of records
   - Measures total write time and average time per record
   - Default test uses 100 records, full test uses 10,000 records

3. **Read Test**
   - Simple Query: SELECT with LIMIT
   - Filter Query: WHERE with LIKE clause

## Setup Instructions

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up the databases**

   a. **Neon Database**

   - Sign up at [Neon](https://neon.tech)
   - Create a new project
   - Get your connection string from the dashboard

   b. **Turso Database**

   - Sign up at [Turso](https://turso.tech)
   - Create a new Group and database
   - Get the `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your database credentials:
   ```
   NEON_DATABASE_URL=your_neon_connection_string
   TURSO_DATABASE_URL=your_turso_database_url
   TURSO_AUTH_TOKEN=your_turso_auth_token
   ```

## Running the Benchmarks

You can run the benchmarks with different numbers of records:

```bash
# Run with default 100 records
npm run benchmark

# Run quick test with 100 records
npm run test

# Run full benchmark with 10,000 records
npm run full

# Run with custom number of records
node benchmark.js 500
```

## Benchmark Results

Results are automatically saved to JSON files with the format:

```
benchmark-results-{recordCount}-rows-{timestamp}.json
```

Example result structure:

```json
{
  "timestamp": "2024-03-14T12:34:56.789Z",
  "configuration": {
    "recordCount": 100
  },
  "coldStart": {
    "neon": 234.56,
    "turso": 123.45
  },
  "writeTest": {
    "neon": 567.89,
    "turso": 456.78,
    "rowCount": 100,
    "neonAvgPerRow": 5.67,
    "tursoAvgPerRow": 4.56
  },
  "readTest": {
    "simpleQuery": {
      "neon": 123.45,
      "turso": 234.56
    },
    "filterQuery": {
      "neon": 345.67,
      "turso": 456.78
    }
  }
}
```

All times are measured in milliseconds (ms).

## Notes

- The benchmark creates and drops tables for each run to ensure clean tests
- Cold start tests create new connections for accurate measurement
- Write tests insert records sequentially (not batched)
- Read tests perform both simple and filtered queries
- Results are saved automatically, even if the benchmark encounters an error
