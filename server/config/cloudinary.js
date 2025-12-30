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
    try {
      console.log('Cloudinary params - File:', file.originalname, 'MIME:', file.mimetype);
      
      // זיהוי אוטומטי אם זה PDF או תמונה
      let format = undefined;
      let resource_type = 'auto';

      if (file.mimetype === 'application/pdf') {
        resource_type = 'raw'; // PDF should be raw, not image
        format = undefined; // Don't set format for PDF
      } else if (file.mimetype.startsWith('image/')) {
        resource_type = 'image';
        format = file.mimetype.split('/')[1]; // png, jpg etc
      } else {
        // Default to auto for unknown types
        resource_type = 'auto';
        format = undefined;
      }

      const params = {
        folder: 'glass_dynamic_uploads',
        resource_type: resource_type,
      };
      
      if (format) {
        params.format = format;
      }
      
      // For PDFs, add transformation to prevent download
      if (file.mimetype === 'application/pdf') {
        // Use transformation flags in the URL, not in upload params
        // The flags will be added when generating the URL
        params.invalidate = false;
      }
      
      console.log('Cloudinary params result:', params);
      return params;
    } catch (error) {
      console.error('Cloudinary params error:', error);
      throw error;
    }
  },
});

module.exports = { cloudinary, storage };