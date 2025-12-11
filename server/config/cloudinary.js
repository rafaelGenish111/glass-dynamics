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
    // זיהוי אוטומטי אם זה PDF או תמונה
    let format = undefined;
    let resource_type = 'image';

    if (file.mimetype === 'application/pdf') {
      format = 'pdf'; // Explicitly set format for PDF
      // ב-Cloudinary העלאת PDF נחשבת לפעמים כ-image ולפעמים כ-raw, תלוי בהגדרות החשבון.
      // כברירת מחדל multer-storage-cloudinary מנסה להעלות כ-image.
    } else {
      format = file.mimetype.split('/')[1]; // png, jpg etc
    }

    return {
      folder: 'glass_dynamic_uploads',
      format: format,
      resource_type: 'auto', // נותן ל-Cloudinary להחליט (חשוב ל-PDF)
    };
  },
});

module.exports = { cloudinary, storage };