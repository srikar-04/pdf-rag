import dotenv from 'dotenv'
dotenv.config()
import { prisma } from './lib/prisma.js'
import app from './app.js'
import { ensureQdrantCollection } from './lib/qdrant.setup.js'

const PORT = process.env.PORT || 3000

async function startServer() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    await ensureQdrantCollection();
    console.log("Qdrant collection verified");

    app.listen(PORT, () => {
      console.log("App is listening on port", PORT);
    });

  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();