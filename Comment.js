const mongoose = require("mongoose")

const commentSchema = new mongoose.Schema({
  videoId: { type: Number, required: true, index: true },
  author: { type: String, required: true },
  text: { type: String, required: true, maxLength: 500 },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model("Comment", commentSchema)