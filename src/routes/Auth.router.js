import { Router } from 'express'
import fileUpload from 'express-fileupload'
import { getImage, getUser, login, refresh, register, updateUser } from '../controllers/Auth.controller'
import { validateRefreshToken, validateToken } from '../Middelwares/ValidateToken'

const router = Router()

router.post('/register', fileUpload(), register)

router.post('/login', login)

router.post('/refresh', validateRefreshToken, refresh)

router.get('/', validateToken, getUser)

router.get('/image/:imageName', validateToken, getImage)

router.put('/update', fileUpload(), validateToken, updateUser)

export default router