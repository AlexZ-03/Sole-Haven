const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Product = require("../../models/productSchema");
const Review = require('../../models/reviewSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');



const addToCart = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { productId, quantity } = req.query;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const totalPrice = product.salePrice * quantity;

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({
                userId,
                items: [{
                    productId,
                    quantity,
                    price: product.salePrice,
                    totalPrice
                }]
            });
            await User.findByIdAndUpdate(userId, {
                $push: { cart: cart._id }
            });
        } else {
            const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += quantity;
                cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity * product.salePrice;
            } else {
                cart.items.push({
                    productId,
                    quantity,
                    price: product.salePrice,
                    totalPrice
                });
            }
        }

        await cart.save();
        res.json({
            success: true,
            message: 'Product added to cart successfully',
            cart
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
}


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
        res.status(500).json({ message: 'Something went wrong' });
    }
};


const updateCart = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { itemId } = req.params;
        const { increaseQuantity, decreaseQuantity, quantity } = req.body;

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

        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        const item = cart.items[itemIndex];
        const product = await Product.findById(item.productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const maxQuantity = 5;
        if (newQuantity > maxQuantity) {
            return res.status(400).json({ message: `You cannot add more than ${maxQuantity} units of this product to your cart` });
        }

        if (newQuantity > product.quantity) {
            return res.status(400).json({ message: 'Not enough stock available' });
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
        const { search, sort } = req.query;
        let filter = {};
        let sortCriteria = {};

        if (search) {
            filter = {
                ...filter,
                productName: { $regex: search, $options: 'i' }
            };
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

        const products = await Product.find(filter)
        .sort(sortCriteria)
        .populate({
            path: 'reviews',
            select: 'rating',
        });

        products.forEach(product => {
            console.log('Product Reviews:', product.reviews); 
        });

        const productsWithRatings = products.map(product => {
            const reviews = product.reviews || [];  

            const ratings = reviews.map(review => review.rating);
            const averageRating = ratings.length > 0
                ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
                : null;

            console.log('Average Rating:', averageRating);

            return {
                ...product.toObject(),
                averageRating,
            };
        });

        res.render('shop', {
            title: 'Shop',
            products: productsWithRatings,
            search,
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

const postCheckoutPage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const userId = req.session.user._id;
        const { selectedAddress, paymentMethod, newName, newPhone, newPincode, newHouse, newCity, newState, newLandMark } = req.body;

        let addressId;

        if (selectedAddress === 'new') {
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
        const items = cart && cart.items.length > 0 ? cart.items : [];
        let totalAmount = 0;
        const orderedItems = [];

        items.forEach(item => {
            const subtotal = item.quantity * item.productId.salePrice;
            totalAmount += subtotal;
            orderedItems.push({
                product: item.productId,
                quantity: item.quantity,
                price: item.productId.salePrice
            });
        });

        const newOrder = new Order({
            orderedItems,
            totalPrice: totalAmount,
            finalAmount: totalAmount, 
            address: addressId,
            invoiceDate: new Date(),
            status: 'Pending',
            userId,
            couponApplied: false,
            createdOn: new Date()
        });

        await newOrder.save();

        orderedItems.forEach(async (item) => {
            const product = await Product.findById(item.product);
            product.quantity -= item.quantity;

            if (product.quantity <= 0) {
                product.status = 'Out of stock';
            }

            await product.save();
        });

        await Cart.deleteOne({ userId });

        await User.findByIdAndUpdate(userId, {
            $push: { orderHistory: newOrder._id }
        });

        res.redirect(`/orderConformed?message=Your order with Order ID: ${newOrder._id} has been confirmed successfully!&orderId=${newOrder._id}`);
    } catch (error) {
        console.error('Error processing checkout:', error);
        res.status(500).send('Server Error');
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
}