const User = require('../../models/userSchema');
const mongoose = require('mongoose');


const customerInfo = async (req, res) => {
    try {
        let search = "";
        if(req.query.search){
            search = req.query.search;
        }
        let page = 1;
        if(req.query.page){
            page = req.query.page;
        }
        const limit = 5;
        const userData = await User.find({
            isAdmin: false,
            $or: [
                {name: {$regex: ".*"+search+".*"}},
                {email: {$regex: ".*"+search+".*"}}
            ],
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec();

        const count = await User.find({
            isAdmin: false,
            $or: [
                {name: {$regex: ".*"+search+".*"}},
                {email: {$regex: ".*"+search+".*"}}
            ],
        })
        .countDocuments();

        res.render('customers', { data: userData, page, totalPages: Math.ceil(count / limit) });
    } catch (error) {
        
    }
}

const customerBlock = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({_id: id}, {$set: {isBlocked: true}});
        const user = await User.findOne({ _id: id }).select('name');
        console.log(`user ${user.name} is Blocked`);
        res.redirect("/admin/users");
    } catch (error) {
        console.log('Error as occurred during customerBlock', error);
        res.status(500).send("Internal Server Error");
    }
}

const customerUnblock = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({_id: id}, {$set: {isBlocked: false}});
        const user = await User.findOne({ _id: id }).select('name');
        console.log(`user ${user.name} is Unblocked`);
        res.redirect('/admin/users');
    } catch (error) {
        console.log("Error as occured during customerUnblock");
        res.status(500).send("Internal Server Error");
        }
}


module.exports = {
    customerInfo,
    customerBlock,
    customerUnblock,
}