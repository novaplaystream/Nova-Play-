const mongoose = require("mongoose")

const videoSchema = new mongoose.Schema({
 title: String,
 videoId: String,
 views: Number,
 likes: Number,
 category: String,
 language: String,
 thumbnailUrl: String,
 source: String,
 approved: Boolean,
 homepage: Boolean
})

module.exports = mongoose.model("Video", videoSchema)
