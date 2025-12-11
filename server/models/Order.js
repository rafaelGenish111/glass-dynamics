const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  // --- פרטים כלליים ---
  manualOrderNumber: { type: String, required: true, unique: true }, // מס' הזמנה ידני (מערכת חיצונית)
  clientName: { type: String, required: true },
  clientPhone: String,
  clientEmail: String,
  clientAddress: String,
  region: { type: String }, // אזור (הוספנו)
  
  // --- סטטוס כללי של ההזמנה ---
  status: {
    type: String,
    enum: [
      'new',                // הזמנה חדשה
      'materials_pending',  // ממתין להזמנת חומרים
      'production_pending', // חומרים הוזמנו, ממתין להגעת חומרים/ייצור
      'in_production',      // בייצור בפועל
      'ready_for_install',  // סיים ייצור - ממתין לשיבוץ
      'scheduled',          // משובץ להתקנה
      'installed',          // התקנה הסתיימה בשטח (ממתין לסגירה)
      'completed'           // סגור חשבונאית וארכיון
    ],
    default: 'new'
  },

  // --- מוצרים ללקוח (מה הלקוח מקבל - חלון, דלת...) ---
  products: [{
    type: { type: String }, // למשל: חלון קיפ
    location: { type: String }, // למשל: סלון
    description: { type: String },
    dimensions: { type: String },
    quantity: { type: Number, default: 1 }
  }],

  // --- חומרים להזמנה (מה המפעל מזמין - זכוכית, צבע, פרזול) ---
  materials: [{
    materialType: { type: String, enum: ['Glass', 'Aluminum', 'Paint', 'Hardware', 'Other'] },
    description: { type: String }, // למשל: זכוכית בידודית 6+6
    supplier: { type: String }, // שם הספק
    quantity: { type: Number },
    
    // סטטוס רכש לכל שורה
    isOrdered: { type: Boolean, default: false }, // האם הוצאה הזמנה לספק?
    orderedAt: { type: Date },
    orderedBy: { type: String }, // מי המשתמש שהזמין
    
    isArrived: { type: Boolean, default: false }, // האם הגיע למפעל?
    arrivedAt: { type: Date }
  }],

  // --- סטטוסים לייצור (רמזור) ---
  // האם הפריטים הרלוונטיים הגיעו?
  productionStatus: {
    glass: { type: String, enum: ['not_needed', 'pending', 'arrived'], default: 'pending' },
    paint: { type: String, enum: ['not_needed', 'pending', 'arrived'], default: 'pending' },
    aluminum: { type: String, enum: ['not_needed', 'pending', 'arrived'], default: 'pending' },
    hardware: { type: String, enum: ['not_needed', 'pending', 'arrived'], default: 'pending' }
  },

  // --- כספים וזמנים ---
  estimatedInstallationDays: { type: Number, default: 1 }, // הערכת ימי עבודה
  deposit: { type: Number, default: 0 }, // מקדמה ששולמה
  
  // סגירת חשבון
  finalInvoice: {
    isIssued: { type: Boolean, default: false },
    invoiceNumber: { type: String },
    amount: { type: Number },
    isPaid: { type: Boolean, default: false }
  },

  // --- קבצים ---
  files: [{
    name: String,
    url: String,
    type: { type: String, enum: ['master_plan', 'document', 'site_photo'] },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String }
  }],

  // --- שיבוץ התקנה ---
  installers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  installDateStart: { type: Date },
  installDateEnd: { type: Date },
  installationNotes: { type: String },

  // --- לוג ---
  timeline: [{
    status: String,
    date: { type: Date, default: Date.now },
    note: String,
    user: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);