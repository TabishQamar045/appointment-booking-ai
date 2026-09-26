import { Router } from "express";
import * as servicesController from "../controllers/services.controller";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

// Public - the marketing/services pages and the booking form read this
// without being logged in.
router.get("/", asyncHandler(servicesController.list));

export default router;
