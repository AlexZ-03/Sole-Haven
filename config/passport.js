const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
const env = require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
},

async (accessToken, refreshToken, profile, done) => {
    try {
        // Try finding the user by Google ID first
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            // If user is found by Google ID, return it
            return done(null, user);
        } else {
            // If no user found by Google ID, try finding by email
            user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
                // If user is found by email, update the Google ID
                user.googleId = profile.id;
                await user.save();
                return done(null, user);
            } else {
                // If no user is found by Google ID or email, create a new one
                user = new User({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    googleId: profile.id,
                });
                await user.save();
                return done(null, user);
            }
        }
    }  catch (error) {
        return done(error, null);
    }
}
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id)
    .then(user => {
        done(null, user)
    })
    .catch (err => {
        done(err, null);
    })
})

module.exports = passport;