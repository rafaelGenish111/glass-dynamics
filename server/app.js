// server/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // החזרנו את helmet
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const productRoutes = require('./routes/productRoutes');
const repairRoutes = require('./routes/repairRoutes');

const app = express();

// לוג לכל בקשה נכנסת - כדי לראות שהכל מתחבר
app.use((req, res, next) => {
    console.log(`📡 Incoming: ${req.method} ${req.url} | Origin: ${req.headers.origin}`);
    next();
});

// הגדרת מקור מורשה
// אם אין משתנה סביבה, ברירת מחדל היא הכתובת של ורסל שלך (ליתר ביטחון)
const allowedOrigin = process.env.CORS_ORIGIN || 'https://glass-dynamics.vercel.app';

const corsOptions = {
    origin: (origin, callback) => {
        // מאפשר בקשות ללא origin (כמו Postman) או מהמקור המורשה
        if (!origin || origin === allowedOrigin || origin === 'http://localhost:5173') {
            callback(null, true);
        } else {
            console.log(`🚫 Blocked CORS from: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // חובה ל-Login
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// הפעלת CORS
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // התיקון הקריטי ל-Express 5

// הגדרות אבטחה (Helmet) - עם אישור לתמונות ומשאבים חיצוניים
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } 
}));

app.use(express.json()); 

// === החזרנו את כל הראוטים לפעולה ===
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/repairs', repairRoutes);

// ראוט בדיקה
app.get('/', (req, res) => {
    res.send('Glass Dynamic API is LIVE and READY! 🚀');
});

module.exports = app;