import dotenv from 'dotenv'
dotenv.config()
import express from "express";
import { ExpressAuth } from "@auth/express";
import GitHub from '@auth/express/providers/github';
import Google from '@auth/express/providers/google';

const app = express()

app.set("trust proxy", true)
app.use("/auth", ExpressAuth({
    providers: [GitHub, Google]
}))

app.listen(3000, () => {
    console.log('app is listening on port 3000')
})