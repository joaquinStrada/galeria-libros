import { createPool } from 'mysql2/promise'
import { config } from './config'

let pool = null

export const createConection =  () => {
	try {
		pool = createPool(config.mysql)
		console.log('DB is connected to', config.mysql.host)
	} catch (err) {
		if (err.code === 'PROTOCOL_CONNECTION_LOST') {
			console.error('Database connection was closed.')
		} else if (err.code === 'ER_CON_COUNT_ERROR') {
			console.error('Database has to many connections')
		} else if (err.code === 'ECONNREFUSED') {
			console.error('Database connection was refused')
		} else {
			console.error(err.message || 'Ocurrio un error al intentar conectarnos a la BD')
		}
	}
}

export const getPool = () => pool