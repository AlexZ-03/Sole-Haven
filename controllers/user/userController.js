const User = require('../../models/userSchema');
const nodemailer = require('nodemailer');
const env = require('dotenv').config();
const bcrypt = require('bcrypt');

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
        return res.render('home');
    } catch (error) {
        console.log('Home page not found');
        res.status(500).send('Server error');
    }
}

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
            req.session.user = saveUserData._id;

            // Send a single response on successful OTP verification
            return res.json({ success: true, redirectUrl: "/" });
        } else {
            // Send a single response if OTP is invalid
            return res.status(400).json({ success: false, message: "Invalid OTP, please try again" });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        // Send a single error response for unexpected errors
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

module.exports = {
    loadHomePage,
    pageNotFound,
    signUpPage,
    signUp,
    verifyOtp,
    resendOtp,
    
}