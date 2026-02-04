import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authConfig } from "../app.js";
import { getSession, type Session } from "@auth/express";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import type { SessionUser } from "../app.js";
import { OAuthUserSchema } from "../schemas/user.schema.js";
import { prisma } from "../lib/prisma.js";


const getUserSession = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const session = await getSession(req, authConfig) as SessionUser['session']

        if(!session || !session.user) {
            throw new ApiError(401, 'Unauthorized')
        }

        // 1) get user details from session

        const rawUser = {
            // username: session.user.name, /* username is not included because it may not be unique */

            email: session.user.email,
            provider: session.provider,
            providerUserId: session.providerUserId
        }

        // 2) validate "userAuth" details with zod schema
        const parsedAuthUser = OAuthUserSchema.safeParse(rawUser)

        if(!parsedAuthUser.success) {
            throw new ApiError(401, 'OAuth user failed validation')
        }

        // 3) chekck if the user is already present in database
        const existingUser = await prisma.user.findUnique({
            where: {
                provider_providerUserId: {
                    provider: parsedAuthUser.data.provider,
                    providerUserId: parsedAuthUser.data.providerUserId
                }
            }
        })

        if(existingUser) {
            return res.json(new ApiResponse(200, session.user && {onBoardingRequired: false}, "session retrieved, onboarding not required"))
        }

        return res.json(new ApiResponse(200, session.user && {onBoardingRequired: true}, "session retrieved, onboarding required"))

        // 4) upserting user is done in another route and in below controller

    } catch (error) {
        console.log('error in getting session: ', error)
        throw new ApiError(500, 'Internal server error in getting session')
    }
})

const registerUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    
})

export { getUserSession, registerUser }