const Order = require('../models/Order');

// --- CRM & ORDER MANAGEMENT ---

// 1. Get all orders (sorted by newest)
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Get Single Order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Create Order (V2 Structure)
exports.createOrder = async (req, res) => {
  try {
    const {
      manualOrderNumber, clientName, clientPhone, clientEmail,
      clientAddress, region, deposit, depositPaid, depositPaidAt, estimatedInstallationDays,
      products, materials
    } = req.body;

    // Keep legacy `orderNumber` in sync (some DBs have a unique index on it)
    const orderNumber = manualOrderNumber;

    // Check for duplicate manual order number
    const exists = await Order.findOne({ manualOrderNumber });
    if (exists) {
      return res.status(400).json({ message: 'Order Number already exists' });
    }

    // Calculate initial production status (Traffic Light) based on materials
    const prodStatus = {
      glass: materials.some(m => m.materialType === 'Glass') ? 'pending' : 'not_needed',
      paint: materials.some(m => m.materialType === 'Paint') ? 'pending' : 'not_needed',
      aluminum: materials.some(m => m.materialType === 'Aluminum') ? 'pending' : 'not_needed',
      hardware: materials.some(m => m.materialType === 'Hardware') ? 'pending' : 'not_needed',
    };

    // Production checklist defaults:
    // - If the order has no relevant items for a category, mark it Done by default.
    // - Otherwise, it starts as Not done.
    const hasGlass = materials.some((m) => m.materialType === 'Glass');
    const hasPaint = materials.some((m) => m.materialType === 'Paint');
    const hasMaterials = materials.some((m) => ['Aluminum', 'Hardware', 'Other'].includes(m.materialType));
    const productionChecklist = {
      glassDone: hasGlass ? false : true,
      paintDone: hasPaint ? false : true,
      materialsDone: hasMaterials ? false : true
    };

    // Determine initial status: if materials needed -> materials_pending, else -> production
    const initialStatus = materials.length > 0 ? 'materials_pending' : 'production';

    const order = new Order({
      orderNumber,
      manualOrderNumber,
      clientName, clientPhone, clientEmail, clientAddress, region,
      deposit,
      depositPaid: Boolean(depositPaid),
      depositPaidAt: depositPaidAt ? new Date(depositPaidAt) : null,
      estimatedInstallationDays,
      products,   // Client items (Window, Door...)
      materials,  // Factory items (Glass, Paint...)
      productionStatus: prodStatus,
      productionChecklist,
      productionNote: '',
      status: initialStatus,
      timeline: [{ status: 'created', note: 'Order created', date: new Date(), user: req.user ? req.user.name : 'System' }]
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// --- PRODUCTION (DONE / NOT DONE) ---
exports.updateProduction = async (req, res) => {
  const { productionChecklist, productionNote } = req.body;
  const userName = req.user ? req.user.name : 'System';

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (productionChecklist && typeof productionChecklist === 'object') {
      order.productionChecklist = {
        ...(order.productionChecklist || {}),
        ...productionChecklist
      };
    }

    if (typeof productionNote === 'string') {
      order.productionNote = productionNote;
    }

    order.timeline.push({
      status: order.status,
      note: 'Production updated',
      date: new Date(),
      user: userName
    });

    const saved = await order.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateInstallTakeList = async (req, res) => {
  const { installTakeList } = req.body;
  const userName = req.user ? req.user.name : 'System';

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const list = Array.isArray(installTakeList) ? installTakeList : [];
    const normalized = list
      .map((it) => ({
        label: typeof it?.label === 'string' ? it.label.trim() : '',
        done: Boolean(it?.done)
      }))
      .filter((it) => it.label.length > 0)
      .slice(0, 50);

    order.installTakeList = normalized;
    order.timeline.push({
      status: order.status,
      note: 'Installation checklist updated',
      date: new Date(),
      user: userName
    });
    const saved = await order.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrderIssue = async (req, res) => {
  const { isIssue, reason } = req.body;
  const userName = req.user ? req.user.name : 'System';

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const nextIsIssue = Boolean(isIssue);
    if (nextIsIssue) {
      order.issue = {
        isIssue: true,
        reason: typeof reason === 'string' ? reason.trim() : '',
        createdAt: new Date(),
        createdBy: userName,
        resolvedAt: null
      };
      order.timeline.push({
        status: order.status,
        note: `Marked as issue${order.issue.reason ? `: ${order.issue.reason}` : ''}`,
        date: new Date(),
        user: userName
      });
    } else {
      order.issue = {
        ...(order.issue || {}),
        isIssue: false,
        resolvedAt: new Date()
      };
      order.timeline.push({
        status: order.status,
        note: 'Issue resolved',
        date: new Date(),
        user: userName
      });
    }

    const saved = await order.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Update Order Status
exports.updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.status = status;
      order.timeline.push({
        status,
        note: `Status updated to ${status}`,
        date: new Date(),
        user: req.user ? req.user.name : 'System'
      });
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. Add File to Order
exports.addOrderFile = async (req, res) => {
  const { url, type, name } = req.body;

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.files.push({
      url,
      type: type || 'document',
      name: name || 'Uploaded File',
      uploadedAt: new Date(),
      uploadedBy: req.user ? req.user.name : 'System'
    });

    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- CLIENT MANAGEMENT ---

// 6. Search Clients by Name (Autocomplete)
exports.searchClients = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json([]);

  try {
    const clients = await Order.aggregate([
      { $match: { clientName: { $regex: query, $options: 'i' } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$clientName",
          phone: { $first: "$clientPhone" },
          email: { $first: "$clientEmail" },
          address: { $first: "$clientAddress" },
          region: { $first: "$region" }
        }
      },
      { $limit: 5 }
    ]);
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 7. Get Client by Phone (Auto-fill)
exports.getClientByPhone = async (req, res) => {
  const { phone } = req.params;
  try {
    const existingOrder = await Order.findOne({ clientPhone: phone }).sort({ createdAt: -1 });

    if (existingOrder) {
      res.json({
        found: true,
        clientName: existingOrder.clientName,
        clientAddress: existingOrder.clientAddress,
        clientEmail: existingOrder.clientEmail
      });
    } else {
      res.json({ found: false });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 8. Get All Customers List (Grouped)
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Order.aggregate([
      {
        $group: {
          _id: "$clientName",
          phone: { $first: "$clientPhone" },
          address: { $first: "$clientAddress" },
          lastOrderDate: { $max: "$createdAt" },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { lastOrderDate: -1 } }
    ]);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 9. Get Client History
exports.getClientHistory = async (req, res) => {
  const clientName = decodeURIComponent(req.params.name);
  try {
    const orders = await Order.find({ clientName: clientName }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// --- PROCUREMENT (PURCHASING) LOGIC ---

// 10. Get Pending Materials (Flat list for "Pending Items" page)
exports.getPendingMaterials = async (req, res) => {
  try {
    const materials = await Order.aggregate([
      { $match: { status: { $nin: ['completed', 'cancelled'] } } },
      { $unwind: "$materials" },
      { $match: { "materials.isOrdered": false } },
      { $sort: { createdAt: 1 } },
      {
        $project: {
          _id: 0,
          orderId: "$_id",
          orderNumber: "$manualOrderNumber",
          clientName: "$clientName",
          orderDate: "$createdAt",
          masterPlanUrl: {
            $let: {
              vars: {
                mp: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: { $ifNull: ["$files", []] },
                        as: "f",
                        cond: { $eq: ["$$f.type", "master_plan"] }
                      }
                    },
                    0
                  ]
                }
              },
              in: "$$mp.url"
            }
          },
          materialId: "$materials._id",
          materialType: "$materials.materialType",
          description: "$materials.description",
          supplier: "$materials.supplier",
          quantity: "$materials.quantity"
        }
      }
    ]);
    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 11. Mark single material as ORDERED
exports.markMaterialOrdered = async (req, res) => {
  const { orderId, materialId, orderedBy, orderedAt } = req.body;
  const userName = req.user ? req.user.name : 'System';

  try {
    const effectiveOrderedBy = (typeof orderedBy === 'string' && orderedBy.trim().length > 0)
      ? orderedBy.trim()
      : userName;

    let effectiveOrderedAt = new Date();
    if (orderedAt) {
      const parsed = new Date(orderedAt);
      if (!Number.isNaN(parsed.getTime())) {
        effectiveOrderedAt = parsed;
      }
    }

    await Order.updateOne(
      { _id: orderId, "materials._id": materialId },
      {
        $set: {
          "materials.$.isOrdered": true,
          "materials.$.orderedAt": effectiveOrderedAt,
          "materials.$.orderedBy": effectiveOrderedBy
        }
      }
    );
    res.json({ message: 'Material marked as ordered' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 12. Get Purchasing Status (Tracking / Checklist)
exports.getPurchasingStatus = async (req, res) => {
  try {
    const pipeline = [
      { $match: { status: { $nin: ['completed'] } } },
      { $unwind: "$materials" },
      { $match: { "materials.isOrdered": true } }, // Show only ordered items
      { $sort: { "materials.orderedAt": -1 } },
      {
        $group: {
          _id: "$materials.supplier",
          items: {
            $push: {
              orderId: "$_id",
              orderNumber: "$manualOrderNumber",
              clientName: "$clientName",
              masterPlanUrl: {
                $let: {
                  vars: {
                    mp: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: { $ifNull: ["$files", []] },
                            as: "f",
                            cond: { $eq: ["$$f.type", "master_plan"] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: "$$mp.url"
                }
              },
              materialId: "$materials._id",
              description: "$materials.description",
              quantity: "$materials.quantity",
              orderedAt: "$materials.orderedAt",
              orderedBy: "$materials.orderedBy",
              isArrived: "$materials.isArrived",
              arrivedAt: "$materials.arrivedAt"
            }
          }
        }
      }
    ];
    const results = await Order.aggregate(pipeline);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 13. Toggle Material Arrival (Checklist V) + Auto Update Production Status
exports.toggleMaterialArrival = async (req, res) => {
  const { orderId, materialId, isArrived } = req.body;

  try {
    // 1. Update specific material status
    await Order.updateOne(
      { _id: orderId, "materials._id": materialId },
      {
        $set: {
          "materials.$.isArrived": isArrived,
          "materials.$.arrivedAt": isArrived ? new Date() : null
        }
      }
    );

    // 2. Recalculate Production Status (Traffic Light)
    const order = await Order.findById(orderId);

    const updateCategoryStatus = (category) => {
      const relevantMaterials = order.materials.filter(m => m.materialType === category);
      if (relevantMaterials.length === 0) return 'not_needed';
      const allArrived = relevantMaterials.every(m => m.isArrived);
      return allArrived ? 'arrived' : 'pending';
    };

    order.productionStatus.glass = updateCategoryStatus('Glass');
    order.productionStatus.paint = updateCategoryStatus('Paint');
    order.productionStatus.aluminum = updateCategoryStatus('Aluminum');
    order.productionStatus.hardware = updateCategoryStatus('Hardware');
    order.productionStatus.other = updateCategoryStatus('Other');

    // 3. Auto-update main status if everything arrived
    const allMaterialsArrived = order.materials.every(m => m.isArrived);
    if (allMaterialsArrived && order.status === 'materials_pending') {
      order.status = 'production_pending'; // Ready for production
      order.timeline.push({ status: 'production_pending', note: 'All materials arrived', date: new Date() });
    }

    await order.save();
    res.json({ message: 'Arrival status updated', productionStatus: order.productionStatus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --------------------------------------------------------
// Legacy / Helper Exports (For backward compatibility if needed)
// --------------------------------------------------------
exports.getBatchingList = async (req, res) => {
  // Legacy function, can be deprecated in favor of getPendingMaterials
  res.json([]);
};

exports.markAsOrdered = async (req, res) => {
  // Legacy function, can be deprecated in favor of markMaterialOrdered
  res.json({ message: 'Deprecated' });
};

// --- FINANCE / APPROVALS ---
// Update invoice/payment fields; auto-close if complete
exports.updateFinalInvoice = async (req, res) => {
  const { isIssued, invoiceNumber, isPaid, amount } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const parsedAmount = amount === '' || amount === null || typeof amount === 'undefined'
      ? undefined
      : Number(amount);

    order.finalInvoice = {
      isIssued: Boolean(isIssued),
      invoiceNumber: invoiceNumber || '',
      amount: Number.isFinite(parsedAmount) ? parsedAmount : undefined,
      isPaid: Boolean(isPaid)
    };

    order.timeline.push({
      status: order.status,
      note: 'Final invoice updated',
      date: new Date(),
      user: req.user ? req.user.name : 'System'
    });

    const canClose = order.finalInvoice.isIssued && order.finalInvoice.isPaid && Number.isFinite(order.finalInvoice.amount);
    if (canClose && order.status !== 'completed') {
      order.status = 'completed';
      order.timeline.push({
        status: 'completed',
        note: 'Order completed (invoice issued + paid)',
        date: new Date(),
        user: req.user ? req.user.name : 'System'
      });
    }

    const saved = await order.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- ORDER NOTES ---
exports.addOrderNote = async (req, res) => {
  const { stage, text } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const noteText = typeof text === 'string' ? text.trim() : '';
    if (!noteText) return res.status(400).json({ message: 'Note text is required' });

    order.notes.push({
      stage: stage || 'general',
      text: noteText,
      createdAt: new Date(),
      createdBy: req.user ? req.user.name : 'System'
    });

    order.timeline.push({
      status: order.status,
      note: `Note added (${stage || 'general'})`,
      date: new Date(),
      user: req.user ? req.user.name : 'System'
    });

    const saved = await order.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};