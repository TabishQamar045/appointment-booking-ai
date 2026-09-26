import { Router } from "express";
import * as servicesController from "../controllers/services.controller";
import * as businessHoursController from "../controllers/businessHours.controller";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createServiceSchema, updateServiceSchema } from "../schemas/service.schema";
import { updateBusinessHoursSchema } from "../schemas/businessHours.schema";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/services", asyncHandler(servicesController.adminList));
router.post("/services", validate(createServiceSchema), asyncHandler(servicesController.create));
router.patch(
  "/services/:id",
  validate(updateServiceSchema),
  asyncHandler(servicesController.update)
);

router.get("/business-hours", asyncHandler(businessHoursController.get));
router.put(
  "/business-hours",
  validate(updateBusinessHoursSchema),
  asyncHandler(businessHoursController.update)
);

export default router;
