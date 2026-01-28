import type { NextFunction, RequestHandler, Request, Response } from "express";


const asyncHandler = (asyncHandler: RequestHandler): RequestHandler => {

    return (req: Request, res: Response, next: NextFunction) => {
        Promise
        .resolve(asyncHandler(req, res, next))
        .catch(err => next(err))
    }
}

export { asyncHandler }