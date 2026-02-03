import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authConfig } from "../app.js";
import { getSession } from "@auth/express";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";


const getUserSession = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const session = await getSession(req, authConfig)

        return res.json(new ApiResponse(200, session || { user: null }, 'Session retrieved'))

    } catch (error) {
        console.log('error in getting session: ', error)
        throw new ApiError(500, 'Internal server error in getting session')
    }
})

export { getUserSession }