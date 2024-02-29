const generateAccessAndRefreshTokens = async (user) => {
	try {
		const accessToken = user.generateAccessToken()
		const refreshToken = user.generateRefreshToken()
		user.refreshToken = refreshToken
		await user.save({ validateBeforeSave: false })
		return { accessToken, refreshToken }
	} catch (err) {
		throw new ApiError(500, 'Couldnot generate access and refresh Tokens')
	}
}

export default generateAccessAndRefreshTokens
