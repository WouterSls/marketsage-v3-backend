import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import cors from "cors";

// Import routes
import healthRoutes from "./api/routes/health";
import tokenDiscoveryRoutes from "./api/routes/token-discovery";
import tokenSecurityValidatorRoutes from "./api/routes/token-security-validator";

const app = express();

// Middleware
app.use(express.json());
app.use(cors({ origin: "*" }));

// Load OpenAPI spec
const openApiSpec = YAML.load(path.join(__dirname, "./api/docs/openapi.yaml"));

// Set provider for routes to use
/** 
const PROVIDER_URL = process.env.PROVIDER_URL || "http://localhost:8545";
const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
app.set("provider", provider);
*/

// Mount API routes
app.use("/api/v1", healthRoutes);
app.use("/api/v1", tokenDiscoveryRoutes);
app.use("/api/v1", tokenSecurityValidatorRoutes);

// Mount Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

export default app;
