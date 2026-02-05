import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import crypto from 'crypto'
import fs from 'fs'


export const documentUpload = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    
    console.log('control reached document upload controller')

    const file = req.file

    if(!file) {
        throw new ApiError(400, "No file uploaded")
    }

    // generate hash for the file and log it
    const fileBuffer = fs.readFileSync(file.path)
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    console.log('file hash: ', fileHash)

    // change file name with hash and user id
    const userId  = req.user?.id
    if(!userId) {
        throw new ApiError(401, "Unauthorized, userId not found")
    }
    const filename = `${userId}_${fileHash}_${file.originalname}`
    console.log('filename: ', filename)

    // upload to imagekit.io
    console.log('UPLOADING TO IMAGEKIT.IO, WILL REACH OUT TO YOU IN SOME TIME :))')
    // create entry in db
    // return response

})