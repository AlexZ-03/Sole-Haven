const mongoose = require('mongoose');
const {Schema} = mongoose;
const {v4: uuidv4} = require('uuid');
const Address = require('./addressSchema');

const orderSchema = new Schema({
    orderId : {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderedItems: [{
        product:{
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            default: 0
        },
        size: {
             type: Number,
            default: 0
        }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true
    },
    address: {
        name : {
            type : String,
            required : true
        },
        city : {
            type : String,
            required : true
        },
        landMark : {
            type: String,
            required : true
        },
        state : {
            type: String,
            required : true
        },
        pincode : {
            type : Number,
            required : true
        },
        house : {
          type : String,
          required: true  
        },
        phone : {
            type : String,
            required : true
        }
    },
    invoiceDate: {
        type: Date
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Canceled', 'Returned']
    },
    createdOn : {
        type: Date,
        default: Date.now,
        required: true
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    razorpayOrderId: {
        type: String,
        required: false
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ['Pending', 'Paid'],
        default: 'Pending'
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['COD', 'Razorpay', 'Wallet']
    },
    returnStatus : {
        type: String,
        required: true,
        enum: ['Not Requested', 'Requested', 'Approved', 'Rejected'],
        default: 'Not Requested'
    }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;