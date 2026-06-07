const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  cloudinaryId: { type: String, required: true },
  url: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  originalName: { type: String, default: '' },
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  // Array of face descriptors (Float32Array serialized as regular array)
  faceDescriptors: { type: [[Number]], default: [] },
  hasFaces: { type: Boolean, default: false },
}, { timestamps: true });

photoSchema.index({ event: 1 });

module.exports = mongoose.model('Photo', photoSchema);
