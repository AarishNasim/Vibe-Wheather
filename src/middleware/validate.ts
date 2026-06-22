/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Input Validation Middleware using Zod
 * Provides strict schemas for all API endpoints to prevent
 * HTTP Parameter Pollution, injection attacks, and malformed inputs.
 */

import { z } from "zod";
import { Request, Response, NextFunction } from "express";

// ─── Sanitization Helpers ───────────────────────────────────────────

/** Strip characters commonly used in injection attacks */
const sanitizedString = (minLen: number, maxLen: number) =>
  z
    .string()
    .min(minLen, `Must be at least ${minLen} character(s)`)
    .max(maxLen, `Must be at most ${maxLen} characters`)
    .refine((val) => !/[<>{}\\]/.test(val), {
      message: "Contains disallowed characters: < > { } \\",
    });

/** Numeric string that parses to a valid float within bounds */
const numericCoord = (min: number, max: number, label: string) =>
  z
    .string()
    .refine((val) => !isNaN(parseFloat(val)), {
      message: `${label} must be a valid number`,
    })
    .refine((val) => {
      const n = parseFloat(val);
      return n >= min && n <= max;
    }, {
      message: `${label} must be between ${min} and ${max}`,
    });

// ─── Endpoint Schemas ───────────────────────────────────────────────

/** GET /api/search?q=... */
export const searchQuerySchema = z.object({
  q: sanitizedString(1, 100),
});

/** GET /api/weather?lat=...&lon=...&city=... */
export const weatherQuerySchema = z.object({
  lat: numericCoord(-90, 90, "Latitude"),
  lon: numericCoord(-180, 180, "Longitude"),
  city: sanitizedString(1, 100).optional().default("Current Location"),
});

/** Nested weather condition schema used in AI payloads */
const weatherConditionSchema = z.object({
  text: z.string().max(100),
  code: z.number().int().min(0).max(99),
  icon: z.string().max(50).optional(),
});

/** POST /api/weather/ai-suggestions body */
export const aiSuggestionsBodySchema = z.object({
  currentData: z.object({
    city: z.string().max(200),
    temp_c: z.number().min(-100).max(100),
    condition: weatherConditionSchema,
    humidity: z.number().min(0).max(100),
    wind_kph: z.number().min(0).max(500),
  }),
});

/** POST /api/weather/voice-assistant body */
export const voiceAssistantBodySchema = z.object({
  query: sanitizedString(1, 500),
  weatherContext: z
    .object({
      city: z.string().max(200).optional(),
      temp_c: z.number().optional(),
      condition: weatherConditionSchema.optional(),
      humidity: z.number().optional(),
      wind_kph: z.number().optional(),
    })
    .optional()
    .nullable(),
});

// ─── Validation Middleware Factory ───────────────────────────────────

/**
 * Creates an Express middleware that validates `req.query` or `req.body`
 * against a Zod schema. On failure, returns a structured 400 response
 * with validation error details — no stack traces are exposed.
 *
 * @param schema - Zod schema to validate against
 * @param source - Whether to validate 'query' params or 'body' payload
 */
export function validateRequest(
  schema: z.ZodType<any>,
  source: "query" | "body" = "query"
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = source === "query" ? req.query : req.body;
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
      return;
    }

    // Overwrite with parsed (and transformed) data for downstream handlers
    if (source === "query") {
      (req as any).validatedQuery = result.data;
    } else {
      (req as any).validatedBody = result.data;
    }

    next();
  };
}
