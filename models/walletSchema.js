const mongoose = require('mongoose');
const { Schema } = mongoose;


const walletSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    balance: {
        type: Number,
        required: true,
        default: 0
    },
    transactions: [
        {
            date: {
                type: Date,
                required: true,
                default: Date.now
            },
            description: {
                type: String,
                required: true
            },
            amount: {
                type: Number,
                required: true
            }
        }
    ]
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
