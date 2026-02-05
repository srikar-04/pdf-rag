import express, { urlencoded, type NextFunction, type Request, type Response } from "express";
import cors from 'cors'
import ApiResponse from "./utils/apiResponse.js";
import ApiError from "./utils/apiError.js";

import { ExpressAuth } from "@auth/express";
import { authConfig } from "./config/auth.config.js";

import authMiddleware from "./middlewares/auth.middleware.js";
import authRouter from './routes/auth.routes.js'
import documentRouter from './routes/document.routes.js'

// Auth configuration moved to src/config/auth.config.ts

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
app.use('/api/v1/document', documentRouter)

app.get('/protected-route', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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