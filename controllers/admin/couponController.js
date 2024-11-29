const Coupon = require('../../models/couponSchema');
const { getCartPage } = require('../user/productController');


const getCouponPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
    
        const searchQuery = req.query.search || '';
        let query = {};
    
        
        await Coupon.updateMany(
          { endDate: { $lt: new Date() }, status: { $ne: 'Expired' } }, 
          { $set: { status: 'Expired' } }
        );
    
        if (searchQuery) {
          query = {
            $or: [
              { code: { $regex: searchQuery, $options: 'i' } },
              { description: { $regex: searchQuery, $options: 'i' } },
              { discountType: { $regex: searchQuery, $options: 'i' } },
              { status: { $regex: searchQuery, $options: 'i' } }
            ]
          };
    
          if (!isNaN(searchQuery)) {
            query.$or.push(
              { discountValue: parseFloat(searchQuery) },
              { maxPurchaseAmount: parseFloat(searchQuery) },
              { minPurchaseAmount: parseFloat(searchQuery) },
              { usageLimit: parseInt(searchQuery) }
            );
          }
    
          const datePattern = /^\d{4}-\d{2}-\d{2}$/; 
          if (datePattern.test(searchQuery)) {
            const searchDate = new Date(searchQuery);
            query.$or.push(
              { startDate: { $lte: searchDate }, endDate: { $gte: searchDate } },
              { createdAt: { $gte: searchDate, $lt: new Date(searchDate.getTime() + 86400000) } } 
            );
          }
        }
    
        const coupons = await Coupon.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();
    
        const totalCoupons = await Coupon.countDocuments(query);
        const totalPages = Math.ceil(totalCoupons / limit);
    
        res.render("coupon", {
          coupons,
          currentPage: page,
          totalPages,
          searchQuery
        });
      } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching coupons' });
      }
}

const getCreateCoupon = async (req, res, next) => {
    try {
      return res.render("createCoupon");
    } catch (error) {
      next(error);
    }
};

const addCoupon = async (req, res) => {
    try {
      const {
        code,
        discountType,
        description,
        startDate,
        endDate,
        discountValue,
        status,
        minPurchaseAmount,
        maxPurchaseAmount,
        usageLimit
      } = req.body;
  
     
      const existingCoupon = await Coupon.findOne({ code: code });
      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: "Coupon code already exists. Please try a different code."
        });
      }
  
      
      const newCoupon = new Coupon({
        code: code,
        discountType: discountType,
        description: description,
        startDate: startDate,
        endDate: endDate,
        discountValue: discountValue,
        status: status,
        minPurchaseAmount: minPurchaseAmount,
        maxPurchaseAmount: maxPurchaseAmount,
        usageLimit:usageLimit,
      });

      console.log(newCoupon)
  
    
      await newCoupon.save();
  
      res.status(201).json({
        success: true,
        message: "Coupon created successfully",
        coupon: newCoupon
      });
    } catch (error) {
      console.error("Error creating coupon:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while creating the coupon"
      });
    }
};

const editCoupon = async (req, res) => {
    try {
      const couponId = req.params.couponId;
      const coupon = await Coupon.findById(couponId);
  
      if (!coupon) {
        return res.status(404).send('Coupon not found');
      }
  
      res.render('editCoupon', { coupon });
    } catch (error) {
      console.error('Error fetching coupon:', error);
      res.status(500).send('Internal Server Error');
    }
};
  
  const updateCoupon = async (req, res) => {
    try {
      const couponId = req.params.couponId;
      const updatedData = req.body;
  
      await Coupon.findByIdAndUpdate(couponId, updatedData, { new: true });
  
      return res.json({ success: true, message: 'Coupon updated successfully' });
    } catch (error) {
      console.error('Error updating coupon:', error);
      return res.json({ success: false, message: 'Error updating coupon' });
    }
};

const deleteCoupon = async (req, res) => {
    try {

      const { couponId } = req.params;

      const coupon = await Coupon.findById(couponId);
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: "Coupon not found"
        });
      }
  
      
      await Coupon.findByIdAndDelete(couponId);
  
      res.status(200).json({
        success: true,
        message: "Coupon deleted successfully"
      });
  
    } catch (error) {
      console.error("Error deleting coupon:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while deleting the coupon"
      });
    }
};

module.exports = {
    getCouponPage,
    getCreateCoupon,
    addCoupon,
    editCoupon,
    updateCoupon,
    deleteCoupon,
}