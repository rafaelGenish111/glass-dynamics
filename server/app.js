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
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' })); // שיפור קטן: אפשרות לקנפג דרך .env
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