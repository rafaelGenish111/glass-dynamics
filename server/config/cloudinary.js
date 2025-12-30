const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // זיהוי הפורמט
    let format = file.mimetype.split('/')[1];
    if (file.mimetype === 'application/pdf') {
      format = 'pdf';
    }

    return {
      folder: 'glass_dynamic_uploads',
      format: format,
      // השינוי הקריטי: שים לב לשורה הזו!
      resource_type: 'image' 
    };
  },
});

module.exports = { cloudinary, storage };