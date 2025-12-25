const mongoose = require('mongoose');

const RepairSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  manualOrderNumber: { type: String, required: true },

  clientName: { type: String, required: true },
  clientPhone: { type: String },
  clientAddress: { type: String },
  region: { type: String },

  contactedAt: { type: Date, required: true },
  problem: { type: String, required: true },

  warrantyStatus: { type: String, enum: ['in_warranty', 'out_of_warranty'], default: 'in_warranty' },
  paymentNote: { type: String, default: '' },

  status: {
    type: String,
    enum: ['open', 'ready_to_schedule', 'scheduled', 'in_progress', 'closed'],
    default: 'open'
  },

  estimatedWorkDays: { type: Number, default: 1 },

  installers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  installDateStart: { type: Date },
  installDateEnd: { type: Date },
  schedulingNotes: { type: String, default: '' },

  issue: {
    isIssue: { type: Boolean, default: false },
    reason: { type: String, default: '' },
    createdAt: { type: Date },
    createdBy: { type: String },
    resolvedAt: { type: Date }
  },

  notes: [{
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String }
  }],

  media: [{
    url: { type: String, required: true },
    type: { type: String, enum: ['photo', 'video', 'document'], default: 'photo' },
    name: { type: String },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Repair', RepairSchema);

