const User = require('../models/userSchema');

const userAuth = (req, res, next) => {
    if(req.session.user){
        User.findById(req.session.user)
        .then(data => {
            if(data && !data.isBlocked) {
                next();
            } else {
                res.redirect('/login')
            }
        })
        .catch(error => {
            console.log("Error in userAuth", error);
            res.status(500).send("Internal server error");
        })
    } else {
        res.redirect('/login');
    }
}

const adminAuth = (req, res, next) => {
    User.findOne({isAdmin: true})
    .then(data => {
        if(data){
            next();
        } else{
            res.redirect('/admin/login')
        }
    })
    .catch (error => {
        console.log("Error in adminAuth", error);
        res.status(500).send('Internal server error');
    })
}

const setUser = async (req, res, next) => {
    if (req.user) {
        try {
            const user = await User.findById(req.user._id);
            if (user) {
                res.locals.user = user;
            }
        } catch (error) {
            console.error('Error setting user in locals:', error);
        }
    }
    next();
};


module.exports = {
    userAuth,
    adminAuth,
    setUser,
}