import dotenv from "dotenv"
dotenv.config()

// import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseURL = process.env.DATABASE_URL

if(!databaseURL) throw new Error("DATABASE_URL is not defined")

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseURL,
  },
});
