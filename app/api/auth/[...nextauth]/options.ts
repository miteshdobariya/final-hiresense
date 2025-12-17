import GoogleProvider from "next-auth/providers/google"
import { NextAuthOptions } from "next-auth"
import { connect } from "@/dbConfig/dbConfig"
import candidates from "@/models/candidates"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Increase default HTTP timeout (was 3500ms leading to OAuthCallbackError)
      httpOptions: {
        timeout: 15000,
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {

    async jwt({ token, account, profile }) {
  await connect();

  if (account?.provider === "google" && profile?.email) {
    let user = await candidates.findOne({ email: profile.email });

    if (!user) {
      // Get admin emails from env and split into array
      const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
      const hrEmails = process.env.HR_EMAILS?.split(",") || [];

      // Determine role
      let role = "candidate";
      const email = profile.email;

      if (email.endsWith("@scet.ac.in")) {
        role = "interviewer";
      } else if (adminEmails.includes(email)) {
        role = "admin";
      } else if (hrEmails.includes(email)) {
        role = "hr";
      }

      // Create user
      user = await candidates.create({
        email: profile.email,
        username: profile.name?.replace(/\s+/g, "").toLowerCase(),
        password: "",
        role,
      });

      // --- Update lastLogin timestamp ---
      await candidates.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    }

    token._id = user._id.toString();
    token.email = user.email;
    token.username = user.username;
    token.role = user.role;
  }

  return token;
},

    async session({ session, token }) {
      if (session.user) {
        session.user._id = token._id as string
        session.user.email = token.email as string
        session.user.username = token.username as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
