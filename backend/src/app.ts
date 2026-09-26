import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { requestLogger } from "./middleware/requestLogger";
import { generalLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import appointmentRoutes from "./routes/appointments.routes";
import chatRoutes from "./routes/chat.routes";
import servicesRoutes from "./routes/services.routes";
import availabilityRoutes from "./routes/availability.routes";
import adminRoutes from "./routes/admin.routes";
import notificationsRoutes from "./routes/notifications.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.frontendOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(requestLogger);
  app.use(generalLimiter);

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/auth", authRoutes);
  app.use("/appointments", appointmentRoutes);
  app.use("/chat", chatRoutes);
  app.use("/services", servicesRoutes);
  app.use("/availability", availabilityRoutes);
  app.use("/admin", adminRoutes);
  app.use("/notifications", notificationsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
