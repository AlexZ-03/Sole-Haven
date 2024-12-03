const User = require('../models/userSchema');

// const userAuth = (req, res, next) => {
//     if(req.session.user){
//         User.findById(req.session.user)
//         .then(data => {
//             if(data && !data.isBlocked) {
//                 next();
//             } else {
//                 res.redirect('/login')
//             }
//         })
//         .catch(error => {
//             console.log("Error in userAuth", error);
//             res.status(500).send("Internal server error");
//         })
//     } else {
//         res.redirect('/login');
//     }
// }

const userAuth = async (req, res, next) => {
    try {
        const userId = req.session.user || req.user;

        if (userId) {
            const user = await User.findById(userId);

            if (user) {
                
                if (user.isBlocked) {
                    console.log("User is blocked:", userId);
                  
                    req.session.destroy((err) => {
                        if (err) {
                            console.error("Error destroying session:", err);
                        }
                        
                        res.redirect("/login");
                    });
                } else {
                    
                    res.locals.user = user;
                    next();
                }
            } else {
                console.log("User not found in database:", userId);
                res.redirect("/login");
            }
        } else {
            res.redirect("/login");
        }
    } catch (error) {
        console.error("Error in user auth middleware:", error);
        next(error);
    }
};

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
            const user = await User.findById(req.user._id );
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