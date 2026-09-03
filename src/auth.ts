import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import pool from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists by email or google_id
          const existingUser = await pool.query(
            "SELECT * FROM users WHERE google_id = $1 OR email = $2",
            [account.providerAccountId, user.email]
          );

          if (existingUser.rows.length === 0) {
            // Insert new user
            await pool.query(
              `INSERT INTO users (full_name, email, google_id, avatar_url, role, status)
               VALUES ($1, $2, $3, $4, 'Admin', 'Đang hoạt động')`,
              [user.name || "Google User", user.email, account.providerAccountId, user.image]
            );
          } else {
            // Update existing user with google_id and avatar_url if missing
            await pool.query(
              `UPDATE users 
               SET google_id = COALESCE(google_id, $1), 
                   avatar_url = COALESCE($2, avatar_url),
                   full_name = COALESCE(full_name, $3)
               WHERE id = $4`,
              [account.providerAccountId, user.image, user.name, existingUser.rows[0].id]
            );
          }
          return true;
        } catch (error) {
          console.error("Error syncing Google user to DB:", error);
          return true;
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      // If a specific callbackUrl was provided (e.g. /admin), respect it
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      } else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return `${baseUrl}/admin`;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
