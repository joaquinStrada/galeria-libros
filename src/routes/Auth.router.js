import { Router } from 'express'
import fileUpload from 'express-fileupload'
import { login, register } from '../controllers/Auth.controller'

const router = Router()

router.post('/register', fileUpload(), register)

router.post('/login', login)

export default router