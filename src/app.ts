import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import cors from "cors";

// Import routes
import healthRoutes from "./api/routes/health";
import discoveryRoutes from "./api/routes/discovery";

const app = express();

// Middleware
app.use(express.json());
app.use(cors({ origin: "*" }));

// Load OpenAPI spec
const openApiSpec = YAML.load(path.join(__dirname, "./api/docs/openapi.yaml"));

// Mount API routes
app.use("/api/v1", healthRoutes);
app.use("/api/v1", discoveryRoutes);

// Mount Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

export default app;
