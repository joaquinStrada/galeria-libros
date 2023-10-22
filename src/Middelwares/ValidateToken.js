import jwt from 'jsonwebtoken'
import { config } from '../lib/config'
import { getPool } from '../lib/db'

export const validateRefreshToken = async (req, res, next) => {
	const header = req.header('Authorization')

	if (!header || !header.startsWith('Bearer ')) {
		// console.error(new Error('Invalid signature'))
		return res.status(401).json({
			error: true,
			message: 'Acceso denegado'
		})
	}

	try {
		const token = header.substring(7)

		// Validamos que el token exista
		const [ validToken ] = await getPool().query('SELECT * FROM `whiteList` WHERE refresh_token=?', [token])

		if (validToken.length == 0) {
			// console.error(new Error('Token is not exist'))
			return res.status(401).json({
				error: true,
				message: 'Acceso denegado'
			})
		}

		// Extraemos los datos del token
		const { userId } = jwt.verify(token, config.jwt.refreshSecret)

		// Verificamos y extraemos los datos del usuario
		const [ userDB ] = await getPool().query('SELECT id, create_time, full_name, email, username, image_user_50x50, image_user_300x300 FROM users WHERE id=?', [userId])

		if (userDB.length == 0) {
			// console.error(new Error('User is not exist'))
			return res.status(401).json({
				error: true,
				message: 'Acceso denagado'
			})
		}

		// Devolvemos los datos del usuario
		req.token = token
		req.user = userDB[0]
		next()
	} catch {
		// console.error(err)
		res.status(401).json({
			error: true,
			message: 'Acceso denegado'
		})
	}
}

export const validateToken = async (req, res, next) => {
	const header = req.header('Authorization')

	if (!header || !header.startsWith('Bearer')) {
		return res.status(401).json({
			error: true,
			message: 'Acceso denegado'
		})
	}

	try {
		const token = header.substring(7)

		// Validamos que el token exista
		const [ validToken ] = await getPool().query('SELECT * FROM `whiteList` WHERE access_token = ?', [token])
		
		if (validToken.length == 0) {
			return res.status(401).json({
				error: true,
				message: 'Acceso denegado'
			})
		}

		// Extraemos los datos del token
		const { userId } = jwt.verify(token, config.jwt.accessSecret)

		// Validamos el usuario
		const [ userDB ] = await getPool().query('SELECT id, create_time, full_name, email, username, image_user_50x50, image_user_300x300 FROM users WHERE id = ?', [userId])

		if (userDB.length == 0) {
			return res.status(401).json({
				error: true,
				message: 'Ha ocurrido un error'
			})
		}

		// devolvemos el usuario
		req.user = userDB[0]
		req.token = token
		next()
	} catch {
		res.status(401).json({
			error: true,
			message: 'Acceso denegado'
		})
	}
}