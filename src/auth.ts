import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
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

          let dbUser = existingUser.rows[0];

          if (!dbUser) {
            // New user registration via Google -> default to 'Thành viên' role
            const insertRes = await pool.query(
              `INSERT INTO users (full_name, email, google_id, avatar_url, role, status)
               VALUES ($1, $2, $3, $4, 'Thành viên', 'Đang hoạt động')
               RETURNING *`,
              [user.name || "Google User", user.email, account.providerAccountId, user.image]
            );
            dbUser = insertRes.rows[0];
          } else {
            // Update existing user with google_id and avatar_url if missing
            const updateRes = await pool.query(
              `UPDATE users 
               SET google_id = COALESCE(google_id, $1), 
                   avatar_url = COALESCE($2, avatar_url),
                   full_name = COALESCE(full_name, $3)
               WHERE id = $4
               RETURNING *`,
              [account.providerAccountId, user.image, user.name, dbUser.id]
            );
            if (updateRes.rows.length > 0) {
              dbUser = updateRes.rows[0];
            }
          }

          // Set role and user cookies
          const userRole = (dbUser.role || "Thành viên").trim();
          const lowerRole = userRole.toLowerCase();
          const isAdmin = lowerRole.includes("admin") || lowerRole.includes("quản trị");
          const cookieRole = isAdmin ? "Admin" : lowerRole.includes("lễ tân") ? "Lễ tân" : "Thành viên";

          try {
            const cookieStore = await cookies();
            cookieStore.set("user_role", cookieRole, { path: "/" });
            cookieStore.set("user_name", encodeURIComponent(dbUser.full_name || ""), { path: "/" });
            cookieStore.set("user_email", encodeURIComponent(dbUser.email || ""), { path: "/" });
            if (dbUser.phone) {
              cookieStore.set("user_phone", encodeURIComponent(dbUser.phone), { path: "/" });
            }
          } catch (cookieError) {
            console.error("Error setting cookies during Google signIn:", cookieError);
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
      try {
        let role = "";
        try {
          const cookieStore = await cookies();
          role = cookieStore.get("user_role")?.value || "";

          if (!role) {
            const emailCookie = cookieStore.get("user_email")?.value;
            if (emailCookie) {
              const email = decodeURIComponent(emailCookie);
              const userRes = await pool.query(
                "SELECT role FROM users WHERE email = $1 LIMIT 1",
                [email]
              );
              if (userRes.rows.length > 0) {
                role = userRes.rows[0].role || "";
              }
            }
          }
        } catch {
          // Cookies might not be directly accessible in all redirect contexts
        }

        const lowerRole = (role || "").toLowerCase();
        const isAdmin = lowerRole.includes("admin") || lowerRole.includes("quản trị");

        // ONLY Admin accounts -> redirect to /admin after login
        if (isAdmin) {
          if (url.startsWith("/admin")) {
            return `${baseUrl}${url}`;
          }
          return `${baseUrl}/admin`;
        }

        // All other users (members, regular users, etc.) -> redirect to homepage (/)
        return `${baseUrl}/`;
      } catch (error) {
        console.error("Error in auth redirect callback:", error);
        return `${baseUrl}/`;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      const email = token.email || user?.email;
      if (email) {
        try {
          const res = await pool.query(
            "SELECT id, role, full_name, email FROM users WHERE email = $1 LIMIT 1",
            [email]
          );
          if (res.rows.length > 0) {
            token.id = res.rows[0].id;
            token.role = res.rows[0].role;
            token.name = res.rows[0].full_name;
          }
        } catch (e) {
          console.error("Error fetching user in jwt callback:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
