import bcrypt from 'bcryptjs'
import User from '../models/user.model.js'
import jwt from 'jsonwebtoken'


export const signup = async (req, res) => {

    try {
        const { fullName, username, email, password } = req.body || {}
       
        if (!fullName || !username || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' })
        }
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format" })
        }
        const existingUser = await User.findOne({username})
        if (existingUser) {
            return res.status(409).json({ message: "Username already exists" })
        }

        const existingEmail = await User.findOne({email})
        if (existingEmail) {
            return res.status(409).json({ message: "Email already exists" })
        }
        const hashedPassword = await bcrypt.hash(password, 10)

        const newUser = new User({
            fullName,
            username,
            email,
            password: hashedPassword
        })

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not set in environment');
            return res.status(500).json({ message: 'Server misconfiguration: JWT secret missing' });
        }
        const token = jwt.sign(
            { userId: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        
        const cookieOptions = {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        }

        await newUser.save()
        res.cookie('token', token, cookieOptions)

       res.status(201).json({
				_id: newUser._id,
				fullName: newUser.fullName,
				username: newUser.username,
				email: newUser.email,
				followers: newUser.followers,
				following: newUser.following,
				profileImg: newUser.profileImg,
				coverImg: newUser.coverImg,
			});

    } catch (error) {
        console.error('Error in signup controller:', error);
        return res.status(500).json({ message: "Internal server error" })
    }

}
export const login = async (req, res) => {
	try {
        const { username, password } = req.body || {}
        if (!username || !password) {
            return res.status(400).json({ error: 'Missing username or password' })
        }
		const user = await User.findOne({ username });
        const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

		if (!user || !isPasswordCorrect) {
			return res.status(400).json({ error: "Invalid username or password" });
		}

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not set in environment');
            return res.status(500).json({ error: 'Server misconfiguration: JWT secret missing' });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
        const cookieOptions = {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        }
        res.cookie('token', token, cookieOptions)

		res.status(200).json({
			_id: user._id,
			fullName: user.fullName,
			username: user.username,
			email: user.email,
			followers: user.followers,
			following: user.following,
			profileImg: user.profileImg,
			coverImg: user.coverImg,
		});
    } catch (error) {
        console.error("Error in login controller", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
export const logout = (req, res) => {
    const cookieOptions = {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    }
    res.clearCookie('token', cookieOptions)
    res.status(200).json({ message: 'Logged out successfully' })
};

export const getMe = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'Unauthorized' })
        }
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            followers: user.followers,
            following: user.following,
            profileImg: user.profileImg,
            coverImg: user.coverImg,
        });
    } catch (error) {
        console.error('Error in getMe:', error.message)
        return res.status(500).json({ message: 'Internal server error' })
    }
}