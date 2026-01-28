import dotenv from 'dotenv'
dotenv.config()
import { prisma } from './lib/prisma.js'
import app from './app.js'

const PORT = process.env.PORT || 3000

prisma.$connect()
.then( () => {
    console.log("Database connected")

    app.listen(PORT, () => {
        console.log('app is listening on port', PORT)
    })
}).catch((error) => {
    console.log("Database connection failed", error)
})