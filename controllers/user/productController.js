const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Product = require("../../models/productSchema");
const Review = require('../../models/reviewSchema');



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
            console.log('Product Reviews:', product.reviews);  // Debugging reviews
        });

        const productsWithRatings = products.map(product => {
            const reviews = product.reviews || [];  // Ensure reviews is an array, default to empty array if undefined

            const ratings = reviews.map(review => review.rating);
            const averageRating = ratings.length > 0
                ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
                : null;

            console.log('Average Rating:', averageRating);  // Debugging average rating

            return {
                ...product.toObject(),  // Convert product to a plain object
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



module.exports = {
    addToCart,
    getCartPage,
    updateCart,
    removeFromCart,
    getShopPage,
}