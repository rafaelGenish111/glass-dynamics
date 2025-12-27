// app.js
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

// Middleware
app.use(express.json());

// CORS configuration - support multiple origins
const allowedOrigins = [
    'https://glass-dynamics.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.CORS_ORIGIN
].filter(Boolean); // Remove undefined values

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // If CORS_ORIGIN is set and matches, allow it
            if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true
}));
app.use(helmet());

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

// שינוי קריטי: אנחנו מייצאים את האפליקציה, לא מפעילים אותה!
module.exports = app;