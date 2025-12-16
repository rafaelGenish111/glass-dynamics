const Order = require('../models/Order');
const User = require('../models/User');

// 1. Assign Team & Schedule (שיבוץ עובדים ותאריכים)
exports.scheduleInstallation = async (req, res) => {
  const { orderId, installerIds, startDate, endDate, notes } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Update fields
    order.installers = installerIds; // Array of User IDs
    order.installDateStart = new Date(startDate);
    order.installDateEnd = new Date(endDate);
    order.installationNotes = notes;

    // Move to 'scheduled' bucket
    order.status = 'scheduled';

    // Add to timeline
    order.timeline.push({
      status: 'scheduled',
      note: `Scheduled for ${new Date(startDate).toLocaleDateString()} with ${installerIds.length} installers.`
    });

    await order.save();

    // Populate installer names for the response
    await order.populate('installers', 'name role');

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Get Installers List (שליפת רק עובדים שהם מתקינים לטובת ה-Dropdown)
exports.getInstallersList = async (req, res) => {
  try {
    const installers = await User.find({ role: 'installer' }).select('name _id email');
    res.json(installers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Manager Approval (אישור סופי של המנהל אחרי שהמתקין סיים)
exports.approveInstallation = async (req, res) => {
  const { orderId } = req.body;
  try {
    // Installation is already finished by installer app -> pending_approval.
    // Keep this endpoint for backwards compatibility with older UIs.
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: 'pending_approval' },
      { new: true }
    );
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};