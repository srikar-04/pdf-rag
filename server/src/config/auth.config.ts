import GitHub from '@auth/express/providers/github';
import Google from '@auth/express/providers/google';
import type { ExpressAuthConfig } from "@auth/express";

const githubClientId = process.env.AUTH_GITHUB_ID
const githubClientSecret = process.env.AUTH_GITHUB_SECRET

const googleClientId = process.env.AUTH_GOOGLE_ID
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET

if (!githubClientId || !githubClientSecret) {
    throw new Error('AUTH_GITHUB_ID or AUTH_GITHUB_SECRET is not defined')
}

if (!googleClientId || !googleClientSecret) {
    throw new Error('AUTH_GOOGLE_ID or AUTH_GOOGLE_SECRET is not defined')
}

export const authConfig: ExpressAuthConfig = {
    providers: [
        GitHub({ clientId: githubClientId, clientSecret: githubClientSecret }),
        Google({ clientId: googleClientId, clientSecret: googleClientSecret })
    ],
    basePath: '/auth',
    trustHost: true,
    callbacks: {
        async signIn({ user, account, credentials, profile, email }) {
            console.log(user.id, user.name, user.email, user.image)
            console.log(account?.provider, account?.providerAccountId, '\n \n \n')
            return true
        },
        async redirect({ url, baseUrl }: { url: string, baseUrl: string }) {
            return "http://localhost:5173"
        },
        async jwt({ token, user, account }) {
            if (user) {
                if (account?.provider && account.providerAccountId) {
                    token.provider = account?.provider
                    token.providerUserId = account?.providerAccountId
                } else {
                    console.error('provider details not found')
                }
            }
            return token
        },
        async session({ session, token }) {
            if (token && token.provider && token.providerUserId) {
                session.provider = token.provider as string
                session.providerUserId = token.providerUserId as string
            }
            console.log("session from backend : ", session)
            return session
        }
    }
}
