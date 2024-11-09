const User = require('../../models/userSchema');

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

const signUp = async (req, res) => {
    const {name, email, phone, password, comformPassword} = req.body;
    try {
        const newUser = new User({name, email, phone, password});

        await newUser.save();

        res.redirect('/signUp');
    } catch (error) {
        console.log('Sign-up Error for save user', error);
        res.status(500).send('Internal server error');
    }   
}

module.exports = {
    loadHomePage,
    pageNotFound,
    signUpPage,
    signUp,
    
}