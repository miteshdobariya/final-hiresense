import NextAuth, { DefaultSession } from "next-auth"
import { JWT as DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  // Extend Session type
  interface Session {
    user: {
      _id: string
      username: string
      email: string
      role: string
    } & DefaultSession["user"]
  }

  // Extend User type
  interface User {
    _id?: string
    username?: string
    email: string
    role: string
  }
}

declare module 'next-auth/jwt' {
  // Extend JWT type
  interface JWT {
    _id: string;
    username?: string;
    email: string;
    role?: string;
  }
}
