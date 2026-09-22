import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimiter";
import { signupSchema, loginSchema } from "../schemas/auth.schema";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.post("/signup", authLimiter, validate(signupSchema), asyncHandler(authController.signup));
router.post("/login", authLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post("/logout", asyncHandler(authController.logout));
router.get("/me", requireAuth, asyncHandler(authController.me));

export default router;
