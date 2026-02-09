import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getSession } from "@auth/express";
import { authConfig } from "../config/auth.config.js";
import ApiError from "../utils/apiError.js";
import { prisma } from "../lib/prisma.js";

const authMiddleware = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // getting session
    // checking if there is user in session
    // no user -> pass error to the next middleware
    // user exist -> simply pass control to next middleware

    try {
        const session = await getSession(req, authConfig)

        if (session && session.user) {
            // getting user from db
            // appending user to req.user

            if(!session.user.email) {
                throw new ApiError(400, 'user email not found in auth middleware')
            }

            const dbUser = await prisma.user.findUnique({
                where: {
                    email: session.user.email
                }
            })

            if(!dbUser) {
                throw new ApiError(404, 'user not found in auth middleware')
            }

            req.user = dbUser

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