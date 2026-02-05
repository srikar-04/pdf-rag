import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authConfig } from "../app.js";
import { getSession, type Session } from "@auth/express";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import { OAuthUserSchema, UserProfileSchema } from "../schemas/user.schema.js";
import { prisma } from "../lib/prisma.js";


const getUserSession = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const session = await getSession(req, authConfig)

        if (!session || !session.user) {
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

        if (!parsedAuthUser.success) {
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

        if (existingUser) {
            return res.json(new ApiResponse(200, { user: existingUser, onBoardingRequired: false }, "session retrieved, onboarding not required"))
        }

        return res.json(new ApiResponse(200, { user: session.user, onBoardingRequired: true }, "session retrieved, onboarding required"))

        // 4) upserting user is done in another route and in below controller

    } catch (error) {
        console.log('error in getting session: ', error)
        throw new ApiError(500, 'Internal server error in getting session')
    }
})

const registerUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const session = await getSession(req, authConfig)
    if (!session || !session.user) {
        throw new ApiError(401, 'Unauthorized')
    }

    const username = req.body.username

    // 1) validate username with zod schema
    const parsedUsername = UserProfileSchema.safeParse(username)

    if (!parsedUsername.success) {
        throw new ApiError(400, 'Invalid username')
    }

    // 2) check if username is already taken
    const existingUser = await prisma.user.findUnique({
        where: {
            username: parsedUsername.data.username
        }
    })

    if (existingUser) {
        throw new ApiError(409, 'username already taken')
    }

    // 3) Validate OAuth details from session (to get correct Provider enum type)
    const rawAuth = {
        provider: session.provider,
        providerUserId: session.providerUserId,
        email: session.user.email
    }

    const parsedAuthUser = OAuthUserSchema.safeParse(rawAuth)

    if (!parsedAuthUser.success) {
        throw new ApiError(401, 'Unauthorized, provider details invalid in session')
    }

    const { provider, providerUserId } = parsedAuthUser.data

    const user = await prisma.user.create({
        data: {
            username: parsedUsername.data.username,
            email: session.user.email!,
            provider: provider,
            providerUserId: providerUserId
        }
    })

    return res.status(201).json(new ApiResponse(201, { user }, 'User registered successfully'))
})

export { getUserSession, registerUser }