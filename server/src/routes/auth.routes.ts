import { Router } from "express";
import { getUserSession } from "../controllers/auth.controller.js";
        
const router = Router()

router.route('/session').get(getUserSession)

export default router