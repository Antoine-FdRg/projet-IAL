import type { Request, Response, NextFunction } from 'express';
import { BoxRepository } from '../database/boxRepository.js';

/**
 * Extended Request type with authenticated box information
 */
export interface AuthenticatedRequest extends Request {
  boxId?: string;
}

/**
 * Middleware to verify Bearer token authentication
 * Expects Authorization header: "Bearer <UUID>"
 * The UUID serves as both the box identifier and authentication token
 */
export async function authenticateBox(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Missing or invalid Authorization header. Expected: Bearer <UUID>',
      });
      return;
    }

    // Extract token (UUID)
    const token = authHeader.substring(7).trim(); // Remove "Bearer "

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token is empty',
      });
      return;
    }

    // Verify token (UUID) is valid and box exists
    const isValid = await BoxRepository.verifyToken(token);

    if (!isValid) {
      res.status(403).json({
        success: false,
        message: 'Invalid token or box does not exist',
      });
      return;
    }

    // Attach boxId (same as token/UUID) to request for use in route handlers
    req.boxId = token;

    next();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] - Authentication error:`, error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
    });
  }
}
