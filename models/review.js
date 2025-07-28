const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const User = require("./user");

const reviewSchema = new Schema({
    review: {
        type: String,
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference to User model
        required: true
    }
});

module.exports = mongoose.model("Review", reviewSchema);
