const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Product = require("../../models/productSchema");
const Review = require('../../models/reviewSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Razorpay = require('razorpay');
const Wishlist = require('../../models/wishlilstSchema');
const Coupon = require('../../models/couponSchema');
const Wallet = require('../../models/walletSchema');


const addToCart = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { productId, quantity, size } = req.query;

        console.log(size)

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const selectedSize = product.sizes.find(s => s.size === parseInt(size));
        if (!selectedSize) {
            return res.status(400).json({ message: 'Selected size not available' });
        }

        const qtyToAdd = parseInt(quantity, 10) || 1;
        if (selectedSize.quantity < qtyToAdd) {
            return res.status(400).json({ message: 'Not enough stock for the selected size' });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({
                userId,
                items: [{
                    productId,
                    size,
                    quantity: qtyToAdd,
                    price: product.salePrice,
                    totalPrice: product.salePrice * qtyToAdd
                }]
            });
            await cart.save();
            await User.findByIdAndUpdate(userId, {
                $push: { cart: cart._id }
            });
        } else {
            const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);
            if (itemIndex > -1) {
                const currentQuantity = cart.items[itemIndex].quantity;
                if (currentQuantity >= 5) {
                    return res.json({
                        success: false,
                        message: 'Product already in the cart with maximum quantity (5)'
                    });
                }

                cart.items[itemIndex].quantity = Math.min(currentQuantity + qtyToAdd, 5);
                cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity * product.salePrice;
            } else {
                cart.items.push({
                    productId,
                    size,
                    quantity: qtyToAdd,
                    price: product.salePrice,
                    totalPrice: product.salePrice * qtyToAdd
                });
            }
        }

        await cart.save();
        console.log(cart)
        res.json({
            success: true,
            message: 'Product added to cart successfully',
            cart
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
};


const getCartPage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const userId = req.session.user._id;

        const cart = await Cart.findOne({ userId }).populate('items.productId');


        const items = cart && cart.items.length > 0 ? cart.items : [];
        const totalPrice = items.reduce((acc, item) => acc + item.totalPrice, 0);

        res.render('cart', {
            title: 'Your Cart',
            cart: items,
            totalPrice: totalPrice,
            message: items.length > 0 ? '' : 'Your cart is empty.',
        });
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};


const updateCart = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { itemId } = req.params;
        const { size, increaseQuantity, decreaseQuantity, quantity } = req.body;


        console.log('Request itemId:', itemId);
        console.log('Request size:', size);
        console.log('itemId', itemId);


        let newQuantity = parseInt(quantity);

        if (increaseQuantity) {
            newQuantity += 1;
        }

        if (decreaseQuantity) {
            newQuantity -= 1;
        }

        console.log('Received new quantity:', newQuantity);

        if (isNaN(newQuantity) || newQuantity <= 0) {
            return res.status(400).json({ message: 'Invalid quantity' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        console.log('Cart items:', cart.items);

        const itemIndex = cart.items.findIndex(
            item => item._id.toString() === itemId && item.size === size
        );
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in cart for the specified size' });
        }

        const item = cart.items[itemIndex];
        const product = await Product.findById(item.productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const sizeDetails = product.sizes.find(s => s.size === parseInt(size));
        if (!sizeDetails) {
            return res.status(404).json({ message: 'Specified size not available for this product' });
        }

        const maxQuantity = 5;
        if (newQuantity > maxQuantity) {
            return res.status(400).json({ message: `You cannot add more than ${maxQuantity} units of this product in this size to your cart` });
        }

        if (newQuantity > sizeDetails.quantity) {
            return res.status(400).json({ message: 'Not enough stock available for the selected size' });
        }

        item.quantity = newQuantity;
        item.totalPrice = item.quantity * product.salePrice;

        await cart.save();
        res.redirect('/cart');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
};


const removeFromCart = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { itemId } = req.params;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }
        
        cart.items.splice(itemIndex, 1);

        await cart.save();

        res.redirect('/cart');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
};

const getShopPage = async (req, res) => {
    try {
        const { search, sort, page = 1 } = req.query; 
        const limit = 12; 
        const skip = (page - 1) * limit;

        let filter = {};
        let sortCriteria = {};

        if (search) {
            filter.productName = { $regex: search, $options: 'i' };
        }

        switch (sort) {
            case 'popularity':
                sortCriteria = { popularity: -1 };
                break;
            case 'price-low':
                sortCriteria = { salePrice: 1 };
                break;
            case 'price-high':
                sortCriteria = { salePrice: -1 };
                break;
            case 'az':
                sortCriteria = { productName: 1 };
                break;
            case 'za':
                sortCriteria = { productName: -1 };
                break;
            case 'new':
                sortCriteria = { createdAt: -1 };
                break;
            default:
                sortCriteria = {};
        }
        const totalProducts = await Product.countDocuments(filter);
        const products = await Product.find(filter)
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'reviews',
                select: 'rating',
            });

        const productsWithRatings = products.map(product => {
            const reviews = product.reviews || [];
            const ratings = reviews.map(review => review.rating);
            const averageRating = ratings.length > 0
                ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
                : null;

            return {
                ...product.toObject(),
                averageRating,
            };
        });

        const totalPages = Math.ceil(totalProducts / limit);

        res.render('shop', {
            title: 'Shop',
            products: productsWithRatings,
            search,
            sort,
            currentPage: parseInt(page, 10),
            totalPages,
        });
    } catch (error) {
        console.error('Error fetching shop page:', error);
        res.status(500).json({ message: 'Something went wrong' });
    }
};


const submitReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const userId = req.session && req.session.user ? req.session.user._id : null;

        if (!userId) {
            return res.redirect('/login');
        }

        const newReview = new Review({
            userId,
            rating,
            comment,
        });

        await newReview.save();
        const productId = req.params.id;

        const product = await Product.findById(req.params.id);
        product.reviews.push(newReview._id);
        await product.save();

        res.redirect(`/productDetails?id=${productId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
}

const getCheckoutPage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const userId = req.session.user._id;

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        const items = cart && cart.items.length > 0 ? cart.items : [];

        const totalAmount = items.reduce((acc, item) => acc + item.totalPrice, 0);

        const addressData = await Address.findOne({ userId });
        const addresses = addressData ? addressData.address.filter(addr => !addr.isDeleted) : [];


        res.render('checkout', {
            title: 'Checkout',
            cart: items,
            totalAmount: totalAmount,
            user: req.session.user, 
            addresses, 
        });
    } catch (error) {
        console.error('Error fetching checkout page:', error);
        res.status(500).send('Server Error');
    }
};

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY
});

const postCheckoutPage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const userId = req.session.user._id;
        const { selectedAddress, paymentMethod, newName, newPhone, newPincode, newHouse, newCity, newState, newLandMark } = req.body;

        if (!paymentMethod) {
            return res.status(400).send('Payment method is required.');
        }

        let addressId;

        if (selectedAddress === 'new') {
            if (!newName || !newPhone || !newPincode || !newHouse || !newCity || !newState) {
                return res.status(400).send('Incomplete address details provided.');
            }

            const newAddress = new Address({
                userId,
                address: [{
                    addressType: 'Shipping',
                    name: newName,
                    phone: newPhone,
                    pincode: newPincode,
                    house: newHouse,
                    city: newCity,
                    state: newState,
                    landMark: newLandMark,
                    isDeleted: false
                }]
            });

            await newAddress.save();
            addressId = newAddress._id;
        } else {
            addressId = selectedAddress;
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).send('Your cart is empty.');
        }

        const orderedItems = cart.items.map(item => ({
            product: item.productId,
            size: item.size,
            quantity: item.quantity,
            price: item.productId.salePrice
        }));

        let totalAmount = orderedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

        let finalAmount = totalAmount;
        if (req.session.coupon) {
            finalAmount = req.session.coupon.finalAmount;
        }

        let discount = totalAmount - finalAmount;

        if (paymentMethod === 'razorpay') {

            const razorpayOrder = await razorpay.orders.create({
                amount: finalAmount * 100,
                currency: 'INR',
                receipt: `order_rcptid_${Date.now()}`,
                notes: { userId, addressId }
            });

            const newOrder = new Order({
                customer: userId,
                orderedItems,
                totalPrice: totalAmount,
                discount,
                finalAmount,
                address: addressId,
                invoiceDate: new Date(),
                status: 'Pending',
                razorpayOrderId: razorpayOrder.id,
                createdOn: new Date(),
                couponApplied: req.session.coupon ? true : false,
                paymentMethod: 'Razorpay'
            });

            await newOrder.save();
            
            const userData = await User.findById(userId);

            delete req.session.coupon

            return res.redirect(`/razorpay?orderId=${newOrder.orderId}&razorpayOrderId=${razorpayOrder.id}&razorpayKey=${process.env.RAZORPAY_ID}&finalAmount=${finalAmount}&userName=${userData.name}&userEmail=${userData.email}&userPhone=${userData.phone}`);
          
        } else if (paymentMethod === 'cod') {
            const newOrder = new Order({
                customer: userId,
                orderedItems,
                totalPrice: totalAmount,
                discount,
                finalAmount,
                address: addressId,
                invoiceDate: new Date(),
                status: 'Pending',
                createdOn: new Date(),
                couponApplied: req.session.coupon ? true : false,
                paymentMethod: 'COD'
            });

            await newOrder.save();

            await Promise.all(orderedItems.map(async (item) => {
                await Product.findOneAndUpdate(
                    {
                        _id: item.product._id, 
                        'sizes.size': item.size
                    },
                    {
                        $inc: { 'sizes.$.quantity': -item.quantity } 
                    },
                    { new: true }
                );
            }));

            await User.findByIdAndUpdate(
                userId,
                { $push: { orderHistory: newOrder._id } },
                { new: true }
            );

            await Cart.updateOne({ userId }, { $set: { items: [] } });

            delete req.session.coupon

            res.redirect(`/orderConformed?message=Your order with Order ID: ${newOrder._id} has been confirmed successfully!&orderId=${newOrder._id}`);
            
        } else if (paymentMethod === 'wallet') {
            const wallet = await Wallet.findOne({ user: userId });

            if (!wallet || wallet.balance < finalAmount) {
                return res.status(400).send('Insufficient wallet balance.');
            }

            wallet.balance -= finalAmount;
            wallet.transactions.push({
                description: `Order Payment for Order ID: ${Date.now()}`,
                amount: -finalAmount
            });
            await wallet.save();

            const newOrder = new Order({
                customer: userId,
                orderedItems,
                totalPrice: totalAmount,
                discount,
                finalAmount,
                address: addressId,
                invoiceDate: new Date(),
                status: 'Pending',
                createdOn: new Date(),
                couponApplied: req.session.coupon ? true : false,
                paymentStatus: 'Paid',
                paymentMethod: 'Wallet'
            });

            await newOrder.save();

            await Promise.all(orderedItems.map(async (item) => {
                await Product.findOneAndUpdate(
                    {
                        _id: item.product._id,
                        'sizes.size': item.size
                    },
                    {
                        $inc: { 'sizes.$.quantity': -item.quantity }
                    },
                    { new: true }
                );
            }));

            await User.findByIdAndUpdate(
                userId,
                { $push: { orderHistory: newOrder._id } },
                { new: true }
            );

            await Cart.updateOne({ userId }, { $set: { items: [] } });

            delete req.session.coupon;

            return res.redirect(`/orderConformed?message=Your order with Order ID: ${newOrder._id} has been confirmed successfully!&orderId=${newOrder._id}`);
        } else {
            return res.status(400).send('Invalid payment method selected.');
        }
    } catch (error) {
        console.error('Error processing checkout:', error);
        return res.status(500).send('Server Error. Please try again later.');
    }
};

const applyCoupon = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { couponCode, totalAmount } = req.body;

        if (!couponCode || !totalAmount) {
            return res.status(400).json({
                success: false,
                alert: {
                    title: "Missing Details",
                    text: "Please provide a coupon code and total amount.",
                    icon: "error",
                },
            });
        }

        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), status: "Active" });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                alert: {
                    title: "Invalid Coupon",
                    text: "The coupon code is not valid or has expired.",
                    icon: "error",
                },
            });
        }

        const currentDate = new Date();
        if (!coupon.startDate || !coupon.endDate || currentDate < coupon.startDate || currentDate > coupon.endDate) {
            return res.status(400).json({
                success: false,
                alert: {
                    title: "Coupon Expired",
                    text: "This coupon is not valid for the selected date.",
                    icon: "warning",
                },
            });
        }

        if (
            (coupon.minPurchaseAmount && totalAmount < coupon.minPurchaseAmount) ||
            (coupon.maxPurchaseAmount && totalAmount > coupon.maxPurchaseAmount)
        ) {
            return res.status(400).json({
                success: false,
                alert: {
                    title: "Amount Mismatch",
                    text: `Coupon is valid only for purchases between ₹${coupon.minPurchaseAmount || 0} and ₹${coupon.maxPurchaseAmount || Infinity}.`,
                    icon: "info",
                },
            });
        }

        if (!coupon.user) {
            coupon.user = [];
        }

        const userCouponData = coupon.user.find(user => user.userId.toString() === userId.toString());
        if (userCouponData && userCouponData.usageCount >= coupon.usageLimit) {
            return res.status(400).json({
                success: false,
                alert: {
                    title: "Usage Limit Reached",
                    text: "You have already used this coupon the maximum allowed number of times.",
                    icon: "warning",
                },
            });
        }

        let discount = 0;
        if (coupon.discountType === "fixed") {
            discount = Math.min(coupon.discountValue, totalAmount);
        } else if (coupon.discountType === "percentage") {
            discount = (coupon.discountValue / 100) * totalAmount;
        }

        console.log("Coupon Code:", couponCode);
        console.log("Total Amount:", totalAmount);
        console.log("Coupon Details:", coupon);
        console.log("Calculated Discount:", discount);

        if (discount <= 0) {
            return res.status(400).json({
                success: false,
                alert: {
                    title: "Invalid Discount",
                    text: "This coupon does not provide a valid discount for your purchase.",
                    icon: "info",
                },
            });
        }

        const finalAmount = totalAmount - discount;

        if (userCouponData) {
            userCouponData.usageCount = (userCouponData.usageCount || 0) + 1;
        } else {
            coupon.user.push({ userId, usageCount: 1 });
        }
        await coupon.save();

        req.session.coupon = {
            couponCode,
            discount,
            finalAmount
        };

        return res.status(200).json({
            success: true,
            alert: {
                title: "Coupon Applied",
                text: `Discount of ₹${discount.toFixed(2)} applied! Your new total is ₹${finalAmount.toFixed(2)}.`,
                icon: "success",
            },
            discount,
            finalAmount,
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({
            success: false,
            alert: {
                title: "Server Error",
                text: "Something went wrong while applying the coupon. Please try again later.",
                icon: "error",
            },
        });
    }
};

const getRazorpay = async (req, res) => {
    try {
        const { orderId, razorpayOrderId, razorpayKey, finalAmount, userName, userEmail, userPhone } = req.query;

        console.log(orderId,
            razorpayOrderId,
            razorpayKey,
            finalAmount,
            userName,
            userEmail,
            userPhone)

        res.render('razorpay-checkout', {
            orderId,
            razorpayOrderId,
            razorpayKey,
            finalAmount,
            userName,
            userEmail,
            userPhone
        });
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}


const razorpaySuccess = async (req, res) => {
    try {
        const { paymentId, orderId, paymentStatus } = req.body;
        console.log('Payment ID:', paymentId);
        console.log('Order ID:', orderId);

        const order = await Order.findOne({ orderId: orderId });

        if (!order) {
            return res.status(400).json({ success: false, message: 'Order not found' });
        }

        if (paymentStatus === 'success') {
            order.paymentStatus = 'Paid';
            order.paymentId = paymentId;
            await order.save();


            const userId = order.customer;
            await Cart.updateOne({ userId }, { $set: { items: [] } });

            await User.findByIdAndUpdate(
                userId,
                { $push: { orderHistory: order._id } },
                { new: true }
            );

            console.log('orders',order.orderedItems);

            const updateOperations = order.orderedItems.map(item => {
                console.log('Item:', item);
                const filter = {
                    _id: item.product,
                    'sizes.size': item.size
                };
            
                console.log('Filter for product update:', filter);
            
                return {
                    updateOne: {
                        filter: filter,
                        update: {
                            $inc: { 'sizes.$.quantity': -item.quantity }
                        }
                    }
                };
            });
            
            const result = await Product.bulkWrite(updateOperations);
            console.log('BulkWrite result:', result);
            

            return res.json({ success: true, orderId: order._id });
        } else {
            return res.status(400).json({ success: false, message: 'Payment failed' });
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const razorpayFailure = async (req, res) => {
    try {
        const { orderId } = req.body;
        console.log('Failed Order ID:', orderId);

        const order = await Order.findOne({ orderId: orderId });

        if (order) {
            await Order.deleteOne({ orderId: orderId });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('Error deleting failed order:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};




const getOrderConformed = (req, res) => {
    const { message, orderId } = req.query;

    if (!req.session.user) {
        return res.redirect('/login');
    }

    res.render('orderConformed', {
        message,
        orderId,
        redirectTo: '/order', 
        success: true
    });
};

const getWishlist = async (req, res) => {
    try {
        const userId = req.user._id;

        const wishlist = await Wishlist.findOne({ userId })
            .populate({
                path: 'products.productId',
                select: 'productName salePrice productImage',
            });

        if (!wishlist || wishlist.products.length === 0) {
            return res.render('wishlist', { products: [], user: req.user });
        }
        

        const products = wishlist.products.map(p => ({
            id: p.productId._id,
            name: p.productId.productName,
            price: p.productId.salePrice,
            image: p.productId.productImage[0],
        }));

        console.log(products)

        res.render('wishlist', { products, user: req.user });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).send('Internal Server Error');
    }
};


const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user._id;

        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

        const productExists = wishlist.products.some(
            (product) => product.productId.toString() === productId
        );

        if (!productExists) {
            wishlist.products.push({ productId });
            await wishlist.save();
        }

        res.status(200).send({ message: 'Product added to wishlist' });
    } catch (error) {
        console.error('Error adding product to wishlist:', error);
        res.status(500).send({ message: 'Internal Server Error' });
    }
}

const removeWishlist = async(req, res) => {
    const userId = req.user._id; 
    const productId = req.params.productId;

    try {
        const wishlist = await Wishlist.findOne({ userId });
        
        if (!wishlist) {
            return res.status(404).send('Wishlist not found');
        }

        wishlist.products = wishlist.products.filter(product => product.productId.toString() !== productId);

        await wishlist.save();

        res.status(200).send('Item removed from wishlist');
    } catch (error) {
        console.error('Error removing item from wishlist:', error);
        res.status(500).send('Error removing item from wishlist');
    }
}

module.exports = {
    addToCart,
    getCartPage,
    updateCart,
    removeFromCart,
    getShopPage,
    submitReview,
    getCheckoutPage,
    postCheckoutPage,
    getOrderConformed,
    razorpaySuccess,
    getRazorpay,
    razorpayFailure,
    getWishlist,
    addToWishlist,
    removeWishlist,
    applyCoupon,
}