import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { config } from './config'

import fs from 'fs'

export const Client = new S3Client({
	region: config.minio.region,
	endpoint: config.minio.endPoint,
	forcePathStyle: true,
	credentials: {
		accessKeyId: config.minio.accessKey,
		secretAccessKey: config.minio.secretKey
	}
})

export const uploadFile = async (filename, filepath) => {
	const stream = fs.createReadStream(filepath)
	const uploadParams = {
		Bucket: config.minio.bucketName,
		Key: `profiles/${filename}`,
		Body: stream
	}
	const command = new PutObjectCommand(uploadParams)
	return Client.send(command)
}