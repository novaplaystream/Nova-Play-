const mongoose = require("mongoose")

const channelSchema = new mongoose.Schema({
  channelId: { type: String, unique: true },
  ownerEmail: { type: String, index: true },
  name: String,
  description: String,
  createdAt: String,
  updatedAt: String
})

module.exports = mongoose.model("Channel", channelSchema)
