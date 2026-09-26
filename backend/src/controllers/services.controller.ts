import type { Request, Response } from "express";
import * as servicesService from "../services/services.service";
import * as availabilityService from "../services/availability.service";

export async function list(_req: Request, res: Response) {
  const services = await servicesService.listActiveServices();
  res.status(200).json({ services });
}

export async function adminList(_req: Request, res: Response) {
  const services = await servicesService.listAllServices();
  res.status(200).json({ services });
}

export async function create(req: Request, res: Response) {
  const service = await servicesService.createService(req.body);
  res.status(201).json({ service });
}

export async function update(req: Request, res: Response) {
  const service = await servicesService.updateService(req.params.id, req.body);
  res.status(200).json({ service });
}

export async function availability(req: Request, res: Response) {
  const { serviceId, date } = req.query as { serviceId: string; date: string };
  const slots = await availabilityService.getAvailableSlots(serviceId, date);
  res.status(200).json({ slots });
}
