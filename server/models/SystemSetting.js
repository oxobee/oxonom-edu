const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  value: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  description: { 
    type: String 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

systemSettingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (typeof next === 'function') next();
});

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
