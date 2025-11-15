import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js';
import postRoutes from './routes/post.route.js';
import notification from './routes/notification.route.js';
// ... chat/socket code removed
import cookieParser from 'cookie-parser';
import { connectDB } from './db/db.js';

dotenv.config();


cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
connectDB();

// Increase payload size to allow base64 video uploads from client (adjust as needed)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notification);
// (socket.io integration removed)

app.listen(3000, async ()=>{
	console.log("Server is running on port 3000");

});