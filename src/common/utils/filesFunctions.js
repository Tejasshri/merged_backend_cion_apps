const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Jimp = require("jimp");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
});

function deleteAllFiles(folderPath) {
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error(err);
      return;
    }
    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(err);
        } else {
          console.log("File deleted:", filePath);
        }
      });
    });
  });
}

async function compressImageBuffer(
  imageBuffer,
  quality = 5,
  outputFormat = Jimp.MIME_JPEG
) {
  try {
    const image = await Jimp.read(imageBuffer);
    const compressedImageBuffer = await image
      .quality(quality)
      .getBufferAsync(outputFormat);
    return compressedImageBuffer;
  } catch (error) {
    console.error("Error compressing image:", error);
    throw error;
  }
}

module.exports = {
  upload,
  deleteAllFiles,
  compressImageBuffer,
};
