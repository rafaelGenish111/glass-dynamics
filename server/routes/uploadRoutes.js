const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    try {
      console.log('File filter - Original name:', file.originalname);
      console.log('File filter - MIME type:', file.mimetype);
      
      // Accept images and PDFs - be more lenient
      const allowedMimeTypes = /^(image\/(jpeg|jpg|png|gif|webp|bmp|svg)|application\/pdf)$/i;
      const allowedExtensions = /\.(jpeg|jpg|png|gif|webp|bmp|svg|pdf)$/i;
      
      const extname = allowedExtensions.test(file.originalname);
      const mimetype = allowedMimeTypes.test(file.mimetype);
      
      console.log('File filter - Extension match:', extname, 'MIME match:', mimetype);
      
      // Accept if either extension or mimetype matches (more lenient)
      if (mimetype || extname) {
        return cb(null, true);
      } else {
        console.log('File filter - Rejected:', file.originalname);
        cb(new Error('Only image files and PDFs are allowed!'));
      }
    } catch (error) {
      console.error('File filter error:', error);
      cb(error);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message || 'File upload error' });
  }
  next();
};

router.post('/', protect, upload.single('image'), handleMulterError, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Cloudinary returns the public URL of the uploaded file
    let fileUrl = req.file.path;
    
    // For PDFs, modify the URL to prevent download
    // Add fl_attachment:false transformation to the URL
    if (req.file.mimetype === 'application/pdf' || fileUrl.includes('.pdf')) {
      // Add transformation parameter to prevent download
      const separator = fileUrl.includes('?') ? '&' : '?';
      fileUrl = fileUrl + separator + 'fl_attachment:false';
    }
    
    console.log('File uploaded successfully:', fileUrl);
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
});

module.exports = router;