import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { v2 as cloudinary } from 'cloudinary';

export const createPost = async (req, res) => {
    try {
        const { text } = req.body;
    let { img, video } = req.body;
        let userId = req.user._id.toString();
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!text && !img && !video) {
            return res.status(400).json({ error: 'Post must have text, image or video' });
        }
        // Upload image if provided
        if (img) {
            try {
                if (typeof img !== 'string' || img.trim() === '') {
                    return res.status(400).json({ error: 'Invalid image data' });
                }
                const uploadResponse = await cloudinary.uploader.upload(img);
                img = uploadResponse.secure_url;
            } catch (uploadErr) {
                console.error('Cloudinary upload error (createPost - img):', uploadErr);
                return res.status(400).json({ error: 'Image upload failed', details: uploadErr.message });
            }
        }

        
    if (video) {
            try {
                if (typeof video !== 'string' || video.trim() === '') {
                    return res.status(400).json({ error: 'Invalid video data' });
                }
       
        const uploadResponse = await cloudinary.uploader.upload(video, { resource_type: 'video', chunk_size: 6000000 });
        video = uploadResponse.secure_url;
            } catch (uploadErr) {
                console.error('Cloudinary upload error (createPost - video):', uploadErr);
                return res.status(400).json({ error: 'Video upload failed', details: uploadErr.message });
            }
        }

        const newPost = new Post({
            text,
            img,
            video,
            user: userId,
        });

        await newPost.save();
        res.status(201).json({ message: 'Post created successfully', post: newPost });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export  const deletePost = async (req, res) => {
    try {
        const post= await Post.findById(req.params.id);
        if(!post){
            return res.status(404).json({message: "Post not found"});
        }
        if(post.user.toString() !== req.user._id.toString()){
            return res.status(403).json({message: "Unauthorized"});
        }
        
        if (post.img) {
            try {
                const imgId = post.img.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(imgId);
            } catch (err) {
                console.error('Cloudinary delete error (img):', err);
            }
        }

        
        if (post.video) {
            try {
                const vidId = post.video.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(vidId, { resource_type: 'video' });
            } catch (err) {
                console.error('Cloudinary delete error (video):', err);
            }
        }

        await Post.findByIdAndDelete(req.params.id);
        res.status(200).json({message: "Post deleted successfully"});

    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Internal server error"});
    }
}

export const commentOnPost = async (req, res) => {
    try {
        const {text} = req.body;
        const postId = req.params.id;
        const userId = req.user._id
        
        if(!text){
            return res.status(400).json({message: "Comment text is required"});
        }
        const post = await Post.findById(postId);
        if(!post){
            return res.status(404).json({message: "Post not found"});
        }
        const comment = {user: userId, text}
        post.comments.push(comment);
        await post.save();
        // populate the newly updated post so client gets user objects for comments
        const populatedPost = await Post.findById(postId)
            .populate({ path: 'user', select: '-password' })
            .populate({ path: 'comments.user', select: '-password' });
        // Create notification for post owner if commenter is not the owner
        try {
            if (post.user.toString() !== userId.toString()) {
                const notification = new Notification({
                    from: userId,
                    to: post.user,
                    type: 'comment',
                });
                await notification.save();
            }
        } catch (notifErr) {
            console.error('Error saving comment notification:', notifErr);
            // non-fatal - continue
        }

        res.status(200).json({ message: "Comment added successfully", comment, post: populatedPost });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Internal server error"});
    }
}

export const getCommentsForPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId).populate({ path: 'comments.user', select: '-password' });
        if (!post) return res.status(404).json({ message: 'Post not found' });
        res.status(200).json({ comments: post.comments });
    } catch (error) {
        console.error('Error fetching comments for post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
export const likeUnlikePost = async (req, res) => {
	try {
		const userId = req.user._id;
		const { id: postId } = req.params;

		const post = await Post.findById(postId);

		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		const userLikedPost = post.likes.includes(userId);

		if (userLikedPost) {
			
			await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
			await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

			const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
			res.status(200).json(updatedLikes);
		} else {
		
			post.likes.push(userId);
			await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
			await post.save();

			const notification = new Notification({
				from: userId,
				to: post.user,
				type: "like",
			});
			await notification.save();

			const updatedLikes = post.likes;
			res.status(200).json(updatedLikes);
		}
	} catch (error) {
		console.log("Error in likeUnlikePost controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};


 export const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().sort({createdAt: -1}).populate({path: 'user', select: "-password"}).populate({path: 'comments.user', select: "-password"})
   
    res.status(200).json({ posts });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Internal server error"});
    }
 }
 export const getFollowingPosts = async (req, res) =>{
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).populate("following");
        if(!user){
            return res.status(404).json({message: "User not found"});
        }
        const following = user.following;

        // Debug logs to help trace why following feed may be empty
        console.log('getFollowingPosts - authUser:', { id: userId.toString(), username: user.username });
        console.log('getFollowingPosts - following count:', following.length);
        console.log('getFollowingPosts - following ids:', following.map((f) => (f._id ? f._id.toString() : f.toString())));

        const feedposts = await Post.find({ user: { $in: following } })
            .sort({ createdAt: -1 })
            .populate({ path: 'user', select: '-password' })
            .populate({ path: 'comments.user', select: '-password' });

        console.log('getFollowingPosts - found posts:', feedposts.length);
        if (feedposts.length > 0) console.log('getFollowingPosts - post ids:', feedposts.map((p) => p._id.toString()));

        res.status(200).json({ posts: feedposts });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Internal server error"});
    }
 }

 export const getUserPosts = async (req, res) => {
    try {
        const {username} = req.params;
    const user = await User.findOne({username}).select('-password');
        if(!user){
            return res.status(404).json({message: "User not found"});
        }
        const posts = await Post.find({user: user._id}).sort({createdAt: -1}).populate({path: 'user', select: "-password"}).populate({path: 'comments.user', select: "-password"});
        
   
    res.status(200).json({ posts });
    } catch (error) {
        console.log("Error in getUserPosts controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
 }

 export const getLikedPosts = async (req, res) => {
    const userId = req.params.id;
    try {
         const user = await User.findById(userId)
            if(!user){
                return res.status(404).json({message: "User not found"});
            }
            const likedPosts = await Post.find({likes: userId}).sort({createdAt: -1}).populate({path: 'user', select: "-password"}).populate({path: 'comments.user', select: "-password"});
            
            res.status(200).json({posts: likedPosts});
    } catch (error) {
        console.log("Error in getLikedPosts controller: ", error);
		res.status(500).json({ error: "Internal server error" });
    }
 }