import ImageKit from "@imagekit/nodejs"
import ApiError from "./apiError.js"
import fs from 'fs'
import { prisma } from "../lib/prisma.js"

export const deleteLocalFile = (file: Express.Multer.File) => {
    fs.unlink(file.path, (err) => {
        if(err) console.log('error deleting local file, in imagekit upload handler : ', err)
        else console.log('local file deleted successfully from imagekit upload handler')
    })
}

export const uploadToImagekit = async (file: Express.Multer.File, fileHash: string) => {

    const imageKitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY

    if(!imageKitPrivateKey ) {
        console.log(imageKitPrivateKey)
        throw new ApiError(500, 'imagekit credentials not found')
    }

    const client = new ImageKit({
        privateKey: imageKitPrivateKey
    })


    if(!file) {
        console.log(file)
        throw new ApiError(413, 'file not uploaded, in imagekit upload handler')
    }

    // check if the file is already present in database
    const fileExists = await prisma.document.findUnique({
        where: {
            documentHash: fileHash
        }
    })

    if(fileExists) {
        // deleting file from local path
        // returning the db response

        deleteLocalFile(file)
        return fileExists
    }

    const fileName = file?.filename

    const response = await client.files.upload({
        file: fs.createReadStream(file.path),
        fileName: fileName
    })

    return response
}