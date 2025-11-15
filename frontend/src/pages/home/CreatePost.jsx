import { CiImageOn } from "react-icons/ci";
import { BsEmojiSmileFill } from "react-icons/bs";
import { BiVideoPlus } from "react-icons/bi";
import { useRef, useState, useEffect } from "react";
import { IoCloseSharp } from "react-icons/io5";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
try { gsap.registerPlugin(ScrollTrigger); } catch (e) { }

const CreatePost = () => {
	const [text, setText] = useState("");
	const [img, setImg] = useState(null);
	const [video, setVideo] = useState(null);
	const [charCount, setCharCount] = useState(0);
	const [previewKey, setPreviewKey] = useState(0);
	const imgRef = useRef(null);
	const videoRef = useRef(null);

	const { data: authUser } = useQuery({ queryKey: ["authUser"] });
	const queryClient = useQueryClient();
	const previewRef = useRef(null);
	useEffect(() => {
		if (!previewRef.current) return;
		gsap.fromTo(previewRef.current, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' });
	}, [previewKey]);

	const {
		mutate: createPost,
		isPending,
		isError,
		error,
	} = useMutation({
		mutationFn: async ({ text, img, video }) => {
			try {
				const res = await fetch("/api/posts/create", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ text, img, video }),
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
			setText("");
			setImg(null);
			setVideo(null);
			// force-unmount preview DOM
			setPreviewKey((k) => k + 1);
			// clear file inputs
			try { if (imgRef.current) imgRef.current.value = null; } catch (e) {}
			try { if (videoRef.current) videoRef.current.value = null; } catch (e) {}
			const imgEl = document.getElementById('image-input'); if (imgEl) imgEl.value = '';
			const vidEl = document.getElementById('video-input'); if (vidEl) vidEl.value = '';
			toast.success("Post created successfully");
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
	});

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!text.trim() && !img && !video) return;
		createPost({ text, img, video });
	};

	const handleImgChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				setImg(reader.result);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleVideoChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			// Basic client-side size/type checks
			if (!file.type.startsWith('video/')) {
				toast.error('Please select a valid video file');
				return;
			}
			if (file.size > 50 * 1024 * 1024) { // 50MB limit
				toast.error('Video too large (max 50MB)');
				return;
			}
			const reader = new FileReader();
			reader.onload = () => {
				setVideo(reader.result);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleTextChange = (e) => {
		const value = e.target.value;
		setText(value);
		setCharCount(value.length);
	};

	const clearImage = () => {
		setImg(null);
		setPreviewKey((k) => k + 1);
		try { if (imgRef.current) imgRef.current.value = null; } catch (e) {}
		const imgEl = document.getElementById('image-input'); if (imgEl) imgEl.value = '';
	};

	const clearVideo = () => {
		setVideo(null);
		setPreviewKey((k) => k + 1);
		try { if (videoRef.current) videoRef.current.value = null; } catch (e) {}
		const vidEl = document.getElementById('video-input'); if (vidEl) vidEl.value = '';
	};

	return (
		<div className='flex p-4 items-start gap-4 border-b border-gray-700'>
			<div className='avatar'>
				<div className='w-8 rounded-full'>
					<img src={authUser.profileImg || "/avatar-placeholder.png"} />
				</div>
			</div>
			<form className='flex flex-col gap-2 w-full' onSubmit={handleSubmit}>
				<div className='relative'>
					<textarea
						className='textarea w-full p-0 text-lg resize-none border-none focus:outline-none  border-gray-800'
						placeholder='What is happening?!'
						value={text}
						onChange={handleTextChange}
					/>
					{/* Absolute top-right clear preview button - high z-index to ensure clickable */}
					{(img || video) && (
						<button
							type='button'
							aria-label='Clear preview'
							onClick={() => { clearImage(); clearVideo(); }}
							className='absolute top-2 right-2 z-50 w-8 h-8 flex items-center justify-center bg-gray-800 rounded-full p-1 text-white hover:opacity-90'
						>
							<IoCloseSharp className='w-5 h-5' />
						</button>
					)}
				</div>
				{img && (
					<div key={`img-${previewKey}`} ref={previewRef} className='relative w-72 mx-auto'>
						<IoCloseSharp
							className='absolute top-0 right-0 text-white bg-gray-800 rounded-full w-5 h-5 cursor-pointer'
							onClick={clearImage}
						/>
						<img src={img} className='w-full mx-auto h-72 object-contain rounded img-preview' />
					</div>
					)}



					{video && (
						<div key={`vid-${previewKey}`} ref={previewRef} className='relative w-72 mx-auto'>
							<IoCloseSharp
								className='absolute top-0 right-0 text-white bg-gray-800 rounded-full w-5 h-5 cursor-pointer'
								onClick={clearVideo}
							/>
							<video controls src={video} className='w-full mx-auto h-72 object-contain rounded img-preview' />
						</div>
					)}

				<div className='flex justify-between border-t py-2 border-t-gray-700'>
					<div className='flex gap-1 items-center'>
						<CiImageOn
							className='fill-primary w-6 h-6 cursor-pointer'
							onClick={() => imgRef.current.click()}
						/>
						<BiVideoPlus
							className='fill-primary w-6 h-6 cursor-pointer'
							onClick={() => document.getElementById('video-input').click()}
						/>
						<BsEmojiSmileFill className='fill-primary w-5 h-5 cursor-pointer' />
					</div>
					<input id='image-input' type='file' accept='image/*' hidden ref={imgRef} onChange={handleImgChange} />
					{/* video input - separate hidden input */}
					<input type='file' accept='video/*' hidden id='video-input' ref={videoRef} onChange={handleVideoChange} />
					<div className='flex items-center gap-3'>
						<div className='text-sm text-slate-400'>{charCount}/280</div>
						{(img || video) && (
							<button
								type='button'
								className='text-sm underline text-slate-300 mr-2'
								onClick={() => { clearImage(); clearVideo(); }}
							>
								Remove preview
							</button>
						)}
						<motion.button
							whileHover={{ scale: 1.03 }}
							className={`btn btn-primary rounded-full btn-sm text-white px-4 ${(!text.trim() && !img && !video) || isPending ? 'btn-disabled' : ''}`}
							disabled={(!text.trim() && !img && !video) || isPending}
						>
							{isPending ? "Posting..." : "Post"}
						</motion.button>
					</div>
				</div>
				{isError && <div className='text-red-500'>{error.message}</div>}
			</form>
		</div>
	);
};
export default CreatePost;
