import type { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

// Express 4 doesn't forward rejected promises from async handlers to
// next(err) automatically - this wrapper does, so every route can just
// `throw new AppError(...)` instead of manually try/catching.
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
