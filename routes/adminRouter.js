const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const producController = require("../controllers/admin/productController");
const bannerController = require('../controllers/admin/bannerController');
const orderController = require('../controllers/admin/orderController');
const couponController = require('../controllers/admin/couponController');
const salesController = require('../controllers/admin/salesController');
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({storage:storage});
const {userAuth, adminAuth} = require('../middlewares/auth');

router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/dashboard', adminAuth, adminController.loadDashboard);
router.get('/logout', adminController.logout);

//user mangagement

router.get('/users', adminAuth, customerController.customerInfo);
router.get('/blockCustomer', adminAuth, customerController.customerBlock);
router.get('/unblockCustomer', adminAuth, customerController.customerUnblock);

//category management

router.get('/category', adminAuth, categoryController.categoryInfo);
router.post('/addCategory', adminAuth, categoryController.addCategory);
router.post('/addCategoryOffer', adminAuth, categoryController.addCategoryOffer);
router.post('/removeCategoryOffer', adminAuth, categoryController.removeCategoryOffer);
router.get('/listCategory', adminAuth, categoryController.getListCategory);
router.get('/unlistCategory', adminAuth, categoryController.getUnlistCategory);
router.get('/editCategory', adminAuth, categoryController.getEditCategory);
router.post('/editCategory/:id', adminAuth, categoryController.editCategory);

//brand management
router.get('/brands', adminAuth, brandController.getBrand);
router.post('/addBrand', adminAuth, uploads.single("image"), brandController.addBrand);
router.get('/blockBrand', adminAuth, brandController.blockBrand);
router.get('/unblockBrand', adminAuth, brandController.unblockBrand);
router.get('/deleteBrand', adminAuth, brandController.deleteBrand);

//Product management
router.get('/addProducts', adminAuth, producController.getProductAdd);
router.post('/addProducts', adminAuth, uploads.array('images', 4), producController.addProducts);
router.get('/products', adminAuth, producController.getProducts);
router.post('/addProductOffer', adminAuth, producController.addProductOffer);
router.post('/removeProductOffer', adminAuth, producController.removeProductOffer);
router.get('/blockProduct', adminAuth, producController.blockProduct);
router.get('/unblockProduct', adminAuth, producController.unblockProduct);
router.get('/editProduct', adminAuth, producController.getEditProduct);
router.post('/editProduct/:id', adminAuth, uploads.array("images",4), producController.editProduct);
router.post('/deleteImage', adminAuth, producController.deleteSingleImage);
router.get('/deleteProduct', adminAuth, producController.deleteProduct);

//Banner management
router.get('/banner', adminAuth, bannerController.getBannerPage);
router.get('/addBanner', adminAuth, bannerController.getAddBannerPage)
router.post('/addBanner', adminAuth, uploads.single("images"), bannerController.addBanner);
router.get('/deleteBanner', adminAuth, bannerController.deleteBanner);

//Order management
router.get('/orders', adminAuth, orderController.getOrderPage);
router.get('/orders/cancel/:orderId', adminAuth, orderController.cancelOrder);
router.get('/orders/edit/:id', adminAuth, orderController.getEditOrder);
router.post('/orders/update/:id', adminAuth, orderController.editOrder);
router.get('/returnOrders', adminAuth, orderController.getReturnOrderPage);
router.post('/returnOrders/:id/update', adminAuth, orderController.updateReturnStatus);
router.get('/returnOrders/:id/update', adminAuth, orderController.renderUpdateReturnStatusPage);
router.get('/orders/:orderId/details', orderController.getOrderDetailsPage);

//Coupon management
router.get('/coupon', adminAuth, couponController.getCouponPage);
router.get('/createCoupon', adminAuth, couponController.getCreateCoupon);
router.post("/createCoupon/addCoupon",adminAuth,couponController.addCoupon);
router.get('/coupon/edit/:couponId', adminAuth, couponController.editCoupon);
router.put('/coupon/:couponId', adminAuth, couponController.updateCoupon);
router.delete("/coupon/deleteCoupon/:couponId",adminAuth,couponController.deleteCoupon)

//Sales management
router.get('/sales', adminAuth, salesController.getSalesPage);
router.get('/filterSales', adminAuth, salesController.applyFilter);
router.get('/downloadSalesPDF', adminAuth, salesController.downloadSalesPDF);
router.get('/downloadSalesExcel', adminAuth, salesController.downloadSalesExcel);



router.get('/pageError',adminController.pageError);







module.exports = router;