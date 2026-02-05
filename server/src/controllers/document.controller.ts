import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import crypto from 'crypto'
import fs from 'fs'


export const documentUpload = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    
    console.log('\n \n control reached document upload controller \n \n ')

    const file = req.file

    if(!file) {
        throw new ApiError(400, "No file uploaded")
    }

    // generate hash for the file and log it
    const fileBuffer = fs.readFileSync(file.path)
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    console.log('file hash: ', fileHash)

    // change file name with hash and user id
    const userEmail  = req.user?.email
    if(!userEmail) {
        console.log('\n \n req.user: ', req.user)
        throw new ApiError(401, "Unauthorized, userEmail not found")
    }
    const filename = `${userEmail}_${fileHash}_${file.originalname}`
    console.log('\n filename: \n \n ', filename)

    // upload to imagekit.io
    console.log('\n \n UPLOADING TO IMAGEKIT.IO, WILL REACH OUT TO YOU IN SOME TIME :)) \n \n ')

    res.json({
        message: "file uploaded successfully"
    })
    // create entry in db
    // return response

})