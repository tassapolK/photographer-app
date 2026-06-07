const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const eventSchema = new mongoose.Schema({
  slug: { type: String, default: uuidv4, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: Date, required: true },
  photographer: { type: mongoose.Schema.Types.ObjectId, ref: 'Photographer', required: true },
  coverPhoto: { type: String, default: '' },
  photoCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
