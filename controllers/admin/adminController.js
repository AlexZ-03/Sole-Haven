const User = require('../../models/userSchema');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');


const pageNotFound = async (req, res) => {
    try {
        res.render("pageError")
    } catch (error) {
        res.redirect('/pageError');
       console.log('Page not found');
    }
}


const loadLogin = async (req, res) => {
        if(req.session.admin){
            return res.redirect("/admin/dashboard")
        }
        res.render("admin-login.ejs", {message: null})
}

const login = async (req, res) => {
    try {
        const {email, password} = req.body;
        const admin = await User.findOne({email, isAdmin: true});

        if(admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if(passwordMatch) {
                req.session.admin = true;
                return res.redirect('/admin');
            } else{
                return res.redirect('/admin/login');
            }
        } else {
            return res.redirect("/login")
        }
    } catch (error) {
        console.log("login error", error);
        return res.redirect("/pageError");
    }
}

const loadDashboard = async (req, res) => {
    if(req.session.admin) {
        try {
            res.render('dashboard');
        } catch (error) {
            res.redirect('/pageError');
        }
    }
}


const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if(err) {
                console.log('Error while destroying session'. err);
                return res.redirect("/pageNotFound");
            }
            console.log('admin logged out');
            res.redirect('/admin/login')
        })
    } catch (error) {
        console.log("Unexpected error during logout", error);
        res.redirect('pageNotFound');
    }
}











module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageNotFound,
    logout,
}