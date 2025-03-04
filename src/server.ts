import dotenv from "dotenv";
import path from "path";
import http from "http";

import app from "./app";

import { ethers } from "ethers";
import { Services } from "./services";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const PORT = process.env.PORT || 8080;
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";
const BASE_RPC_URL = process.env.BASE_RPC_URL || "";

async function startServer() {
  try {
    // Initialize provider
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);

    // Initialize services
    const services = Services.getInstance(provider, BASESCAN_API_KEY);
    await services.initialize();

    // Create HTTP server
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
    });

    process.on("SIGINT", async () => {
      console.log("Gracefully shutting down server...");

      await services.shutdown();

      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
}

startServer();
