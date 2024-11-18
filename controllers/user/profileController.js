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


module.exports = {
    userProfile,
    getOrders,
    editProfile,
    getAddressPage,
    addAddress,
    deleteAddress,
}