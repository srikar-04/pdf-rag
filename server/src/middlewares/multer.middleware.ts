import type { Request } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'

const TEMP_UPLOAD_DIR = path.join(process.cwd(), 'public', 'temp');

const storage = multer.diskStorage({

    // first argument in both cb functions are error arguments
    
    destination: function(req, file, cb) {
        if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
            fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
        }
        cb(null, TEMP_UPLOAD_DIR)
    },

    filename: function(req: Request, file: Express.Multer.File, cb) {
        /* 
            2nd argument is filename, which i have to create in this format

            IMP: LATE CHANGE FILNAME USING FILE HASH

            -> userId_timestamp_random_originalName.format <-
        */

        const userId = req.user?.id
        const timestamp = Date.now();
        const random = crypto.randomBytes(6).toString("hex");

        const ext = path.extname(file.originalname);
        const baseName = path
        .basename(file.originalname, ext)
        .replace(/\s+/g, "_");

        const filename = `${userId}_${timestamp}_${random}_${baseName}${ext}`; 
            
        cb(null, filename)
    }
})

export const upload = multer({storage})
