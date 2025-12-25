const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app'); 

// שים לב: אנחנו צריכים את המודל כדי ליצור משתמש ראשוני לבדיקה
// תבדוק שהנתיב הזה נכון אצלך! אם המודל נמצא בתיקייה אחרת, תקן את הנתיב.
const User = require('../models/User'); 

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    process.env.JWT_SECRET = 'test-secret-key-123';
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
});

describe('Auth System (CRM Style)', () => {

    const adminUser = {
        name: 'Admin Boss',
        email: 'admin@bizflow.com',
        password: 'SecretPassword123!',
        role: 'super_admin'
    };

    // בדיקה 1: התחברות (Happy Path)
    // מכיוון שאין Route להרשמה פומבית, אנחנו יוצרים את המשתמש ישירות ב-DB
    it('POST /api/auth/login - should login successfully', async () => {
        
        // 1. יצירת משתמש ידנית ב-DB (Seed)
        // הערה: אני מניח שהמודל שלך מצפין סיסמה אוטומטית ב-pre('save')
        await User.create(adminUser);

        // 2. ניסיון התחברות דרך ה-API
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: adminUser.email,
                password: adminUser.password
            });

        // 3. בדיקות
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        // וודא שהסיסמה לא דלפה
        expect(res.body).not.toHaveProperty('password');
    });

    // בדיקה 2: התחברות עם סיסמה שגויה (Sad Path)
    it('POST /api/auth/login - should fail with wrong password', async () => {
        await User.create(adminUser); // חייבים ליצור אותו קודם

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: adminUser.email,
                password: 'WrongPassword'
            });

        expect(res.statusCode).toEqual(401); // Unauthorized
    });

    // בדיקה 3: אבטחה (Security Path)
    // אנחנו מוודאים שסתם אורח לא יכול ליצור משתמשים
    it('POST /api/auth/create-user - should BLOCK anonymous requests', async () => {
        const res = await request(app)
            .post('/api/auth/create-user') // הנתיב הנכון בקוד שלך!
            .send({
                name: 'Hacker',
                email: 'hacker@evil.com',
                password: '123',
                role: 'admin'
            });

        // הציפייה: חסימה (401 כי אין טוקן)
        expect(res.statusCode).toEqual(401);
    });
});