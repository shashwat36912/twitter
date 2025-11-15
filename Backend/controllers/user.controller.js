import Notification from "../models/notification.model.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";


export const getUserProfile = async (req, res) => {
	const { username } = req.params;

	try {
		const user = await User.findOne({ username }).select("-password");
		if (!user) return res.status(404).json({ message: "User not found" });

		res.status(200).json(user);
	} catch (error) {
		console.log("Error in getUserProfile: ", error.message);
		res.status(500).json({ error: error.message });
	}
};

export const followUnfollowUser = async (req, res) => {
	try {
		const { id } = req.params;
		const userToModify = await User.findById(id);
		const currentUser = await User.findById(req.user._id);

		if (id === req.user._id.toString()) {
			return res.status(400).json({ error: "You can't follow/unfollow yourself" });
		}

		if (!userToModify || !currentUser) return res.status(400).json({ error: "User not found" });

		const isFollowing = currentUser.following.includes(id);

		if (isFollowing) {
			// Unfollow the user
			await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
			await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });

			res.status(200).json({ message: "User unfollowed successfully" });
		} else {
			// Follow the user
			await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
			await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });
			// Send notification to the user
			const newNotification = new Notification({
				type: "follow",
				from: req.user._id,
				to: userToModify._id,
			});

			await newNotification.save();

			res.status(200).json({ message: "User followed successfully" });
		}
	} catch (error) {
		console.log("Error in followUnfollowUser: ", error.message);
		res.status(500).json({ error: error.message });
	}
};


export const getSuggestedUsers = async(req,res) => {
    try {
       const  userId = req.user._id;
       const userFollowedbyme = await User.findById(userId).select('following');

         const users = await User.aggregate([
            { $match: { _id: { $ne: userId}}},
            { $sample: { size: 10 }}
        ]);

        const filteredUsers = users.filter(user => !userFollowedbyme.following.includes(user._id));
        const limitedUsers = filteredUsers.slice(0, 4)
    	limitedUsers.forEach((user) => (user.password = null));
        res.status(200).json(limitedUsers);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const  updateUser = async (req, res) => {
    const { fullName, email, username,link,currentPassword,newPassword ,bio} = req.body;
        let { profileImg, coverImg } = req.body;
    try {
        let user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if((!newPassword && currentPassword )|| (!currentPassword && newPassword)){
            return res.status(400).json({ message: "Both current and new passwords are required to change password" });
        }

        if (newPassword && currentPassword) {
            const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordCorrect) {
                return res.status(400).json({ message: "Current password is incorrect" });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ message: "New password must be at least 6 characters long" });

            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }


        if (profileImg) {
            try {
                
                if (user.profileImg) {
                    const oldId = user.profileImg.split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(oldId);
                }

                if (typeof profileImg !== 'string' || profileImg.trim() === '') {
                    return res.status(400).json({ error: 'Invalid profileImg data' });
                }

                const uploadresponse = await cloudinary.uploader.upload(profileImg);
                profileImg = uploadresponse.secure_url;
            } catch (err) {
                console.error('Cloudinary profileImg upload error:', err);
                return res.status(400).json({ error: 'Profile image upload failed', details: err.message });
            }
        }

          if (coverImg) {
            try {
                if (user.coverImg) {
                    const oldCoverId = user.coverImg.split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(oldCoverId);
                }

                if (typeof coverImg !== 'string' || coverImg.trim() === '') {
                    return res.status(400).json({ error: 'Invalid coverImg data' });
                }

                const uploadedResponse = await cloudinary.uploader.upload(coverImg);
                coverImg = uploadedResponse.secure_url;
            } catch (err) {
                console.error('Cloudinary coverImg upload error:', err);
                return res.status(400).json({ error: 'Cover image upload failed', details: err.message });
            }
		}

        user.fullName = fullName || user.fullName;
        user.email = email || user.email;
        user.username = username || user.username;
        user.link = link || user.link;
        user.bio = bio || user.bio;
        user.profileImg = profileImg || user.profileImg;
        user.coverImg = coverImg || user.coverImg;
        user = await user.save();
        user.password = null;
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
