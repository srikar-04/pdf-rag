import express, { urlencoded, type NextFunction, type Request, type Response } from "express";
import cors from 'cors'
import ApiResponse from "./utils/apiResponse.js";
import ApiError from "./utils/apiError.js";

import { ExpressAuth } from "@auth/express";
import GitHub from '@auth/express/providers/github';
import Google from '@auth/express/providers/google';

const app = express()

// MIDDLEWARES

app.use(express.json())
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(urlencoded({extended: true}))

app.set("trust proxy", true)
app.use("/auth", ExpressAuth({
    providers: [GitHub, Google]
}))


// ROUTES

app.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.send('Hello World!')
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