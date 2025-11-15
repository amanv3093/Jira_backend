import multer from "multer";

const storage = multer.memoryStorage(); // <-- required for Cloudinary

export const upload = multer({ storage });
