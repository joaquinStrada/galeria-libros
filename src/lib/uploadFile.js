import path from 'path'
import fs from 'fs'
import { v4 as uuid } from 'uuid'

const uploadFile = (file, storePath) => {
	const fileName = uuid() + path.extname(file.name)
	const filePath = path.join(storePath, fileName)

	return new Promise((res, rej) => {
		fs.promises.access(filePath)
			.then(() => rej(new Error(`El archivo ${fileName} ya existe.`)))
			.catch(() => file.mv(filePath, err => {
				if (err) {
					rej(err)
				} else {
					res(filePath)
				}
			}))
	})
}

export default uploadFile