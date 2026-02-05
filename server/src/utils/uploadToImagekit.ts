import ImageKit from "@imagekit/nodejs"
import ApiError from "./apiError.js"
import fs from 'fs'

export const uploadToImagekit = async (file: Express.Multer.File) => {

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

    const fileName = file?.filename

    const response = await client.files.upload({
        file: fs.createReadStream(file.path),
        fileName: fileName
    })

    return response
}