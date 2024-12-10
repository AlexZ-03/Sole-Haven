const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');
const Product = require("../../models/productSchema");
const Orders = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema')
const bcrypt = require('bcrypt');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');


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
        console.log('----------------getOrders-----------------');
        const userId = req.session.user;

        if (!userId) {
            return res.redirect('/login');
        }

        const userData = await User.findById(userId).populate({
            path: 'orderHistory',
            populate: {
                path: 'orderedItems.product',
                model: 'Product',
            },
        });

        if (!userData) {
            return res.redirect('/login');
        }

        const cancelableStatuses = ['Pending', 'Processing', 'Shipped'];
        const returnableStatuses = ['Delivered'];

        const orders = userData.orderHistory.map(order => {
            let deliveryAddress = 'Address not available';

            if (order.address) {
                deliveryAddress = `${order.address.house}, ${order.address.landMark}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}, Phone: ${order.address.phone}`;
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
                    quantity: item.quantity,
                })),
                address: deliveryAddress,
                canCancel: cancelableStatuses.includes(order.status),
                canReturn: returnableStatuses.includes(order.status) && order.returnStatus === 'Not Requested',
                returnStatus: order.returnStatus,
            };
        });

        console.log(orders);

        res.render('orders', {
            user: userData,
            orders: orders,
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        const isDev = process.env.NODE_ENV !== 'production';
        res.status(500).send(isDev ? `Error fetching orders: ${error.message}` : 'Server Error');
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
                description: `Refund for canceled order ${order.orderId.slice(-6)}`,
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

const validateCurrentPassword = async (req, res) => {
    try {
        const userId = req.session.user;
        const { currentPassword } = req.body;

        const userData = await User.findById(userId);
        if (!userData) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, userData.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Current password is incorrect.' });
        }

        res.status(200).json({ message: 'Password validated.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

const editProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const { newPassword } = req.body;

        if (!userId) {
            req.session.destroy((err) => {
                if (err) {
                    console.log("Error while logout:", err.message);
                    return res.status(500).json({ error: "Failed to log out. Please try again later." });
                }
                console.log('Session Destroyed');
                return res.status(401).json({ error: "Session expired. Please log in again." });
            });
            return;
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.status(404).json({ error: "User not found." });
        }

        if (newPassword) {
            const passPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passPattern.test(newPassword)) {
                return res.status(400).json({
                    error: "Password must be at least 8 characters long and include a letter, a number, and a special character.",
                });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            userData.password = hashedPassword;
            console.log('Password Changed');
        }

        await userData.save();

        res.status(200).json({ message: "Password changed successfully." });
    } catch (error) {
        console.error("Error while editing profile:", error);
        res.status(500).json({ error: "Internal server error. Please try again later." });
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

const downloadInvoice = async (req, res) => {
    console.log('------------downloadInvoice-------------');
    try {
        const { orderId } = req.params;

        const userId = req.session.user;
        if (!userId) return res.redirect('/login');

        const userData = await User.findById(userId).populate({
            path: 'orderHistory',
            populate: { path: 'orderedItems.product', model: 'Product' },
        });

        const orderDetails = await Orders.find({orderId : orderId})
            .populate({
                path: 'orderedItems.product',
                select: 'productName regularPrice salePrice',
            });

        if (!userData) return res.redirect('/login');

        const order = userData.orderHistory.find(o => o.orderId === orderId);
        if (!order) return res.status(404).send('Order not found');

        const invoicesDir = path.join(__dirname, '../invoices');
        if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

        const filePath = path.join(invoicesDir, `invoice-${orderId}.pdf`);
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        const currentDate = new Date();
        const formattedDate = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(currentDate);
        const formattedTime = new Intl.DateTimeFormat('en-IN', { timeStyle: 'short' }).format(currentDate);

        doc.fontSize(18).text('Tax Invoice', { align: 'center', underline: true });
        doc.fontSize(14).text('Sole Heaven IN', { align: 'center' });
        doc.moveDown(2);
        doc.moveTo(50, 105).lineTo(550, 105).stroke();

        const leftColumnX = 50;
        const rightColumnX = 300;
        const startY = 120;

        doc.fontSize(10).text('Sold by:', leftColumnX, startY, { underline: true });
        doc.text('Sole Heaven No 6', leftColumnX, startY + 15);
        doc.text('India', leftColumnX, startY + 30);
        doc.text('Pin: 688888', leftColumnX, startY + 45);

        doc.fontSize(10).text(`Order ID: ${order.orderId.slice(-12)}`, rightColumnX, startY);
        doc.text(`Invoice No: ${Math.random().toString(36).substring(2, 10)}`, rightColumnX, startY + 15);
        doc.text(`Order Date: ${formattedDate}, ${formattedTime}`, rightColumnX, startY + 30);
        doc.text(`Invoice Date: ${formattedDate}, ${formattedTime}`, rightColumnX, startY + 45);
        doc.text(`Payment Method: ${order.paymentMethod}`, rightColumnX, startY + 60);

        doc.moveTo(50, startY + 80).lineTo(550, startY + 80).stroke();

        const shippingAddressY = startY + 100;
        doc.fontSize(10).text('Shipping Address:', leftColumnX, shippingAddressY, { underline: true });
        doc.text(userData.name, leftColumnX, shippingAddressY + 15);
        doc.text(order.address.house, leftColumnX, shippingAddressY + 30);
        doc.text(`${order.address.state}, ${order.address.city}, ${order.address.landMark}`, leftColumnX, shippingAddressY + 45);
        doc.text(`Pin: ${order.address.pincode}`, leftColumnX, shippingAddressY + 60);
        doc.text(`Phone: ${order.address.phone}`, leftColumnX, shippingAddressY + 75);
        doc.moveDown(2);

        const tableTop = shippingAddressY + 110;
        let currentRow = tableTop + 25;
        doc.text('Product Name', 50, currentRow);
        doc.text('Quantity', 200, currentRow);
        doc.text('Regular Price', 250, currentRow);
        doc.text('Sale Price', 340, currentRow);
        doc.text('Discount', 400, currentRow);
        doc.text('Total', 500, currentRow);

        currentRow += 20;
        doc.moveTo(50, currentRow - 2).lineTo(550, currentRow - 2).stroke();
        doc.moveDown();
        doc.font('Helvetica').fontSize(10);
        order.orderedItems.forEach(item => {
            const product = item.product || {};
            const productName = product.productName || 'Unknown Product';
            const regularPrice = product.regularPrice || 0;
            const salePrice = product.salePrice || 0;
            const quantity = item.quantity || 0;
            const amount = salePrice * quantity; 
            const discount = (regularPrice - salePrice) * quantity; 

            doc.text(productName, 50, currentRow, { width: 150, ellipsis: true });
            doc.text(quantity, 216, currentRow);
            doc.text(regularPrice.toFixed(2), 250, currentRow);
            doc.text(salePrice.toFixed(2), 340, currentRow);
            doc.text(discount.toFixed(2), 400, currentRow);
            doc.text(amount.toFixed(2), 500, currentRow);

            currentRow += 30;
        });

        doc.moveTo(50, currentRow + 5).lineTo(550, currentRow + 5).stroke();

        const totalY = currentRow + 15;
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Total Amount:', 350, totalY);
        doc.text(`₹ ${(order.finalAmount).toFixed(2)}`, 450, totalY);

        doc.moveDown();
        doc.text('All values are in INR ₹', 50, 600);
        doc.moveDown(3);
        doc.text('Thank you for shopping with us!',{align : "center"});
      
        doc.fontSize(5).text("*ASSPL-Sole-Heaven Seller Services Pvt. Ltd., ARIPL-Sole Retail India Pvt. Ltd. only where Sole Heaven Retail India Pvt. Ltd. fulfillment center is co-located Customers desirous of availing input GST credit are requested to create a Business account and purchase on SoleHeaven.in/business from Business eligible offers Please note that this invoice is not a demand for payment",{align : "center"})
      
        doc.end();

        stream.on('finish', () => {
            res.download(filePath, `invoice-${orderId}.pdf`, (err) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error downloading invoice');
                }
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Failed to delete file:', err);
                });
            });
        });

        stream.on('error', (err) => {
            console.error('Stream Error:', err);
            res.status(500).send('Failed to generate invoice');
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
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
    validateCurrentPassword,
    downloadInvoice,
}