import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});

async function bufferToTempFile(file) {
  const tempDir = './uploads';
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  const fileExt = path.extname(file.originalname || ".jpg");
  const tempFileName = `${Date.now()}-${file.originalname || 'upload'}${fileExt}`;
  const tempPath = path.join(tempDir, tempFileName);
  await fs.promises.writeFile(tempPath, file.buffer);
  return tempPath;
}

// Accepts either file path, multer file (with buffer), or raw buffer
const uploadOnCloudinary = async (inputFile) => {
  let tempFilePath;
  let mustCleanup = false;
  try {
    let localFilePath = typeof inputFile === "string" ? inputFile : inputFile.path;
    // If we have a buffer (but no path), create temp file
    if (!localFilePath && inputFile.buffer) {
      localFilePath = await bufferToTempFile(inputFile);
      mustCleanup = true;
    }
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto"
    });
    if (mustCleanup && localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return response;
  } catch (error) {
    if (mustCleanup && localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

export { uploadOnCloudinary };
