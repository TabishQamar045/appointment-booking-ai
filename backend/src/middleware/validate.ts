import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

type Target = "body" | "query" | "params";

// Generic zod-validation middleware factory. On success, replaces
// req[target] with the parsed (and coerced/defaulted) value so downstream
// handlers get typed, clean data. On failure, throws ZodError, which
// errorHandler.ts turns into a 400 with field-level details.
export function validate(schema: ZodTypeAny, target: Target = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[target]);
    req[target] = parsed;
    next();
  };
}
