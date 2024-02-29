import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

app.use(
	cors({
		origin: process.env.CORS_ORIGIN,
		credentials: true,
	})
)

app.use(express.json({ limit: '16kb' })) // json parsing
app.use(express.urlencoded({ extended: true, limit: '16kb' })) // url
app.use(express.static('public')) // assets folder
app.use(cookieParser())

// import routers
import userRouter from './routes/user.routes.js'

app.use('/api/v1/users', userRouter) // http:localhost:8000/api/v1/users/register

export { app }
