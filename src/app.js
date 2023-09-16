import express from 'express'
import { config } from './lib/config'
import morgan from 'morgan'

import authRouter from './routes/Auth.router'

const app = express()

// Settings
app.set('port', config.express.port)

// Middelwares
app.use(morgan('dev'))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

// Routes
app.use('/api/auth', authRouter)

// Exporting
export default app