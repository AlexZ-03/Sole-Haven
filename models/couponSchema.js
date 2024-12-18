const mongoose = require("mongoose");
const {Schema}  = mongoose;

const couponSchema = new Schema({
   code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
     minPurchaseAmount: {
        type:Number,
        required:true
     },
     maxPurchaseAmount:{
        type:Number,
        required:true
     },
     startDate:{
        type:Date,
        required:true
     },
     endDate:{
        type:Date,
        required:true
     },
     discountType:{
        type:String,
        required:true
     },
     discountValue:{
        type:Number,
        required:true
     },
     description:{
      type:String,
      required:true
     },
     usageLimit:{
      type:Number,
      required:true
     },
     usedCount: {
      type:Number,
      required:false
     },
     status:{
        type:String,
        required:true,
        enum:["Expired","Active","Used","Not available","Inactive"]
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    user :[{
      userId: {
          type: Schema.Types.ObjectId,
          ref: "User"
      },
      usageCount: {
          type: Number,
      }
  }]
})

const Coupon = mongoose.model("Coupon",couponSchema);

module.exports = Coupon;