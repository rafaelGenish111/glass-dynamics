// index.js
require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app'); // ייבוא הלוגיקה

const PORT = process.env.PORT || 5000;

// פונקציה להרצת השרת
const startServer = async () => {
    try {
        // חיבור ל-DB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');

        // הרמת השרת
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌐 Access from network: http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('❌ Server Connection Error:', err);
        process.exit(1);
    }
};

startServer();