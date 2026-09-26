import type { Request, Response } from "express";
import * as appointmentsService from "../services/appointments.service";
import { AppError } from "../lib/AppError";

export async function list(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const { status } = req.query as { status?: "pending" | "confirmed" | "cancelled" };
  const appointments = await appointmentsService.listAppointments(req.user.id, status);
  res.status(200).json({ appointments });
}

export async function create(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const appointment = await appointmentsService.createAppointment(req.user.id, req.body);
  res.status(201).json({ appointment });
}

export async function adminList(req: Request, res: Response) {
  const { status } = req.query as { status?: "pending" | "confirmed" | "cancelled" };
  const appointments = await appointmentsService.listAllAppointments(status);
  res.status(200).json({ appointments });
}

export async function adminCreate(req: Request, res: Response) {
  const { userId, ...input } = req.body;
  const appointment = await appointmentsService.createAppointment(userId, input);
  res.status(201).json({ appointment });
}
