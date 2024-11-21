const Order = require('../../models/orderSchema');
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");


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
        const order = await Order.findById(orderId).populate('orderedItems.product');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        for (let item of order.orderedItems) {
            const product = item.product;
            const quantityToRestore = item.quantity;

            await Product.findByIdAndUpdate(product._id, {
                $inc: { quantity: quantityToRestore }
            });
        }
        await Order.findByIdAndUpdate(orderId, { status: 'Canceled' }, { new: true });

        res.json({ success: true, message: 'Order successfully canceled and product quantities updated' });
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

        // Fetch the order to perform additional updates
        const order = await Order.findById(orderId).populate('orderedItems.product');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // If the status is anything other than "Delivered," update the product quantities
        if (status !== 'Delivered') {
            for (const item of order.orderedItems) {
                const product = item.product;
                const quantityToRestore = item.quantity;

                // Update the product stock
                await Product.findByIdAndUpdate(product._id, {
                    $inc: { quantity: quantityToRestore }
                });
            }
        }

        // Update the order status
        order.status = status;
        await order.save();

        // Redirect to orders page
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Error updating order:', err);
        res.status(500).send('Error updating order');
    }
};




module.exports = {
    getOrderPage,
    cancelOrder,
    getEditOrder,
    editOrder,
}