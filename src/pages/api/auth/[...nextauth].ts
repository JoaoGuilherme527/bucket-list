import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import dbConnect from "../../../lib/mongodb"
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  theme: {
    colorScheme: "light",
  },
  callbacks: {
    // Executado quando o usuário faz login
    async signIn({ user }) {
      await dbConnect();
      
      try {
        // Atualiza o usuário se existir, ou cria um novo se não existir (upsert)
        await User.findOneAndUpdate(
          { email: user.email }, // Busca por email
          {
            name: user.name,
            email: user.email,
            image: user.image,
            lastLogin: new Date(),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return true; // Login permitido
      } catch (error) {
        console.error("Erro ao salvar usuário no banco:", error);
        return false; // Nega o login se o banco falhar
      }
    },
    async session({ session }) {
      return session;
    },
  },
};

export default NextAuth(authOptions);