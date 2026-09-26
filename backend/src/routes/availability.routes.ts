import { Router } from "express";
import * as servicesController from "../controllers/services.controller";
import { validate } from "../middleware/validate";
import { availabilityQuerySchema } from "../schemas/appointment.schema";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

// Public - anyone browsing the booking form needs this before they have an
// account.
router.get(
  "/",
  validate(availabilityQuerySchema, "query"),
  asyncHandler(servicesController.availability)
);

export default router;
