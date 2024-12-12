const User = require('../../models/userSchema');
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Banner = require('../../models/bannerSchema');
const nodemailer = require('nodemailer');
const env = require('dotenv').config();
const bcrypt = require('bcrypt');
const Wallet = require('../../models/walletSchema');

const pageNotFound = async (req, res) => {
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect('/pageNotFound');
       console.log('Page not found');
    }
}

const loadHomePage = async (req, res) => {
    try {
        console.log('-----------loadHomePage------------');
        const today = new Date().toISOString();
        const findBanner = await Banner.find({
            startDate: { $lt: new Date(today) },
            endDate: { $gt: new Date(today) },
        });

        const categories = await Category.find({ isListed: true });
        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
        });

        productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        productData = productData.slice(0, 4);

        const userId = req.session.user;

        if (userId) {
            const userData = await User.findOne({ _id: userId });

            if (!userData || userData.isBlocked) {
                req.session.destroy();
                return res.render('home', { products: productData, banner: findBanner || [] });
            }

            return res.render('home', { user: userData, products: productData, banner: findBanner || [] });
        }
        res.render('home', { products: productData, banner: findBanner || [] });
    } catch (error) {
        console.error('Error loading the home page:', error);
        res.status(500).send('Server error');
    }
};


const signUpPage = async (req, res) => {
    try {
        return res.render('signUp');
    } catch (error) {
        console.log('Sign-Up page not found');
        res.status(500).send('Server error');
    }
}

function generateOpt(){
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await  transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verfiy your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        })

        return info.accepted.length > 0;
    } catch (error) {

        console.error('Error sending email');
        return false;
        
    }
}

const signUp = async (req, res) => {
    try {
        const {name, phone, email, password, conformPassword} = req.body;
        
        if(password !== conformPassword){
            return res.render('signup', {message: 'Password do not match'});
        }

        const findUser = await User.findOne({email});
        if(findUser){
            return res.render('signup', {message: 'User with this email already exist'});
        }

        const otp = generateOpt();

        const emailSent = await sendVerificationEmail(email, otp);

        if(!emailSent) {
            return res.json('email-error')
        }

        req.session.userOtp = otp;
        req.session.userData = {name, phone, email, password};

        res.render('verify-otp');
        console.log('OTP Sent :', otp)


    } catch (error) {
        console.error('signup-error', error);
        res.redirect('pageNotFound');
    }   
}

const securePassword = async (password) => {
     try {
        const hashPassword = await bcrypt.hash(password,10);
        return hashPassword;
     } catch (error) {
        
     }
}

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log(otp);

        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const hashPassword = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: hashPassword
            });

            await saveUserData.save();
            const userWallet = new Wallet({
                user: saveUserData._id,
                balance: 0,
                transactions: []
            });
    
            await userWallet.save();

            saveUserData.wallet = userWallet._id;
            await saveUserData.save();

            console.log('User and Wallet created:', { user: saveUserData, wallet: userWallet });
    
            req.session.user = saveUserData._id;
            sessionActive = true;
            return res.json({ success: true, redirectUrl: "/" });
        } else {
            return res.status(400).json({ success: false, message: "Invalid OTP, please try again" });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(500).json({ success: false, message: "An error has occurred" });
    }
}

const resendOtp = async (req, res) => {
    try {
        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({success: false, message:"Email not found in session"})
        }

        const otp = generateOpt();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if(emailSent){
            console.log('resend OTP', otp);
            res.status(200).json({success: true, message: "OTP resend successfully"});
        } else {
            res.status(500).json({success: false, message: "Failed to resend otp, Please try again"});
        }
    } catch (error) {
        console.error("Error resending OTP", error);
        res.status(500).json({success: false, message: "Internal server errror, Please try again"});
    }
}

const loginPage = async (req, res) => {
    try {
        console.log('----------loginPage--------')
        if(!req.session.user){
            return res.render('login');
        } else {
            res.redirect('/');
        }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}

const login = async (req, res) => {
    try {
        console.log('------------postLogin------------')
        const { email, password } = req.body;

        const findUser = await User.findOne({ email });

        if (!findUser) {
            return res.render('login', { message: "Email or Password is incorrect" });
        }

        if (findUser.isBlocked) {
            return res.render('login', { message: "User is blocked by admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render('login', { message: "Email or Password is incorrect" });
        }

        req.user = findUser;
        req.user._id = findUser._id;
        req.session.user = {
            _id: findUser._id,
            name: findUser.name,
            email: findUser.email,
        };
        console.log(req.user, req.session.user)

        res.redirect('/');
    } catch (error) {
        console.error('Login error occurred:', error);

        res.render('login', { message: "Login failed. Please try again later." });
    }
};



const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if(err){
                console.log("Error while logout :", err.message);
                return res.redirect('/pageNotFound');
            }
            sessionActive = false;

            console.log('Session Destoryed')

            return res.redirect('/login')
        })
    } catch (error) {
        console.log('Logout Error',error.message);
        res.redirect('/pageNotFound');
    }
}



const getForgotPassword = async (req, res) => {
    try {
        res.render('forgotPassword');
    } catch (error) {
        console.error("Error rendering forgot password page:", error);
        res.redirect('/pageNotFound');
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User with this email does not exist",
            });
        }

        const otp = generateOpt();

        req.session.resetOtp = otp;
        req.session.resetEmail = email;

        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP. Please try again later.",
            });
        }

        console.log("Forgot Password OTP sent: ", otp);

        return res.status(200).json({
            success: true,
            message: "OTP sent to your email. Please verify it to reset your password.",
        });
    } catch (error) {
        console.error("Error in forgot password process:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later.",
        });
    }
};

const verifyForgotPasswordOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        if (otp !== req.session.resetOtp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again.",
            });
        }

        const email = req.session.resetEmail;
        req.session.resetOtp = null;

        console.log("Forgot Password OTP verified for:", email);

        return res.status(200).json({
            success: true,
            redirectUrl: "/resetPassword",
        });
    } catch (error) {
        console.error("Error verifying forgot password OTP:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later.",
        });
    }
};

const getResetPassword = async (req, res) => {
    try {
        res.render('resetPassword');
    } catch (error) {
        console.error("Error rendering forgot password page:", error);
        res.redirect('/pageNotFound');
    }
}

const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;

        const email = req.session.resetEmail;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Session expired. Please restart the password reset process.',
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required.',
            });
        }

        const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordPattern.test(password)) {
            return res.status(400).json({
                success: false,
                message:
                    'Password must be at least 8 characters, include one letter, one number, and one special character.',
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user.password = hashedPassword;
        await user.save();

        req.session.resetEmail = null;
        req.session.resetOtp = null;

        return res.json({
            success: true,
            message: 'Password reset successfully.',
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again later.',
        });
    }
};


const getProductPage = async (req, res) => {
    try {
        const productId = req.query.id;
    
        const product = await Product.findById(productId)
            .populate('category')
            .populate({
                path: 'reviews',
                populate: { path: 'userId', select: 'name' }
            });
            
        const relatedProducts = await Product.find({ 
            category: product.category._id, 
            _id: { $ne: product._id }
        }).limit(4);
    
        if (!product) {
          return res.status(404).send('Product not found');
        }
        res.render('productDetails', { product , relatedProducts});
      } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).send('Server Error');
      }
}

const loadLogin = async(req,res)=>{
    try {
        console.log('------------LoadLogin-----------')
        if(!req.session.user){
            console.log("Rendering the loginpage...");
            return res.render('login')
        }else{
            res.redirect('/')
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}




module.exports = {
    loadHomePage,
    pageNotFound,
    signUpPage,
    signUp,
    verifyOtp,
    resendOtp,
    loginPage,
    login,
    logout,
    getProductPage,
    getForgotPassword,
    forgotPassword,
    verifyForgotPasswordOtp,
    getResetPassword,
    resetPassword,
    loadLogin,
    
}