const express = require('express');
const app = express();
const path = require('path');
const env = require('dotenv').config();
const session = require('express-session');
const db = require('./config/db');
const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter');
const passport = require('./config/passport');
const { setUser } = require('./middlewares/auth');
const logger = require('./middlewares/logger');
const cluster = require('cluster');
const os = require('os');
const nocache = require("nocache");
const flash = require('connect-flash');


// app.use(logger);



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 72 * 60 * 60 * 1000
  }
}))

app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

app.use(nocache())
app.use(passport.initialize());
app.use(passport.session());

app.use(setUser);
app.set('view engine', 'ejs');
app.set('views', [
  path.join(__dirname, '/views/user'),
  path.join(__dirname, '/views/admin')
]);
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', userRouter);
app.use('/admin', adminRouter);

app.get('*', (req, res) => {
  const userId = req.session.user || req.user;
  if (userId) {
    res.redirect("/pageNotFound")
  } else {
    res.redirect('/login');
  }
});

const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     console.log(`Server running on : http://localhost:${PORT}`);
// });

db().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.log(err);
})


module.exports = app;