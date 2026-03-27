import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import db from './db';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  try {
    await db.migrate.latest();
    console.log('Migrations complete');

    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();

    app.use('/graphql', expressMiddleware(server));

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
