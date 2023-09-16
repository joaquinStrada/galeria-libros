import { schemaLogin, schemaRegister } from '../joi/Auth.joi'
import { getPool } from '../lib/db'
import bcrypt from 'bcrypt'
import { config } from '../lib/config'
import uploadFile from '../lib/uploadFile'
import Jimp from 'jimp'
import path from 'path'
import fsExtra from 'fs-extra'
import { uploadFile as minioUploadFile } from '../lib/minio'
import generateToken from '../lib/generateToken'

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
			await minioUploadFile(imageUser50x50, pathImageUser50x50)
			await minioUploadFile(imageUser300x300, pathImageUser300x300)

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