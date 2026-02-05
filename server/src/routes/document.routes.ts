import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router()

router
    .route('/upload')
    .post(
        authMiddleware,
        // multer middleware
        // zod validation
        // upload to imagekit.io
        // create entry in db
        // return response
    )

export default router