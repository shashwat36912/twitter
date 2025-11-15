import { FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FaRegHeart } from "react-icons/fa";
import { FaRegBookmark } from "react-icons/fa6";
import { FaTrash } from "react-icons/fa";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import LoadingSpinner from "./LoadingSpinner";
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
try { gsap.registerPlugin(ScrollTrigger); } catch (e) { /* ignore if already registered */ }
import { formatPostDate } from "../../utils/date";

const Post = ({ post }) => {
	const elRef = useRef(null);
	useEffect(() => {
		const node = elRef.current;
		if (!node) return;
		gsap.fromTo(node, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: node, start: 'top 90%' } });
	}, []);
	const [comment, setComment] = useState("");
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });
	const queryClient = useQueryClient();
	const postOwner = post.user;
	// guard authUser which may be undefined while loading
	const authId = authUser?._id ?? null;
	const isLiked = authId ? post.likes.some((id) => id?.toString() === authId.toString()) : false;

	const isMyPost = authId && post.user?._id ? authId.toString() === post.user._id.toString() : false;

	const formattedDate = formatPostDate(post.createdAt);

	const { mutate: deletePost, isPending: isDeleting } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/posts/${post._id}`, {
					method: "DELETE",
				});
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			toast.success("Post deleted successfully");
			// invalidate any query whose key starts with 'posts' (covers ["posts", endpoint] keys)
			queryClient.invalidateQueries({
				predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "posts",
			});
		},
	});

	const [popHeart, setPopHeart] = useState(false);

	const { mutate: likePost, isPending: isLiking } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/posts/like/${post._id}`, {
					method: "POST",
				});
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: (updatedLikes) => {
			// this is not the best UX, bc it will refetch all posts
			// queryClient.invalidateQueries({ queryKey: ["posts"] });

			// instead, update the cache directly for that post
			queryClient.setQueryData(["posts"], (oldData) => {
				// oldData can be:
				// - an array of posts
				// - an object like { posts: [...] }
				// - undefined if the exact query key isn't present in cache
				if (!oldData) return oldData;
				if (Array.isArray(oldData)) {
					return oldData.map((p) => (p._id === post._id ? { ...p, likes: updatedLikes } : p));
				}
				if (Array.isArray(oldData.posts)) {
					return {
						...oldData,
						posts: oldData.posts.map((p) => (p._id === post._id ? { ...p, likes: updatedLikes } : p)),
					};
				}
				// fallback: return unchanged
				return oldData;
			});
			// show toast for like/unlike based on whether auth user is present in updatedLikes
			const likedNow = authId
				? updatedLikes.some((id) => id?.toString() === authId.toString())
				: false;
			if (likedNow) {
				toast.success("Liked");
			} else {
				toast.success("Unliked");
			}

			// trigger a small pop animation on the heart
			setPopHeart(true);
			setTimeout(() => setPopHeart(false), 380);

			// ensure all "posts" queries are refreshed so the UI (count & icon) updates
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutate: commentPost, isPending: isCommenting } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/posts/comment/${post._id}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ text: comment }),
				});
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			toast.success("Comment posted successfully");
			setComment("");
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleDeletePost = () => {
		deletePost();
	};

	const handlePostComment = (e) => {
		e.preventDefault();
		if (isCommenting) return;
		commentPost();
	};

	const handleLikePost = () => {
		if (isLiking) return;
		likePost();
	};

	return (
		<>
			<motion.div ref={elRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.005 }} className='flex gap-2 items-start p-4 border-b border-gray-700'>
				<div className='avatar'>
					<Link to={`/profile/${postOwner.username}`} className='w-8 rounded-full overflow-hidden'>
						<img src={postOwner.profileImg || "/avatar-placeholder.png"} />
					</Link>
				</div>
				<div className='flex flex-col flex-1'>
					<div className='flex gap-2 items-center'>
						<Link to={`/profile/${postOwner.username}`} className='font-bold'>
							{postOwner.fullName}
						</Link>
						<span className='text-gray-700 flex gap-1 text-sm'>
							<Link to={`/profile/${postOwner.username}`}>@{postOwner.username}</Link>
							<span>·</span>
							<span>{formattedDate}</span>
						</span>
						{isMyPost && (
							<span className='flex justify-end flex-1'>
								{!isDeleting && (
									<FaTrash className='cursor-pointer hover:text-red-500' onClick={handleDeletePost} />
								)}

								{isDeleting && <LoadingSpinner size='sm' />}
							</span>
						)}
					</div>
					<div className='flex flex-col gap-3 overflow-hidden'>
						<span>{post.text}</span>
						{post.video && (
							<video
								controls
								src={post.video}
								className='h-80 object-contain rounded-lg border border-gray-700'
							/>
						)}
						{post.img && (
							<img
								src={post.img}
								className='h-80 object-contain rounded-lg border border-gray-700'
								alt=''
							/>
						)}
					</div>
					<div className='flex justify-between mt-3'>
						<div className='flex gap-4 items-center w-2/3 justify-between'>
							<div
								className='flex gap-1 items-center cursor-pointer group'
								onClick={() => document.getElementById("comments_modal" + post._id).showModal()}
							>
								<FaRegComment className='w-4 h-4  text-slate-500 group-hover:text-sky-400' />
								<span className='text-sm text-slate-500 group-hover:text-sky-400'>
									{post.comments.length}
								</span>
							</div>
							{/* We're using Modal Component from DaisyUI */}
							<dialog id={`comments_modal${post._id}`} className='modal border-none outline-none'>
								<div className='modal-box rounded border border-gray-600'>
									<h3 className='font-bold text-lg mb-4'>COMMENTS</h3>
									<div className='flex flex-col gap-3 max-h-60 overflow-auto'>
										{post.comments.length === 0 && (
											<p className='text-sm text-slate-500'>
												No comments yet 🤔 Be the first one 😉
											</p>
										)}
										{post.comments.map((comment, idx) => {
											// comment.user may be populated (object) or just an ObjectId/string; handle both
											const commenter = comment.user && typeof comment.user === 'object'
												? comment.user
												: { profileImg: '/avatar-placeholder.png', fullName: 'User', username: typeof comment.user === 'string' ? comment.user.slice(0, 8) : '' };
											const key = comment._id || comment.id || idx;
											return (
												<div key={key} className='flex gap-2 items-start'>
													<div className='avatar'>
														<div className='w-8 rounded-full'>
															<img src={commenter.profileImg || '/avatar-placeholder.png'} />
														</div>
													</div>
													<div className='flex flex-col'>
														<div className='flex items-center gap-1'>
															<span className='font-bold'>{commenter.fullName}</span>
															<span className='text-gray-700 text-sm'>@{commenter.username}</span>
														</div>
														<div className='text-sm'>{comment.text}</div>
													</div>
												</div>
											);
										})}
									</div>
									<form
										className='flex gap-2 items-center mt-4 border-t border-gray-600 pt-2'
										onSubmit={handlePostComment}
									>
										<textarea
											className='textarea w-full p-1 rounded text-md resize-none border focus:outline-none  border-gray-800'
											placeholder='Add a comment...'
											value={comment}
											onChange={(e) => setComment(e.target.value)}
										/>
										<button className='btn btn-primary rounded-full btn-sm text-white px-4'>
											{isCommenting ? <LoadingSpinner size='md' /> : "Post"}
										</button>
									</form>
								</div>
								<form method='dialog' className='modal-backdrop'>
									<button className='outline-none'>close</button>
								</form>
							</dialog>
							<div className='flex gap-1 items-center group cursor-pointer'>
								<BiRepost className='w-6 h-6  text-slate-500 group-hover:text-green-500' />
								<span className='text-sm text-slate-500 group-hover:text-green-500'>0</span>
							</div>
							<div className='flex gap-1 items-center group cursor-pointer' onClick={handleLikePost}>
								{isLiking && <LoadingSpinner size='sm' />}
								{!isLiked && !isLiking && (
									<FaRegHeart className={`w-4 h-4 cursor-pointer ${popHeart ? 'heart-pop' : ''} text-slate-500 group-hover:text-pink-500`} />
								)}
								{isLiked && !isLiking && (
									<FaRegHeart className={`w-4 h-4 cursor-pointer ${popHeart ? 'heart-pop' : ''} text-pink-500`} />
								)}

								<span
									className={`text-sm  group-hover:text-pink-500 ${
										isLiked ? "text-pink-500" : "text-slate-500"
									}`}
								>
									{post.likes.length}
								</span>
							</div>
						</div>
						<div className='flex w-1/3 justify-end gap-2 items-center'>
							<FaRegBookmark className='w-4 h-4 text-slate-500 cursor-pointer' />
						</div>
					</div>
				</div>
			</motion.div>
		</>
	);
};
export default Post;
