const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');
const Product = require("../../models/productSchema");
const bcrypt = require('bcrypt');



const userProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);

        if(userData){
            res.render('profile', {
                user: userData
            })
        }
    } catch (error) {
        console.log('Error : ', error);
        res.redirect('/pageNotFound');
    }
}

const getOrders = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);

        if(userData){
            res.render('orders', {
                user: userData
            })
        }
    } catch (error) {
        
    }
}



const editProfile = async (req, res) => {
    try {
        const userId = req.session.user; 
        const { email, newPassword, currentPassword } = req.body;

        const userData = await User.findById(userId);
        if (!userData) {
            return res.status(404).json({ error: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, userData.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: "Current password is incorrect" });
        }

        userData.email = email;

        if (newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            userData.password = hashedPassword;
        }

        await userData.save();
        res.redirect('/userProfile');
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};

const getAddressPage = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).send('User not found');

        const userAddressDoc = await Address.findOne({
            userId: user._id,
        });

        const addresses = userAddressDoc
            ? userAddressDoc.address.filter((addr) => !addr.isDeleted)
            : [];

        res.render('address', { 
            user, 
            addresses
        });
    } catch (err) {
        console.error("Error fetching address page:", err);
        res.status(500).send('Server Error');
    }
}

const addAddress = async (req, res) => {
    try {
        const { addressType, name, city, landMark, state, pincode, house, phone } = req.body;

        if (!addressType || !name || !city || !landMark || !state || !pincode || !house || !phone) {
            return res.status(400).send({ message: "All fields are required!" });
        }

        const userId = req.user._id;

        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
            userAddress = new Address({
                userId,
                address: [{
                    addressType,
                    name,
                    city,
                    landMark,
                    state,
                    pincode,
                    house,
                    phone
                }]
            });
        } else {
            userAddress.address.push({
                addressType,
                name,
                city,
                landMark,
                state,
                pincode,
                house,
                phone
            });
        }

        await userAddress.save();

        res.status(201).send({ message: "Address added successfully!" });
    } catch (error) {
        console.error("Error adding address:", error);
        res.status(500).send({ message: "Internal server error" });
    }
}

const deleteAddress = async (req, res) => {
    const addressId = req.params.id;
    const userId = req.session.user._id;
    console.log(addressId, userId);


    try {
        const result = await Address.updateOne(
            { userId, "address._id": addressId }, 
            { $set: { "address.$.isDeleted": true } }
        );

        if (result.matchedCount === 1 && result.modifiedCount === 1) {
            res.status(200).json({ message: 'Address marked as deleted successfully!' });
        } else {
            res.status(404).json({ message: 'Address not found or already deleted!' });
        }
    } catch (error) {
        console.error('Error soft-deleting address:', error);
        res.status(500).json({ message: 'Failed to delete address!' });
    }
}

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

        if (!cart || cart.items.length === 0) {
            return res.render('cart', {
                title: 'Your Cart',
                message: 'Your cart is empty.',
                cart: null
            });
        }

        const totalPrice = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);

        res.render('cart', {
            title: 'Your Cart',
            cart: cart.items,
            totalPrice: totalPrice,
            message: cart.items.length > 0 ? '' : 'Your cart is empty.',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
};


module.exports = {
    userProfile,
    getOrders,
    editProfile,
    getAddressPage,
    addAddress,
    deleteAddress,
    addToCart,
    getCartPage,
}