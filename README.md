# Solana Forensic Analysis Tool

A comprehensive blockchain analysis tool for Solana transactions, providing powerful visualization and investigation capabilities for forensic analysis.

![Solana Forensic Analysis Tool](https://i.imgur.com/placeholder.jpg)

## Features

- **Transaction Flow Mapping**: Interactive flow charts visualizing fund movements between wallets
- **Wallet Analysis**: Track funding sources and complete history of wallet activity
- **Transaction Clustering**: Group related transactions and identify associated wallets
- **Entity Labeling System**: Identify and label exchanges, projects, and other entities
- **Mainnet Support**: Full compatibility with Solana mainnet

## System Requirements

- Node.js v18+ 
- PostgreSQL 14+
- Git
- npm or yarn

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/Assylum-Labs/forensic-analysis-tool.git
cd solana-forensic-tool
```

### Backend Setup

1. Navigate to the server directory:

```bash
git clone https://github.com/Assylum-Labs/forensic-tooling-server.git
```

```bash
cd forensic-tooling-server
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_NAME=solana_forensics
PORT=4600
```

4. Create the PostgreSQL database:

```bash
createdb solana_forensics
```

5. Start the backend server:

```bash
npm run start:dev
```

The backend should now be running on http://localhost:4600

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd ../frontend  # or the appropriate directory name
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with the following content:

```
NEXT_PUBLIC_API_URL=http://localhost:4600
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
```

4. Start the frontend development server:

```bash
npm run dev
```

The frontend should now be running on http://localhost:3000

## ⚠️ RPC Configuration (Important)

Public Solana RPC endpoints have rate limits that can quickly be exceeded when performing forensic analysis. It's **strongly recommended** to set up a custom RPC endpoint to avoid disruptions during analysis.

### Options for Custom RPC Endpoints:

1. **Run your own Solana validator/RPC node** (most robust but resource-intensive)
2. **Use a paid RPC provider service** like:
   - [Helius](https://helius.xyz/)
   - [QuickNode](https://www.quicknode.com/)
   - [Alchemy](https://www.alchemy.com/)
   - [Triton](https://triton.one/)

### Configuring Your RPC Endpoint:

1. **Via Environment Variables**: 
   - Set `NEXT_PUBLIC_SOLANA_RPC_ENDPOINT` in your `.env.local` file

2. **Via the UI**:
   - Click on the RPC Endpoint button in the top navigation bar
   - Enter your custom RPC URL
   - Click "Save Endpoint"

## Usage Guide

### Transaction Analysis

Analyze individual transactions to understand fund flows and identify critical paths:

1. Navigate to the "Transaction Analysis" section
2. Enter a transaction signature
3. Click "Analyze"
4. View the visual representation of funds movement
5. Examine the critical path highlighting the essential flow of funds
6. Review detailed transaction information in the tabs

![Transaction Analysis](https://i.imgur.com/placeholder2.jpg)

### Wallet Analysis

Investigate wallet activity and connections:

1. Navigate to the "Wallet Analysis" section
2. Enter a Solana wallet address
3. Set a date range for analysis
4. Toggle between "Wallet View" and "Token View"
5. Explore the interactive graph showing connections
6. Click on nodes to see detailed information

### Transaction Clustering

Group related transactions to identify patterns:

1. Navigate to the "Transaction Clustering" section
2. Enter a wallet address or token
3. Select a timeframe or custom date range
4. Adjust the transaction limit and network depth settings
5. Review the identified clusters
6. Explore each cluster's visualization and details
7. Investigate detected anomalies and related wallet groups

### Entity Labeling

Manage and label known entities in the Solana ecosystem:

1. Navigate to the "Entity Labeling" section
2. Browse existing entities or create new ones
3. Edit entity details such as name, type, verification status
4. Add related addresses to group multiple addresses under one entity
5. Use the exchange detection feature to identify exchange wallets

## Advanced Configuration

### Database Seeding

The system can be pre-populated with known entities:

1. Create a `data` directory in the root of the server project
2. Add the following JSON files:
   - `unverified-list.json`: Contains unverified entities
   - `verified-list-1.json`: Primary verified entities with metadata
   - `verified-list-2.json`: Secondary verified entities

### Performance Optimization

For analyzing large wallets or long timeframes:

1. Increase Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=8192`
2. Use a dedicated high-performance RPC endpoint
3. Adjust transaction limits in the UI to manage analysis scope

## Troubleshooting

### Rate Limiting Issues

If you encounter "Rate limit exceeded" errors:

1. Switch to a custom RPC endpoint with higher limits
2. Reduce the analysis timeframe
3. Lower the transaction limit in the UI
4. Try analyzing during off-peak hours

### Connection Errors

If the application fails to connect to the Solana network:

1. Check your internet connection
2. Verify your RPC endpoint is operational
3. Try an alternative RPC endpoint
4. Check Solana network status at [status.solana.com](https://status.solana.com)

### Database Issues

If you encounter database connection errors:

1. Verify PostgreSQL is running
2. Check database credentials in `.env`
3. Ensure the database exists and is accessible
4. Restart the backend server

## Development

### Backend Development

The backend is built with NestJS and uses Sequelize ORM:

```bash
# Run in development mode with hot reload
npm run start:dev

# Build for production
npm run build

# Run tests
npm run test
```

### Frontend Development

The frontend is built with Next.js and Tailwind CSS:

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production build
npm start

# Run linter
npm run lint
```

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_USERNAME | Database username | postgres |
| DB_PASSWORD | Database password | postgres |
| DB_NAME | Database name | solana_forensics |
| PORT | Server port | 4600 |

### Frontend (.env.local)

| Variable | Description | Default |
|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | Backend API URL | http://localhost:4600 |
| NEXT_PUBLIC_SOLANA_RPC_ENDPOINT | Solana RPC endpoint | https://api.mainnet-beta.solana.com |

## License

[License information here]

## Acknowledgements

- Solana Labs
- [Other acknowledgements]