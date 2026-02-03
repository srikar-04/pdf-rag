import express, { urlencoded, type NextFunction, type Request, type Response } from "express";
import cors from 'cors'
import ApiResponse from "./utils/apiResponse.js";
import ApiError from "./utils/apiError.js";

import { ExpressAuth, getSession } from "@auth/express";
import GitHub from '@auth/express/providers/github';
import Google from '@auth/express/providers/google';
import type { ExpressAuthConfig } from "@auth/express";

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
        async signIn({user, account, credentials, profile, email}) {
            // everything working here
            console.log(user.id, user.name, user.email, user.image)
            console.log(account?.provider, account?.providerAccountId)
            return true
        },
        async redirect({url, baseUrl}: {url: string, baseUrl: string}) {
            return "http://localhost:5173"
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
app.use("/auth", ExpressAuth(
    // {
    //     providers: [
    //         GitHub({ clientId: githubClientId, clientSecret: githubClientSecret }),
    //         Google({ clientId: googleClientId, clientSecret: googleClientSecret })
    //     ],
    //     basePath: '/auth',
    //     trustHost: true,
    //     // skipCSRFCheck: true,
    //     callbacks: {
    //         // async signIn({ user, account, profile, credentials }: any) {
    //         //     // user object
    //         //     // const email = user.email
    //         //     // const provider = user.provider
    //         //     // const providerUserId = user.providerUserId
    //         //     // const username = user.username

    //         //     // account object 


    //         //     // console.log(email, '\n', username, '\n', provider, '\n', providerUserId, '\n')
    //         //     return true
    //         // },
    //         async signIn({user, account, credentials, profile, email}) {
    //             // console.log("user", user, "account", account, "credentials", credentials, "profile", profile, "email", email)
    //             console.log(user.id, user.name, user.email, user.image)
    //             console.log(account?.provider, account?.providerAccountId)
    //             return true
    //         },
    //         async redirect({url, baseUrl}: {url: string, baseUrl: string}) {
    //             return "http://localhost:5173"
    //         }
    //     }
    // }
    authConfig
))


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