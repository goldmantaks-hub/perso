import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

const JWT_SECRET = config.jwtSecret;

export interface JwtPayload {
  userId: string;
  username?: string;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      username?: string;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "인증 토큰이 필요합니다" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (error) {
    return res.status(403).json({ error: "유효하지 않은 토큰입니다" });
  }
}

export function optionalAuthenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (error) {
    next();
  }
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
