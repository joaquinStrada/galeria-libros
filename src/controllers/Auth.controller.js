import { schemaLogin, schemaRegister, schemaUpdate } from '../joi/Auth.joi'
import { getPool } from '../lib/db'
import bcrypt from 'bcrypt'
import { config } from '../lib/config'
import uploadFile from '../lib/uploadFile'
import Jimp from 'jimp'
import path from 'path'
import fsExtra from 'fs-extra'
import { uploadFile as minioUploadFile, getFile, deleteFile } from '../lib/minio'
import generateToken from '../lib/generateToken'
import mime from 'mime-types'

export const register = async (req, res) => {
	const { fullName, email, username, password } = req.body
	
	// Validamos los campos
	const { error } = schemaRegister.validate({
		fullName,
		email,
		username,
		password
	})

	if (error) {
		return res.status(400).json({
			error: true,
			message: error.details[0].message
		})
	}

	try {
		// Verificamos que el email ni el username esten registrados
		const [ ValidEmail ] = await getPool().query('SELECT `email`, `username` FROM users WHERE `email` = ? OR `username` = ?', [email, username])
		
		if (ValidEmail.length > 0) {
			if (ValidEmail[0].email == email) {
				return res.status(400).json({
					error: true,
					message: 'Email ya registrado'
				})
			} else if (ValidEmail[0].username == username) {
				return res.status(400).json({
					error: true,
					message: 'Nombre de usuario ya registrado'
				})
			}
		}

		// Encriptamos la contraseña
		const salt = await bcrypt.genSalt(10)
		const passEncrypt = await bcrypt.hash(password, salt)
        
		// Insertamos el usuario
		const newUser = {
			full_name: fullName,
			email,
			username,
			pass_user: passEncrypt,
			image_user_50x50: '',
			image_user_300x300: ''
		}

		const newRow = await getPool().query('INSERT INTO users SET ?', [newUser])
		const userId = newRow[0].insertId

		// Subimos la foto de perfil
		if (req.files && req.files.image) {
			const { image } = req.files
			const ext = image.name.split('.').pop()
		
			if (!config.files.images.includes(ext)) {
				return res.status(400).json({
					error: true,
					message: 'El formato de la imagen no esta soportado'
				})
			}

			// Guardamos la imagen en nuestro servidor
			const pathImage = await uploadFile(image, config.files.storeImages)
			const imageUser50x50 = `${userId}_50x50.${ext}`
			const imageUser300x300 = `${userId}_300x300.${ext}`
			const pathImageUser50x50 = path.join(config.files.storeImages, imageUser50x50)
			const pathImageUser300x300 = path.join(config.files.storeImages, imageUser300x300)

			// Redimensionamos la imagen
			const Image = await Jimp.read(pathImage)
			await Image.resize(50, 50).writeAsync(pathImageUser50x50)
			await Image.resize(300, 300).writeAsync(pathImageUser300x300)

			// Subimos la imagen al servidor de minio
			await minioUploadFile(`profiles/${imageUser50x50}`, pathImageUser50x50)
			await minioUploadFile(`profiles/${imageUser300x300}`, pathImageUser300x300)

			// Eliminamos todos los archivos
			await fsExtra.unlink(pathImage)
			await fsExtra.unlink(pathImageUser50x50)
			await fsExtra.unlink(pathImageUser300x300)

			// Actualizamos la base de datos con los perfiles del usuario
			const editUser = {
				image_user_50x50: imageUser50x50,
				image_user_300x300: imageUser300x300
			}

			await getPool().query('UPDATE users SET ? WHERE id=?', [editUser, userId])
		}

		// Generamos el token
		const data = await generateToken(userId)

		res.header('Authorization', `Bearer ${data.accessToken}`).json({
			error: false,
			data
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			error: true,
			message: 'Ha ocurrido un error'
		})
	}
}

export const login = async (req, res) => {
	const { user, password } = req.body

	// Validamos los campos
	const { error } = schemaLogin.validate({
		user,
		password
	})

	if (error) {
		return res.status(400).json({
			error: true,
			message: error.details[0].message
		})
	}

	try {
		// Validamos que el usuario exista
		const [ userDB ] = await getPool().query('SELECT id, email, username, pass_user FROM users WHERE email = ? OR username = ?', [user, user])
		
		if (userDB.length === 0 || (userDB[0].email !== user && userDB[0].username !== user)) {
			return res.status(400).json({
				error: true,
				message: 'Usuario y/o contraseña incorrectos'
			})
		}

		// Validamos la contraseña
		const validPass = await bcrypt.compare(password, userDB[0].pass_user)

		if (!validPass) {
			return res.status(400).json({
				error: true,
				message: 'Usuario y/o contraseña incorrectos'
			})
		}

		// Generamos el token del usuario
		const data = await generateToken(userDB[0].id)

		res.header('Authorization', `Bearer ${data.accessToken}`).json({
			error: false,
			data
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			error: true,
			message: 'Ha ocurrido un error'
		})
	}
}

export const refresh = async (req, res) => {
	const { user, token } = req

	try {
		// Eliminamos el token
		await getPool().query('DELETE FROM `whiteList` WHERE refresh_token = ?', [token])

		// Generamos el nuevo token
		const data = await generateToken(user.id)

		res.header('Authorization', `Bearer ${data.accessToken}`).json({
			error: false,
			data
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			error: true,
			message: 'Ha ocurrido un error'
		})
	}
}

export const getUser = (req, res) => res.json({
	error: false,
	data: req.user
})

export const getImage = async (req, res) => {
	const { imageName } = req.params
	const { id: userId } = req.user

	try {
		// Validamos que la imagen sea nuestra
		const [ userDB ] = await getPool().query('SELECT id, image_user_50x50, image_user_300x300 FROM users WHERE id = ?', [userId])

		if (userDB.length === 0 || (userDB[0].image_user_50x50 !== imageName && userDB[0].image_user_300x300 !== imageName)) {
			return res.status(400).json({
				error: true,
				message: 'Imagen no encontrada'
			})
		}

		// Recuperamos la imagen
		const result = await getFile(`profiles/${imageName}`)

		// Devolvemos la imagen
		const ext = path.extname(imageName)
		res.header('content-type', mime.lookup(ext)) // Con esta cabecera indicamos el tipo de contenido
		res.header('accept-ranges', 'bytes') // Con esta cabecera indicamos que vamos enviar un stream de bytes

		result.Body.on('data', chunk => {
			res.write(chunk)
		})

		result.Body.on('error', err => {
			console.error(err)
			res.status(500).json({
				error: true,
				message: 'Ha ocurrido un error'
			})
		})
		
		result.Body.on('end', () => {
			res.end()
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			error: true,
			message: 'Ha ocurrido un error'
		})
	}
}

export const updateUser = async (req, res) => {
	const { fullName, email, username, password } = req.body
	const { id: userId } = req.user

	// Validamos los campos
	const { error } = schemaUpdate.validate({
		fullName,
		email,
		username,
		password
	})

	if (error) {
		return res.status(400).json({
			error: true,
			message: error.details[0].message
		})
	}

	try {
		// validamos que el email ni el username pertenezcan a otro usuario
		const [ isValid ] = await getPool().query('SELECT id, email, username FROM users WHERE email = ? OR username = ?', [email, username])

		if (isValid.length > 0 && isValid[0].id !== userId) {
			if (isValid[0].email === email) {
				return res.status(400).json({
					error: true,
					message: 'Email ya registrado'
				})
			} else if (isValid[0].username === username) {
				return res.status(400).json({
					error: true,
					message: 'Nombre de usuario ya registrado'
				})
			}
		}

		// Actualizamos al usuario
		const editUser = {
			full_name: fullName,
			email,
			username
		}

		// Encriptamos la contraseña si nos la mandaron
		if (password) {
			const salt = await bcrypt.genSalt(10)
			editUser.pass_user = await bcrypt.hash(password, salt)
		}

		// Subimos la foto de perfil
		if (req.files && req.files.image) {
			const { image } = req.files
			const ext = image.name.split('.').pop()
		
			if (!config.files.images.includes(ext)) {
				return res.status(400).json({
					error: true,
					message: 'El formato de la imagen no esta soportado'
				})
			}

			// Guardamos la imagen en nuestro servidor
			const pathImage = await uploadFile(image, config.files.storeImages)
			const imageUser50x50 = `${userId}_50x50.${ext}`
			const imageUser300x300 = `${userId}_300x300.${ext}`
			const pathImageUser50x50 = path.join(config.files.storeImages, imageUser50x50)
			const pathImageUser300x300 = path.join(config.files.storeImages, imageUser300x300)

			// Redimensionamos la imagen
			const Image = await Jimp.read(pathImage)
			await Image.resize(50, 50).writeAsync(pathImageUser50x50)
			await Image.resize(300, 300).writeAsync(pathImageUser300x300)

			// Eliminamos las imagenes del servidor de minio
			await deleteFile(`profiles/${req.user.image_user_50x50}`)
			await deleteFile(`profiles/${req.user.image_user_300x300}`)

			// Subimos la imagen al servidor de minio
			await minioUploadFile(`profiles/${imageUser50x50}`, pathImageUser50x50)
			await minioUploadFile(`profiles/${imageUser300x300}`, pathImageUser300x300)

			// Eliminamos todos los archivos
			await fsExtra.unlink(pathImage)
			await fsExtra.unlink(pathImageUser50x50)
			await fsExtra.unlink(pathImageUser300x300)

			// Actualizamos la base de datos con los perfiles del usuario
			editUser.image_user_50x50 = imageUser50x50
			editUser.image_user_300x300 = imageUser300x300
		}

		// Actualizamos el usuario
		await getPool().query('UPDATE users SET ? WHERE id=?', [editUser, userId])

		// Devolvemos el usuario
		const [ userDB ] = await getPool().query('SELECT id, create_time, full_name, email, username, image_user_50x50, image_user_300x300 FROM users WHERE id = ?', [userId])

		res.json({
			error: true,
			data: userDB[0]
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			error: true,
			message: 'Ha ocurrido un error'
		})		
	}
}