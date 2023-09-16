import { config } from './config'
import { getPool } from './db'
import jwt from 'jsonwebtoken'

const generateToken = async userId => {
	const expiresInAccessToken = 2 * 60 * 1000
	const expiresInRefreshToken = 30 * 24 * 60 * 60 * 1000

	// Generamos el token
	const refreshToken = jwt.sign({
		userId
	}, config.jwt.refreshSecret, {
		expiresIn: `${expiresInRefreshToken}ms`
	})

	const accessToken = jwt.sign({
		userId
	}, config.jwt.accessSecret, {
		expiresIn: `${expiresInAccessToken}ms`
	})

	// Guardamos los tokens en la BD
	const newTokenValid = {
		refresh_token: refreshToken,
		access_token: accessToken,
		user_id: userId
	}

	await getPool().query('INSERT INTO whiteList SET ?', [newTokenValid])

	// Devolvemos el token
	return {
		refreshToken,
		accessToken,
		expiresInRefreshToken,
		expiresInAccessToken
	}
}

export default generateToken