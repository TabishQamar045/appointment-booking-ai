import { Router } from "express";
import * as notificationsController from "../controllers/notifications.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(notificationsController.list));
router.post("/read-all", asyncHandler(notificationsController.markAllRead));
router.post("/:id/read", asyncHandler(notificationsController.markRead));

export default router;
