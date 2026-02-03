import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getSession } from "@auth/express";
import { authConfig } from "../app.js";
import type { Session } from "@auth/express";
import ApiError from "../utils/apiError.js";


const authMiddleware = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // getting session
    // checking if there is user in session
    // no user -> pass error to the next middleware
    // user exist -> simply pass control to next middleware

    try {
        const session = await getSession(req, authConfig)

        if (session && session.user) {
            // user and session exists. pass to next middleware
            next()
        } else {
            // user or session does not exist
            console.log("error: session / user does not exist")
            throw new ApiError(401, "session not found")
        }
    } catch (error) {
        if (error instanceof ApiError) throw error;

        console.log("error in auth middleware: ", error)
        throw new ApiError(500, `Internal server error in auth middleware`)
    }

})

export default authMiddleware