const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const bcrypt = require('bcrypt');
// const Order = require('../../models/orderSchema');


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
        
        const addresses = await Address.find({ userId: user._id });
        res.render('address', { user, addresses: addresses[0]?.address || [] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}

const addAddress = async (req, res) => {
    const { addressType, name, city, landMark, state, pincode, phone } = req.body;
    try {
        // Create new address
        const address = {
            addressType,
            name,
            city,
            landMark,
            state,
            pincode,
            phone
        };
        
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).send('User not found');

        const userAddress = await Address.findOne({ userId: user._id });
        if (userAddress) {
            userAddress.address.push(address);
            await userAddress.save();
        } else {
            const newAddress = new Address({
                userId: user._id,
                address: [address]
            });
            await newAddress.save();
        }
        res.redirect('/manageAddress');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}

module.exports = {
    userProfile,
    getOrders,
    editProfile,
    getAddressPage,
    addAddress,
}