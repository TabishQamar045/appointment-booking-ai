import type { Request, Response } from "express";
import * as businessHoursService from "../services/businessHours.service";

export async function get(_req: Request, res: Response) {
  const days = await businessHoursService.getBusinessHours();
  res.status(200).json({ days });
}

export async function update(req: Request, res: Response) {
  const days = await businessHoursService.setBusinessHours(req.body);
  res.status(200).json({ days });
}
