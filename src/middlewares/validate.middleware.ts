import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed.body) req.body = parsed.body;
      if (parsed.query) (req as any).query = parsed.query;
      if (parsed.params) req.params = parsed.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = error.errors.map((err) => ({
          field: err.path.join('.').replace(/^(body|query|params)\./, ''),
          message: err.message,
        }));

        const detailedMessage =
          fieldErrors.length > 0
            ? `Validasi gagal: ${fieldErrors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
            : 'Validasi gagal';

        res.status(400).json({
          success: false,
          message: detailedMessage,
          errors: fieldErrors,
        });
        return;
      }
      next(error);
    }
  };
};
