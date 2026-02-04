import express, { urlencoded, type NextFunction, type Request, type Response } from "express";
import cors from 'cors'
import ApiResponse from "./utils/apiResponse.js";
import ApiError from "./utils/apiError.js";

import { ExpressAuth } from "@auth/express";
import GitHub from '@auth/express/providers/github';
import Google from '@auth/express/providers/google';
import type { ExpressAuthConfig } from "@auth/express";
import type { Session } from "@auth/express";
import type { JWT } from '@auth/core/jwt'
import type { AdapterUser } from "@auth/express/adapters";
import type { AdapterSession } from "@auth/express/adapters";

export type SessionUser = {
    session: {
        user: AdapterUser;
    } &
    AdapterSession &
    Session & {
        provider?: string;
        providerUserId?: string;
    },
    token: JWT & {
        provider?: string;
        providerUserId?: string;
    }
}

import authMiddleware from "./middlewares/auth.middleware.js";
import authRouter from './routes/auth.routes.js'

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
    // skipCSRFCheck: true,
    callbacks: {
        async signIn({ user, account, credentials, profile, email }) {
            // everything working here
            console.log(user.id, user.name, user.email, user.image)
            console.log(account?.provider, account?.providerAccountId, '\n \n \n')
            return true
        },
        async redirect({ url, baseUrl }: { url: string, baseUrl: string }) {
            return "http://localhost:5173"
        },
        async jwt({token, user, account}) {
            if(user) {
                token.provider = account?.provider
                token.providerUserId = account?.providerAccountId
            }
            return token
        },
        async session({session, token}: SessionUser) {
            if(token && token.provider && token.providerUserId) {
                session.provider = token.provider
                session.providerUserId = token.providerUserId
            }
            console.log("session from backend : ", session)
            return session
        }
    }
}

const app = express()

// MIDDLEWARES

app.use(express.json())
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(urlencoded({ extended: true }))

app.set("trust proxy", true)
app.use("/auth", ExpressAuth(authConfig))


// ROUTES

app.use('/api/v1/auth', authRouter)

app.get('/protected-route', authMiddleware, async (req: Request, res: Response, next: NextFunction )=> {
    res.send('now you are accessing protected route')
})

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error caught by middleware:', err)

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json(
            new ApiResponse(err.statusCode, {}, err.message)
        )
    }

    // Handle unexpected errors
    return res.status(500).json(
        new ApiResponse(500, {}, 'Internal Server Error')
    )
})

export default app