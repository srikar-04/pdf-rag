import ImageKit from "@imagekit/nodejs"
import ApiError from "./apiError.js"
import fs from 'fs'
import { prisma } from "../lib/prisma.js"

const IMAGEKIT_UPLOAD_TIMEOUT_MS = 90_000;

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

    try {
        const response = await new Promise<any>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new ApiError(504, 'Image upload timed out. Please retry.'));
            }, IMAGEKIT_UPLOAD_TIMEOUT_MS);

            client.files.upload({
                file: fs.createReadStream(file.path),
                fileName: fileName
            })
            .then((result) => {
                clearTimeout(timer);
                resolve(result);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
        });

        return response
    } catch (error: any) {
        if (error instanceof ApiError) {
            throw error;
        }

        console.error('imagekit upload failed:', error);
        throw new ApiError(502, 'Upload service is temporarily unavailable. Please try again.');
    }
}
