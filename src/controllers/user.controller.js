import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import generateAccessAndRefreshTokens from '../utils/tokenGenerator.js'
import { uploadToCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { User } from '../models/user.model.js'
import jwt from 'jsonwebtoken'

const registerUser = asyncHandler(async (req, res) => {
	const { username, fullname, email, password } = req.body
	if (
		[username, fullname, email, password].some(
			(field) => field === undefined || field?.trim() === ''
		)
	) {
		throw new ApiError(400, 'All fields are required')
	}
	const existedUser = await User.findOne({
		$or: [{ username }, { email }],
	})

	if (existedUser) {
		throw new ApiError(409, 'User with email or username already exists!!!')
	}

	const avatarLocalpath = req.files?.avatar[0]?.path
	const coverImageLocalpath = req.files?.coverImage[0]?.path

	if (!avatarLocalpath) {
		throw new ApiError(400, 'Avatar Image is required')
	}

	const avatar = await uploadToCloudinary(avatarLocalpath)
	const coverImage = await uploadToCloudinary(coverImageLocalpath)
	if (!avatar) {
		throw new ApiError(500, 'Avatar Image upload failed!!!')
	}
	const user = await User.create({
		username,
		fullname,
		email,
		password,
		avatar: avatar.url,
		coverImage: coverImage?.url || '',
	})

	const createdUser = await User.findById(user._id).select(
		'-password -refreshToken'
	)

	if (!createdUser) {
		throw new ApiError(500, 'Error while creating user!!!')
	}

	res
		.status(201)
		.json(new ApiResponse(201, createdUser, 'User created successfully!!'))
})

const loginUser = asyncHandler(async (req, res) => {
	const { username, email, password } = req.body

	if (!(username || email)) {
		// username or email is sufficient...for both email and username use !username && !email
		throw new ApiError(400, 'Username or Email is required!!')
	}
	const existingUser = await User.findOne({
		$or: [{ username }, { email }],
	})

	if (!existingUser) {
		throw new ApiError(404, 'User doesnot exist')
	}
	const isPasswordCorrect = await existingUser.isPasswordCorrect(password)
	if (!isPasswordCorrect) {
		throw new ApiError(401, 'Invalid User credentials')
	}
	// const accessToken = existingUser.generateAccessToken()
	// const refreshToken = existingUser.generateRefreshToken()
	// existingUser.refreshToken = refreshToken
	// try {
	// 	await existingUser.save({ validateBeforeSave: false })
	// } catch (err) {
	// 	throw new ApiError(500, 'Could not generate access and refresh Tokens')
	// }
	const { accessToken, refreshToken } =
		await generateAccessAndRefreshTokens(existingUser)
	const LoggedInUser = await User.findById(existingUser._id).select(
		'-password -refreshToken'
	)

	const cookieOptions = {
		httpOnly: true,
		secure: true,
	}
	return res
		.status(200)
		.cookie('accessToken', accessToken, cookieOptions)
		.cookie('refreshToken', refreshToken, cookieOptions)
		.json(
			new ApiResponse(
				200,
				{ user: LoggedInUser, accessToken, refreshToken },
				'User Logged in successfully'
			)
		)
})

const updatePassword = asyncHandler(async (req, res) => {
	const { oldPassword, newPassword } = req.body
	try {
		const user = await User.findById(req.user?._id)
		const isPasswordValid = await user.isPasswordCorrect(oldPassword)
		if (!isPasswordValid) {
			throw new ApiError(400, 'incorrect old password!!')
		}
		user.password = newPassword
		await user.save({ validateBeforeSave: false })
		return res
			.status(200)
			.json(new ApiResponse(200, {}, 'password updated successfully'))
	} catch (error) {
		throw new ApiError(
			500,
			error?.message || 'Failed to save new password to MongoDB!!'
		)
	}
})

const logoutUser = asyncHandler(async (req, res) => {
	try {
		await User.findByIdAndUpdate(
			req.user._id,
			{
				$set: {
					refreshToken: '',
				},
			},
			{
				new: true,
			}
		)

		const cookieOptions = {
			httpOnly: true,
			secure: true,
		}
		return res
			.status(200)
			.clearCookie('accessToken', cookieOptions)
			.clearCookie('refreshToken', cookieOptions)
			.json(new ApiResponse(200, {}, 'User logged out successfully'))
	} catch (err) {
		throw new ApiError(500, err?.message || 'Server problem.Please try again!!')
	}
})

const refreshAccessToken = asyncHandler(async (req, res) => {
	try {
		const incomingRefreshToken =
			req.cookies?.refreshToken || req.body.refreshToken
		if (!incomingRefreshToken) {
			throw new ApiError(401, 'Unauthorized request')
		}
		const decodedToken = jwt.verify(
			incomingRefreshToken,
			process.env.REFRESH_TOKEN_SECRET
		)
		const user = await User.findById(decodedToken?._id)
		if (!user) {
			throw new ApiError(401, 'invalid refresh token')
		}
		if (incomingRefreshToken !== user?.refreshToken) {
			throw new ApiError(401, 'refresh token is expired or used')
		}
		const { accessToken, newRefreshToken } =
			await generateAccessAndRefreshTokens(user)

		const cookieOptions = {
			httpOnly: true,
			secure: true,
		}
		return res
			.status(200)
			.cookie('accessToken', accessToken, cookieOptions)
			.cookie('refreshToken', newRefreshToken, cookieOptions)
			.json(
				new ApiResponse(
					200,
					{ accessToken, refreshToken: newRefreshToken },
					'Refreshed access token successfully'
				)
			)
	} catch (err) {
		throw new ApiError(401, err?.message || 'Invalid Refresh Token!!')
	}
})

export {
	registerUser,
	loginUser,
	updatePassword,
	logoutUser,
	refreshAccessToken,
}
