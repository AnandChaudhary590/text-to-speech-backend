import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in .env");
}

export type UserRole = "USER" | "ADMIN";

export const generateToken = (
  userId: string,
  role: UserRole
): string => {
  return jwt.sign(
    {
      userId,
      role,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

export const generateRefreshToken = (
  userId: string
): string => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );
};

export const verifyToken = (
  token: string
): {
  userId: string;
  role: UserRole;
} => {
  return jwt.verify(
    token,
    JWT_SECRET
  ) as {
    userId: string;
    role: UserRole;
  };
};