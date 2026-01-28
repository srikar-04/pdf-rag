import express from "express";
import { ExpressAuth } from "@auth/express";
import GitHub from '@auth/express/providers/github';
import Google from '@auth/express/providers/google';

const app = express()

app.set("trust proxy", true)
app.use("/auth", ExpressAuth({
    providers: [GitHub, Google]
}))

export default app