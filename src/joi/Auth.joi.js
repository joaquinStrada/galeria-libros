import Joi from 'joi'

export const schemaRegister = Joi.object({
	fullName: Joi.string().min(6).max(100).required(),
	email: Joi.string().min(10).max(400).email().required(),
	username: Joi.string().min(6).max(50).required(),
	password: Joi.string().min(6).max(20).required()
})

export const schemaLogin = Joi.object({
	user: Joi.string().min(6).max(400).required(),
	password: Joi.string().min(6).max(20).required()
})