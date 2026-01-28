import express, { urlencoded } from "express";
import cors from 'cors'
import { ExpressAuth } from "@auth/express";
import GitHub from '@auth/express/providers/github';
import Google from '@auth/express/providers/google';

const app = express()

app.use(express.json())
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(urlencoded({extended: true}))

app.set("trust proxy", true)
app.use("/auth", ExpressAuth({
    providers: [GitHub, Google]
}))

export default app