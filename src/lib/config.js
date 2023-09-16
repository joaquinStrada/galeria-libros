import { config as dotenv } from 'dotenv'
import path from 'path'
dotenv()

export const config = {
	express: {
		port: process.env.PORT || 3000
	},
	mysql: {
		host: process.env.DB_HOST || 'localhost',
		port: process.env.DB_PORT || 3306,
		user: process.env.DB_USER || 'root',
		password: process.env.DB_PASS || '',
		database: process.env.DB_NAME || 'galeria'
	},
	files: {
		images: ['jpg', 'jpeg', 'gif', 'png', 'bmp'],
		storeImages: path.join(__dirname, '../public/images')
	},
	minio: {
		region: process.env.MINIO_REGION || '',
		endPoint: process.env.MINIO_HOST || 'http://localhost:9000',
		accessKey: process.env.MINIO_ACCESS_KEY || '',
		secretKey: process.env.MINIO_SECRET_KEY || '',
		bucketName: process.env.MINIO_BUCKET_NAME || 'libros',
	},
	jwt: {
		accessSecret: process.env.JWT_ACCESS_SECRET || '',
		refreshSecret: process.env.JWT_REFRESH_SECRET || ''
	}
}