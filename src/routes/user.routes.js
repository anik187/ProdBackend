import { Router } from 'express'
import {
	loginUser,
	registerUser,
	logoutUser,
	refreshAccessToken,
	updatePassword,
} from '../controllers/user.controller.js'
import { Upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'

const router = Router()

router.route('/register').post(
	Upload.fields([
		{
			name: 'avatar',
			maxCount: 1,
		},
		{
			name: 'coverImage',
			maxCount: 1,
		},
	]),
	registerUser
)

router.route('/login').post(loginUser)

// protected routes

router.route('/updatePassword').patch(verifyJWT, updatePassword)
router.route('/logout').get(verifyJWT, logoutUser)
router.route('/refreshAccessToken').post(refreshAccessToken)

export default router
