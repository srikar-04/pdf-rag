import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import crypto from 'crypto'
import fs from 'fs'
import ImageKit from "@imagekit/nodejs";
import { uploadToImagekit } from "../utils/uploadToImagekit.js";
import type { Document } from "../generated/prisma/client.js";
import ApiResponse from "../utils/apiResponse.js";
import { prisma } from "../lib/prisma.js";


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
    // create entry in db
    // return response

    const imageKitResponse: ImageKit.FileUploadResponse | Document = await uploadToImagekit(file, fileHash)

    console.log('\n \n Imagekit response / document response : ', imageKitResponse, '\n \n ')

    if("fileId" in imageKitResponse) {
        // response is defenitely from imagekit cause fileId is only present in the imagekit response

        fs.unlink(file.path, (err) => {
            if(err) console.log('error deleting local file : ', err)
            else console.log('Local file deleted successfully')
        })
    } else {
        console.log('response is the already existed document: ', imageKitResponse)
        return res.json(new ApiResponse(200, imageKitResponse, 'document already exists'))
    }

// create a new db entry

    // finding the id of the user
    if(!req.user?.email) {
        console.log("\n \n req.user in upload document controller: ", req.user)
        throw new ApiError(401, 'user email not found in upload document controller')
    }

    const existingUser = await prisma.user.findUnique({
        where: {
            email: req.user.email
        }
    })

    if(!existingUser) {
        console.log('user not found in document upload controller')
        throw new ApiError(401, 'user not found in upload document controller')
    }

    if(!imageKitResponse.url) {
        console.log('imagekit response : ', imageKitResponse)
        throw new ApiError(500, 'imagekit response url not found')
    }
    
    const documentEntry = await prisma.document.create({
        data: {
            documentName: filename,
            documentHash: fileHash,
            documentStatus: "processing",
            storagePath: imageKitResponse.url,
            userId: existingUser.id
        }
    })

    if(!documentEntry) {
        console.log('document entry not created in document upload controller')
        throw new ApiError(500, 'document entry not created in document upload controller')
    }

    res.json(new ApiResponse(200, {imageKitResponse, documentEntry}, 'file uploaded successfully'))

})