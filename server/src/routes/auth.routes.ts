import { Router } from "express";
import { getUserSession, registerUser } from "../controllers/auth.controller.js";
        
const router = Router()

router.route('/session').get(getUserSession)
router.route('/register').post(registerUser)

export default router