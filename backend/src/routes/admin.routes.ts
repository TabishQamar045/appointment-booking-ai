import { Router } from "express";
import * as servicesController from "../controllers/services.controller";
import * as businessHoursController from "../controllers/businessHours.controller";
import * as appointmentsController from "../controllers/appointments.controller";
import * as customersController from "../controllers/customers.controller";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createServiceSchema, updateServiceSchema } from "../schemas/service.schema";
import { updateBusinessHoursSchema } from "../schemas/businessHours.schema";
import {
  adminCreateAppointmentSchema,
  listAppointmentsQuerySchema,
  updateAppointmentStatusSchema,
} from "../schemas/appointment.schema";
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

router.get(
  "/appointments",
  validate(listAppointmentsQuerySchema, "query"),
  asyncHandler(appointmentsController.adminList)
);
router.post(
  "/appointments",
  validate(adminCreateAppointmentSchema),
  asyncHandler(appointmentsController.adminCreate)
);
router.patch(
  "/appointments/:id",
  validate(updateAppointmentStatusSchema),
  asyncHandler(appointmentsController.adminUpdateStatus)
);

router.get("/customers", asyncHandler(customersController.list));

export default router;
