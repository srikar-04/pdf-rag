import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authConfig } from "../config/auth.config.js";
import { getSession, type Session } from "@auth/express";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import { OAuthUserSchema, UserProfileSchema } from "../schemas/user.schema.js";
import { prisma } from "../lib/prisma.js";


const getUserSession = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    let session;
    try {
        session = await getSession(req, authConfig)
    } catch (sessionError) {
        console.error('Error getting session:', sessionError);
        return res.json(new ApiResponse(200, { user: null, onBoardingRequired: false }, "no session"))
    }

    if (!session || !session.user) {
        return res.json(new ApiResponse(200, { user: null, onBoardingRequired: false }, "no session"))
    }

    const rawUser = {
        email: session.user.email,
        provider: session.provider,
        providerUserId: session.providerUserId
    }

    const parsedAuthUser = OAuthUserSchema.safeParse(rawUser)

    if (!parsedAuthUser.success) {
        return res.json(new ApiResponse(200, { user: null, onBoardingRequired: false }, "invalid session"))
    }

    const existingUser = await prisma.user.findUnique({
        where: {
            provider_providerUserId: {
                provider: parsedAuthUser.data.provider,
                providerUserId: parsedAuthUser.data.providerUserId
            }
        }
    })

    if (existingUser) {
        return res.json(new ApiResponse(200, { user: existingUser, onBoardingRequired: false }, "session retrieved"))
    }

    return res.json(new ApiResponse(200, { user: null, onBoardingRequired: true }, "needs onboarding"))
})

const registerUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    console.log('authConfig in registerUser: ', authConfig ? 'Defined' : 'Undefined')
    const session = await getSession(req, authConfig)
    if (!session || !session.user) {
        console.log('In registerUser Controller, session not found : ', session)
        throw new ApiError(401, 'Unauthorized')
    }

    const username = req.body.username

    // 1) validate username with zod schema
    const parsedUsername = UserProfileSchema.safeParse({username})

    if (!parsedUsername.success) {
        console.log(parsedUsername.error)
        const errorMessages = parsedUsername.error.issues.map(issue => issue.message)
        throw new ApiError(400, 'Invalid username', errorMessages)
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
        const errorMessages = parsedAuthUser.error.issues.map(issue => issue.message)
        throw new ApiError(401, 'Unauthorized, provider details invalid in session', errorMessages)
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
