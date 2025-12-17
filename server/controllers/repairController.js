const Repair = require('../models/Repair');
const Order = require('../models/Order');

exports.createRepair = async (req, res) => {
  const { manualOrderNumber, contactedAt, problem, estimatedWorkDays } = req.body;
  const userName = req.user ? req.user.name : 'System';

  try {
    if (!manualOrderNumber || !String(manualOrderNumber).trim()) {
      return res.status(400).json({ message: 'Order number is required' });
    }
    if (!problem || !String(problem).trim()) {
      return res.status(400).json({ message: 'Problem is required' });
    }

    const dt = contactedAt ? new Date(contactedAt) : new Date();
    if (Number.isNaN(dt.getTime())) {
      return res.status(400).json({ message: 'Invalid contactedAt date' });
    }

    const order = await Order.findOne({ manualOrderNumber: String(manualOrderNumber).trim() });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const repair = new Repair({
      orderId: order._id,
      manualOrderNumber: order.manualOrderNumber,
      clientName: order.clientName,
      clientPhone: order.clientPhone,
      clientAddress: order.clientAddress,
      region: order.region,
      contactedAt: dt,
      problem: String(problem).trim(),
      estimatedWorkDays: Number.isFinite(Number(estimatedWorkDays)) ? Number(estimatedWorkDays) : 1,
      status: 'open',
      notes: [{ text: 'Repair ticket created', createdAt: new Date(), createdBy: userName }]
    });

    const saved = await repair.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRepairs = async (req, res) => {
  try {
    const { status, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) {
      const qq = String(q).trim();
      filter.$or = [
        { manualOrderNumber: { $regex: qq, $options: 'i' } },
        { clientName: { $regex: qq, $options: 'i' } },
        { problem: { $regex: qq, $options: 'i' } }
      ];
    }

    const repairs = await Repair.find(filter).sort({ createdAt: -1 });
    res.json(repairs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRepairById = async (req, res) => {
  try {
    const repair = await Repair.findById(req.params.id);
    if (!repair) return res.status(404).json({ message: 'Repair not found' });
    res.json(repair);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRepair = async (req, res) => {
  const userName = req.user ? req.user.name : 'System';
  try {
    const repair = await Repair.findById(req.params.id);
    if (!repair) return res.status(404).json({ message: 'Repair not found' });

    const { contactedAt, problem, estimatedWorkDays } = req.body;

    if (typeof problem === 'string') repair.problem = problem.trim();
    if (contactedAt) {
      const dt = new Date(contactedAt);
      if (!Number.isNaN(dt.getTime())) repair.contactedAt = dt;
    }
    if (typeof estimatedWorkDays !== 'undefined') {
      const n = Number(estimatedWorkDays);
      if (Number.isFinite(n)) repair.estimatedWorkDays = n;
    }

    repair.notes.push({ text: 'Repair updated', createdAt: new Date(), createdBy: userName });
    const saved = await repair.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addRepairNote = async (req, res) => {
  const { text } = req.body;
  const userName = req.user ? req.user.name : 'System';

  try {
    if (!text || !String(text).trim()) return res.status(400).json({ message: 'Text is required' });
    const repair = await Repair.findById(req.params.id);
    if (!repair) return res.status(404).json({ message: 'Repair not found' });

    repair.notes.push({ text: String(text).trim(), createdAt: new Date(), createdBy: userName });
    const saved = await repair.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addRepairMedia = async (req, res) => {
  const { url, type, name } = req.body;
  const userName = req.user ? req.user.name : 'System';

  try {
    if (!url) return res.status(400).json({ message: 'URL is required' });
    const repair = await Repair.findById(req.params.id);
    if (!repair) return res.status(404).json({ message: 'Repair not found' });

    repair.media.push({
      url,
      type: ['photo', 'video', 'document'].includes(type) ? type : 'photo',
      name: name || '',
      createdAt: new Date(),
      createdBy: userName
    });

    const saved = await repair.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveRepair = async (req, res) => {
  const userName = req.user ? req.user.name : 'System';
  try {
    const repair = await Repair.findById(req.params.id);
    if (!repair) return res.status(404).json({ message: 'Repair not found' });

    repair.status = 'ready_to_schedule';
    repair.notes.push({ text: 'Approved to scheduling', createdAt: new Date(), createdBy: userName });
    const saved = await repair.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.scheduleRepair = async (req, res) => {
  const { installerIds, startDate, endDate, notes } = req.body;
  const userName = req.user ? req.user.name : 'System';

  try {
    const repair = await Repair.findById(req.params.id);
    if (!repair) return res.status(404).json({ message: 'Repair not found' });

    if (!Array.isArray(installerIds) || installerIds.length === 0) {
      return res.status(400).json({ message: 'installerIds required' });
    }

    const sd = new Date(startDate);
    const ed = new Date(endDate);
    if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime())) {
      return res.status(400).json({ message: 'Invalid dates' });
    }

    repair.installers = installerIds;
    repair.installDateStart = sd;
    repair.installDateEnd = ed;
    repair.schedulingNotes = typeof notes === 'string' ? notes : '';
    repair.status = 'scheduled';
    repair.notes.push({ text: 'Scheduled', createdAt: new Date(), createdBy: userName });

    const saved = await repair.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.closeRepair = async (req, res) => {
  const userName = req.user ? req.user.name : 'System';
  try {
    const repair = await Repair.findById(req.params.id);
    if (!repair) return res.status(404).json({ message: 'Repair not found' });

    repair.status = 'closed';
    repair.notes.push({ text: 'Closed', createdAt: new Date(), createdBy: userName });
    const saved = await repair.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRepairIssue = async (req, res) => {
  const { isIssue, reason } = req.body;
  const userName = req.user ? req.user.name : 'System';

  try {
    const repair = await Repair.findById(req.params.id);
    if (!repair) return res.status(404).json({ message: 'Repair not found' });

    const nextIsIssue = Boolean(isIssue);
    if (nextIsIssue) {
      repair.issue = {
        isIssue: true,
        reason: typeof reason === 'string' ? reason.trim() : '',
        createdAt: new Date(),
        createdBy: userName,
        resolvedAt: null
      };
      repair.notes.push({ text: `Marked as issue${repair.issue.reason ? `: ${repair.issue.reason}` : ''}`, createdAt: new Date(), createdBy: userName });
    } else {
      repair.issue = { ...(repair.issue || {}), isIssue: false, resolvedAt: new Date() };
      repair.notes.push({ text: 'Issue resolved', createdAt: new Date(), createdBy: userName });
    }

    const saved = await repair.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
