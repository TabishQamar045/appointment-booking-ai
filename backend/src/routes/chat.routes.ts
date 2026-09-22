import { Router } from "express";
import * as chatController from "../controllers/chat.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { postChatMessageSchema, sessionIdParamSchema } from "../schemas/chat.schema";

const router = Router();

router.use(requireAuth);

router.post("/sessions", asyncHandler(chatController.createSession));
router.get("/sessions", asyncHandler(chatController.listSessions));
router.get(
  "/sessions/:id/messages",
  validate(sessionIdParamSchema, "params"),
  asyncHandler(chatController.getMessages)
);
router.post(
  "/sessions/:id/messages",
  validate(sessionIdParamSchema, "params"),
  validate(postChatMessageSchema),
  asyncHandler(chatController.postMessage)
);

export default router;
