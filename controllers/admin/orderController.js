const Order = require('../../models/orderSchema');
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const Wallet = require('../../models/walletSchema')
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const nodemailer = require('nodemailer');



const getOrderPage = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate({
                path: 'customer',
                select: 'name'
            })
            .populate({
                path: 'orderedItems.product',
                select: 'productName'
            })
            .populate({
                path: 'address',
                select: 'address',
                match: { 'address.isDeleted': false },
                options: { limit: 1 } 
            })
            .exec();

        // console.log(orders);

        res.render('orderPage', { orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Error fetching orders');
    }
};

const cancelOrder = async (req, res) => {
    const orderId = req.params.orderId;

    try {
        const order = await Order.findById(orderId).populate('orderedItems.product').populate('customer');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        if (order.paymentStatus === 'Paid') {
            const user = order.customer;

            let wallet = await Wallet.findOne({ user: user._id });

            if (!wallet) {
                wallet = new Wallet({ user: user._id, balance: 0 });
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

        for (let item of order.orderedItems) {
            const product = item.product;
            const quantityToRestore = item.quantity;
            const sizeToRestore = item.size;
        
            await Product.findByIdAndUpdate(
                product._id,
                {
                    $inc: {
                        "sizes.$[size].quantity": quantityToRestore
                    }
                },
                {
                    arrayFilters: [
                        { "size.size": sizeToRestore } 
                    ]
                }
            );
        }

        await Order.findByIdAndUpdate(orderId, { status: 'Canceled' }, { new: true });

        res.json({ success: true, message: 'Order successfully canceled and product quantities updated, refund processed' });
    } catch (error) {
        console.error('Error canceling order:', error);
        res.status(500).send('Error canceling order');
    }
};

const getEditOrder =  async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate({
                path: 'orderedItems.product',
                model: 'Product', 
                select: 'productName price'
            });

        console.log(order);
        
        res.render('editOrder', { order });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching order details');
    }
};

const editOrder = async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;

        const order = await Order.findById(orderId).populate('orderedItems.product');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        if (status === 'Delivered' && order.paymentMethod === 'COD') {
            order.paymentStatus = 'Paid';
        }

        if (status !== 'Delivered') {
            for (const item of order.orderedItems) {
                const product = item.product;
                const quantityToRestore = item.quantity;

                await Product.findByIdAndUpdate(product._id, {
                    $inc: { quantity: quantityToRestore }
                });
            }
        }

        order.status = status;
        await order.save();

        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Error updating order:', err);
        res.status(500).send('Error updating order');
    }
};

const getReturnOrderPage = async (req, res) => {
    try {
        const returnOrders = await Order.find({ returnStatus: { $ne: 'Not Requested' } })
            .populate({
                path: 'customer',
                select: 'name email'
            })
            .populate({
                path: 'orderedItems.product',
                select: 'productName'
            })
            .populate({
                path: 'address',
                select: 'address',
                match: { 'address.isDeleted': false },
                options: { limit: 1 }
            })
            .exec();

            console.log(returnOrders)

        res.render('returnOrder', { returnOrders });
    } catch (error) {
        console.error('Error fetching return orders:', error);
        res.status(500).send('Error fetching return orders');
    }
};

const renderUpdateReturnStatusPage = async (req, res) => {
    const { id } = req.params;

    try {
        const order = await Order.findById(id).populate('customer').populate('orderedItems.product');
        if (!order) {
            return res.status(404).send('Order not found');
        }

        res.render('changeReturnStatus', { order });
    } catch (error) {
        console.error('Error rendering update return status page:', error);
        res.status(500).send('Error rendering update return status page');
    }
};


const updateReturnStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { returnStatus, reason } = req.body;

        const order = await Order.findById(id).populate('customer').populate('orderedItems.product');

        if (!order) {
            return res.status(404).send('Order not found');
        }
        order.returnStatus = returnStatus;
        await order.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        const customerEmail = order.customer.email;
        const customerName = order.customer.name;
        const productNames = order.orderedItems.map(item => item.product.productName).join(', ');

        let subject, text;

        if (returnStatus === 'Approved') {

            order.status = 'Returned'
            order.save();

            if (order.paymentStatus === 'Paid') {
                const user = order.customer;
    
                let wallet = await Wallet.findOne({ user: user._id });
    
                if (!wallet) {
                    wallet = new Wallet({ user: user._id, balance: 0 });
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

            subject = 'Your Return Request Has Been Approved';
            text = `Dear ${customerName},

We are pleased to inform you that your return request for ${productNames} has been approved. Our team will arrange to collect the item from your provided address within 1 week.

Please ensure the following to facilitate a smooth pickup process:
- The item should be in its original condition, including all accessories, tags, and packaging.
- Keep the product ready for pickup during business hours.

If you have any specific instructions or need to reschedule the pickup, please feel free to contact us at support@soleheaven.com.

Thank you for choosing Sole Heaven. We value your trust and look forward to serving you again.

Best regards,
Customer Support Team
Sole Heaven`;
        } else if (returnStatus === 'Rejected') {
            order.status = 'Delivered'
            order.save();

            subject = 'Your Return Request Has Been Rejected';
            text = `Dear ${customerName},

We regret to inform you that your return request for ${productNames} has been rejected due to the following reason:
${reason}

If you have any further concerns, please contact us at support@soleheaven.com.

Best regards,
Customer Support Team
Sole Heaven`;
        }

        await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: customerEmail,
            subject,
            text,
        });

        res.redirect('/admin/returnOrders');
    } catch (error) {
        console.error('Error updating return status:', error);
        res.status(500).send('Error updating return status');
    }
};




module.exports = {
    getOrderPage,
    cancelOrder,
    getEditOrder,
    editOrder,
    getReturnOrderPage,
    updateReturnStatus,
    renderUpdateReturnStatusPage,
}