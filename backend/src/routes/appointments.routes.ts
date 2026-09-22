import { Router } from "express";
import * as appointmentsController from "../controllers/appointments.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
} from "../schemas/appointment.schema";

const router = Router();

router.use(requireAuth);

router.get("/", validate(listAppointmentsQuerySchema, "query"), asyncHandler(appointmentsController.list));
router.post("/", validate(createAppointmentSchema), asyncHandler(appointmentsController.create));

export default router;
