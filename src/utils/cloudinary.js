import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
	secure: true,
})

const uploadToCloudinary = async (localFilePath) => {
	try {
		if (!localFilePath) return null
		const cloudinary_response = await cloudinary.uploader.upload(
			localFilePath,
			{
				resource_type: 'auto',
			}
		)
		fs.unlinkSync(localFilePath)
		return cloudinary_response
	} catch (error) {
		console.log('Failed to upload at cloudinary ', error)
		fs.unlinkSync(localFilePath)
		return null
	}
}

export { uploadToCloudinary }
