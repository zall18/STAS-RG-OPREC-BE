import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { UserRole } from '@prisma/client';
import { RegisterInput, LoginInput } from '../schemas/auth.schema';
import { JwtPayload } from '../types';

export class AuthService {
  /**
   * Register new user
   */
  static async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      const error: any = new Error('Email sudah terdaftar');
      error.statusCode = 409;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(input.password, salt);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        password: hashedPassword,
        role: input.role || UserRole.CANDIDATE,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  /**
   * Login user
   */
  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user || !user.password) {
      const error: any = new Error('Email atau password tidak sesuai');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(input.password, user.password);
    if (!isMatch) {
      const error: any = new Error('Email atau password tidak sesuai');
      error.statusCode = 401;
      throw error;
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Sign JWT Token
   */
  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
  }
}
