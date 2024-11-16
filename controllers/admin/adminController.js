const User = require('../../models/userSchema');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');



const pageError = async (req, res) => {
    try {
        res.render("pageError");
    } catch (error) {
        console.log('Error rendering pageError:', error);
        res.status(500).send("Internal Server Error");
    }
};



const loadLogin = async (req, res) => {
        if(req.session.admin){
            return res.redirect("/admin")
        }
        const message = req.session.message;
        req.session.message = null;
        res.render("admin-login.ejs", {message})
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
                req.session.message = "Wrong password";
                return res.redirect('/admin/login');
            }
        } else {
            req.session.message = "Admin not found";
            return res.redirect("/admin/login")
        }
    } catch (error) {
        console.log("login error", error);
        return res.redirect("/admin/pageError");
    }
}

const loadDashboard = async (req, res) => {
        try {
            res.render('dashboard');
        } catch (error) {
            res.redirect('/admin/pageError');
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
    pageError,
    logout,
}