const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  // --- General Information ---
  // Legacy field (older deployments used `orderNumber` and a unique DB index may still exist)
  // We keep it in sync with `manualOrderNumber` to avoid E11000 on { orderNumber: null }.
  orderNumber: { type: String, unique: true, sparse: true },

  manualOrderNumber: { type: String, required: true, unique: true }, // Identifier from external system
  clientName: { type: String, required: true },
  clientPhone: String,
  clientEmail: String,
  clientAddress: String,
  region: { type: String }, // e.g., 'North', 'Center', 'Tel Aviv'

  // --- Overall Order Status ---
  status: {
    type: String,
    enum: [
      // --- Legacy / Frontend statuses (kept for backwards compatibility) ---
      'offer',
      'production',
      'install',
      'pending_approval',

      // --- Newer workflow statuses ---
      'new',                // Recently created
      'materials_pending',  // Waiting for materials to be ordered
      'production_pending', // Materials ordered, waiting for arrival
      'in_production',      // Currently being manufactured
      'ready_for_install',  // Finished production, ready for scheduling
      'scheduled',          // Scheduled for installation
      'installed',          // Installation done on site (pending final approval)
      'completed',          // Financially closed and archived
      'cancelled'           // Cancelled / closed without completion
    ],
    default: 'new'
  },

  // --- Table 1: Products for Client (What the customer sees) ---
  // e.g., "Living Room Window", "Kitchen Door"
  products: [{
    type: { type: String }, // Product Type (Window, Door, Showcase)
    location: { type: String }, // e.g., "Living Room"
    description: { type: String },
    dimensions: { type: String },
    quantity: { type: Number, default: 1 }
  }],

  // --- Table 2: Materials for Factory (What needs to be ordered) ---
  // e.g., "Glass 6+6", "Profile 7000", "Paint RAL 9010"
  materials: [{
    materialType: { type: String, enum: ['Glass', 'Aluminum', 'Paint', 'Hardware', 'Other'] },
    description: { type: String },
    supplier: { type: String }, // Supplier Name
    quantity: { type: Number, default: 1 },

    // Procurement Status (Per item tracking)
    isOrdered: { type: Boolean, default: false },
    orderedAt: { type: Date },
    orderedBy: { type: String },

    // Arrival Status (Warehouse Checklist)
    isArrived: { type: Boolean, default: false },
    arrivedAt: { type: Date }
  }],

  // --- Production Traffic Light System ---
  // Granular status for the production manager
  productionStatus: {
    glass: { type: String, enum: ['not_needed', 'pending', 'arrived'], default: 'not_needed' },
    paint: { type: String, enum: ['not_needed', 'pending', 'arrived'], default: 'not_needed' },
    aluminum: { type: String, enum: ['not_needed', 'pending', 'arrived'], default: 'not_needed' },
    hardware: { type: String, enum: ['not_needed', 'pending', 'arrived'], default: 'not_needed' },
    other: { type: String, enum: ['not_needed', 'pending', 'arrived'], default: 'not_needed' }
  },

  // --- Production Checklist (Done/Not done) ---
  // This is independent from material arrival and is used by the factory to confirm work completion.
  productionChecklist: {
    glassDone: { type: Boolean },
    paintDone: { type: Boolean },
    materialsDone: { type: Boolean }
  },
  productionNote: { type: String, default: '' },

  // --- Finance & Time Estimation ---
  estimatedInstallationDays: { type: Number, default: 1 },
  deposit: { type: Number, default: 0 }, // Down payment
  depositPaid: { type: Boolean, default: false },
  depositPaidAt: { type: Date },

  // Final Closure Details
  finalInvoice: {
    isIssued: { type: Boolean, default: false },
    invoiceNumber: { type: String },
    amount: { type: Number },
    isPaid: { type: Boolean, default: false }
  },

  // --- Files & Media ---
  files: [{
    name: String,
    url: String, // Cloudinary URL
    type: { type: String, enum: ['master_plan', 'document', 'site_photo'] },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String }
  }],

  // --- Installation Scheduling ---
  installers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  installDateStart: { type: Date },
  installDateEnd: { type: Date },
  installationNotes: { type: String },

  // --- Installation Prep Checklist (What to take to site) ---
  installTakeList: [{
    label: { type: String, required: true },
    done: { type: Boolean, default: false }
  }],

  // --- Issues / Delays (Scheduling) ---
  issue: {
    isIssue: { type: Boolean, default: false },
    reason: { type: String, default: '' },
    createdAt: { type: Date },
    createdBy: { type: String },
    resolvedAt: { type: Date }
  },

  // --- Notes (by stage, by user) ---
  notes: [{
    stage: { type: String, default: 'general' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String }
  }],

  // --- Audit Log ---
  timeline: [{
    status: String,
    date: { type: Date, default: Date.now },
    note: String,
    user: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);