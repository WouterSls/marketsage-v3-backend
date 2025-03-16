import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import cors from "cors";

import setupRoutes from "./api/setup/SetupRouter";
import tokenDiscoveryRoutes from "./api/token-discovery/TokenDiscoveryRouter";
import tokenSecurityValidatorRoutes from "./api/token-security-validator/TokenSecurityRouter";
import tokenMonitorRoutes from "./api/token-monitor/TokenMonitorRouter";
import webhookRoutes from "./api/webhooks/WebhookRouter";
import dataRoutes from "./api/data/DataRouter";

import { errorHandler, notFoundHandler } from "./lib/middlewares";

const app = express();
const openApiSpec = YAML.load(path.join(__dirname, "./api/static/openapi.yaml"));

app.use(express.json());
app.use(cors({ origin: "*" }));

app.use("/api/v1", setupRoutes);

app.use("/api/v1", tokenDiscoveryRoutes);
app.use("/api/v1", tokenSecurityValidatorRoutes);
app.use("/api/v1", tokenMonitorRoutes);

app.use("/api/v1", dataRoutes);

app.use("/api/v1", webhookRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
