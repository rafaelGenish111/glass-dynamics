// server/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const productRoutes = require('./routes/productRoutes');
const repairRoutes = require('./routes/repairRoutes');

const app = express();

// 1. הגדרת משתנה המקור המורשה
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
console.log(`🔒 CORS Configured for origin: ${allowedOrigin}`); // לוג לבדיקה

// 2. הגדרת CORS מתקדמת
app.use(cors({
    origin: (origin, callback) => {
        // מאפשר בקשות ללא origin (כמו Postman או סקריפטים שרת-לשרת)
        if (!origin) return callback(null, true);

        // בדיקה האם המקור תואם להגדרות
        if (origin === allowedOrigin || origin === 'http://localhost:5173') {
            return callback(null, true);
        } else {
            console.log(`🚫 Blocked CORS request from: ${origin}`); // לוג חסימה
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // חובה בשביל Login (Cookies/Headers)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. הגדרת Helmet (עם ביטול חסימת Cross-Origin)
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/repairs', repairRoutes);

// Basic Route
app.get('/', (req, res) => {
    res.send('Glass Dynamic API is Running...');
});

module.exports = app;