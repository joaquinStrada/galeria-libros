import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
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

export const uploadFile = async (pathFile, filePath) => {
	const stream = fs.createReadStream(filePath)
	const uploadParams = {
		Bucket: config.minio.bucketName,
		Key: pathFile,
		Body: stream
	}
	const command = new PutObjectCommand(uploadParams)
	return Client.send(command)
}

export const getFile = async filePath => {
	const command = new GetObjectCommand({
		Bucket: config.minio.bucketName,
		Key: filePath
	})

	return Client.send(command)
}

export const deleteFile = async filePath => {
	const command = new DeleteObjectCommand({
		Bucket: config.minio.bucketName,
		Key: filePath
	})

	return Client.send(command)
}