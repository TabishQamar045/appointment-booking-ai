import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function list(_req: Request, res: Response) {
  const customers = await prisma.user.findMany({
    where: { role: "customer" },
    select: {
      id: true,
      name: true,
      email: true,
      provider: true,
      createdAt: true,
      _count: { select: { appointments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.status(200).json({ customers });
}
