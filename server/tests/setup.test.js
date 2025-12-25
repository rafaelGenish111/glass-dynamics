// tests/setup.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app'); // טוענים את האפליקציה המנותקת

let mongoServer;

// 1. לפני הכל - מרימים DB בזיכרון ומתחברים אליו
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // התחברות עם Mongoose ל-DB המדומה
    await mongoose.connect(uri);
});

// 2. אחרי הכל - סוגרים את הבאסטה
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// 3. ניקוי מידע בין טסטים (כדי שטסט אחד לא ישפיע על השני)
afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany();
    }
});

// --- הטסטים עצמם ---

describe('Basic System Check', () => {
    
    // בדיקת שפיות - האם השרת עונה?
    it('GET / should return 200 and welcome message', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Glass Dynamic API is Running');
    });

    // בדיקת 404 - נתיב לא קיים
    it('GET /unknown-route should return 404', async () => {
        const res = await request(app).get('/api/lo-kayam');
        expect(res.statusCode).toEqual(404);
    });
});