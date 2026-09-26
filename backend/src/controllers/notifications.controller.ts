import type { Request, Response } from "express";
import * as notificationsService from "../services/notifications.service";
import { AppError } from "../lib/AppError";

export async function list(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const { notifications, unreadCount } = await notificationsService.listNotifications(req.user.id);
  res.status(200).json({ notifications, unreadCount });
}

export async function markRead(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  await notificationsService.markRead(req.user.id, req.params.id);
  res.status(204).end();
}

export async function markAllRead(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  await notificationsService.markAllRead(req.user.id);
  res.status(204).end();
}
