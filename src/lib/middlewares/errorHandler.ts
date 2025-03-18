import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ApiError, InternalServerError } from "../errors/ApiError";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
/**
 * Global error handler middleware for API errors
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let isOperational = false;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  if (err instanceof InternalServerError) {
    statusCode = 500;
    message = err.message;
    isOperational = true;
  }

  if (process.env.NODE_ENV === "development") {
    console.error(`[ERROR] ${err.name}: ${err.message}`);
    console.error(err.stack);

    res.status(statusCode).json({
      success: false,
      error: {
        message,
        statusCode,
        isOperational,
        stack: err.stack,
        name: err.name,
      },
    });
  } else {
    res.status(statusCode).json({
      success: false,
      error: {
        message: isOperational ? message : "Something went wrong. Please try again later.",
        statusCode,
      },
    });
  }
};

/**
 * Catch 404 errors for routes that don't exist
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const err = new ApiError(`Cannot find ${req.method} ${req.originalUrl}`, 404);
  next(err);
};

/**
 * Async handler to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
