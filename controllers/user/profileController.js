const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');
const Product = require("../../models/productSchema");
const Orders = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema')
const bcrypt = require('bcrypt');



// const userProfile = async (req, res) => {
//     try {
//         const userId = req.session.user || req.user;
//         const userData = await User.findById(userId);

//         if(userData){
//             res.render('profile', {
//                 user: userData
//             })
//         }
//     } catch (error) {
//         console.log('Error : ', error);
//         res.redirect('/pageNotFound');
//     }
// }

const userProfile = async (req, res, next) => {
    try {
        console.log('----------userProfile-----------')
        const userId = req.session.user || req.user;
       
        const userData = await User.findById(userId);

       
        if (res.locals.user) {
            return res.render("profile", {
                user: res.locals.user,
            });
        } else {
            return res.render("login");
        }
    } catch (error) {
        console.log("Profile page not found:", error);
        next(error);
    }
};

const getOrders = async (req, res) => {
    try {
        console.log('----------------getOrders-----------------')
        const userId = req.session.user;

        if (!userId) {
            return res.redirect('/login');
        }

        const userData = await User.findById(userId).populate({
            path: 'orderHistory',
            populate: [
                {
                    path: 'orderedItems.product',
                    model: 'Product'
                },
                {
                    path: 'address',
                    model: 'Address'
                }
            ]
        });

        if (!userData) {
            return res.redirect('/login');
        }

        const cancelableStatuses = ['Pending', 'Processing', 'Shipped'];
        const returnableStatuses = ['Delivered'];

        const orders = userData.orderHistory.map(order => {
            let deliveryAddress = 'Address not available';

            if (order.address && order.address.address) {
                console.log('Populated address:', order.address);

                let tempAddress = order.address.address
                console.log('under tempAddress :',order.address)
            
                const addressObj = order.address.address.find(addr => {
                    console.log(addr._id);
                    console.log(order.address._id);

                    return addr._id.equals(order.address._id);
                });
                console.log(addressObj);
                if (addressObj && !addressObj.isDeleted) {
                    console.log(`${addressObj.house}, ${addressObj.landMark}, ${addressObj.city}, ${addressObj.state} - ${addressObj.pincode}, Phone: ${addressObj.phone}`)
                    deliveryAddress = `${addressObj.house}, ${addressObj.landMark}, ${addressObj.city}, ${addressObj.state} - ${addressObj.pincode}, Phone: ${addressObj.phone}`;
                }
            }

            return {
                orderId: order.orderId,
                status: order.status,
                total: order.totalPrice,
                discount: order.discount,
                finalAmount: order.finalAmount,
                invoiceDate: order.invoiceDate,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                orderedItems: order.orderedItems.map(item => ({
                    productName: item.product ? item.product.productName : null,
                    productImage: item.product && item.product.productImage ? item.product.productImage[0] : null,
                    productId: item.product ? item.product._id : null,
                    price: item.price,
                    quantity: item.quantity
                })),
                address: deliveryAddress,
                canCancel: cancelableStatuses.includes(order.status),
                canReturn: returnableStatuses.includes(order.status) && order.returnStatus === 'Not Requested',
                returnStatus: order.returnStatus
            };
        });

        console.log(orders);

        res.render('orders', {
            user: userData,
            orders: orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Server Error');
    }
};


const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.session.user;

        if (!userId) {
            return res.redirect('/login');
        }

        const userData = await User.findById(userId).populate({
            path: 'orderHistory',
            populate: {
                path: 'orderedItems.product',
                model: 'Product'
            }
        });

        console.log('Received Order ID:', orderId);
        console.log('User Order History:', userData.orderHistory);

        const order = userData.orderHistory.find(order => order.orderId === orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.paymentStatus === 'Paid') {
            let wallet = await Wallet.findOne({ user: userId });

            if (!wallet) {
                wallet = new Wallet({ user: userId, balance: 0 });
                await wallet.save();
            }

            wallet.balance += order.finalAmount;
            await wallet.save();

            wallet.transactions.push({
                description: `Refund for canceled order ${order.orderId}`,
                amount: order.finalAmount,
            });
            await wallet.save();
        }

        order.status = 'Canceled';
        await order.save();

        for (let item of order.orderedItems) {
            const product = item.product;

            if (product && Array.isArray(product.sizes)) {
                const sizeToUpdate = product.sizes.find(sizeObj => sizeObj.size === item.size);
                
                if (sizeToUpdate && sizeToUpdate.quantity >= 0) {
                    sizeToUpdate.quantity += item.quantity;
                    await product.save();
                } else {
                    console.error(`Size ${item.size} not found or invalid in product sizes.`);
                }
            } else {
                console.error('Product sizes array not found or invalid.');
            }
        }

        res.json({ success: true, message: 'Order successfully canceled, and wallet refunded' });
    } catch (error) {
        console.error('Error canceling order:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


const returnOrder = async(req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Orders.findOne({ orderId: orderId, customer: req.user._id });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.returnStatus !== 'Not Requested') {
            return res.status(400).json({ success: false, message: 'Return already requested or processed' });
        }

        order.returnStatus = 'Requested';
        await order.save();

        res.json({ success: true, message: 'Order return requested' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
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

const getWalletPage = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const user = await User.findById(userId).populate('wallet');
        console.log(user.wallet)
        
        res.render('wallet', { user: user });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error occurred while loading wallet page.");
    }
};



module.exports = {
    userProfile,
    getOrders,
    editProfile,
    getAddressPage,
    addAddress,
    deleteAddress,
    cancelOrder,
    returnOrder,
    getWalletPage,
}