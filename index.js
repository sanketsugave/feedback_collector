const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const Review = require("./models/review");
const User = require("./models/user");
const Bcrypt = require("bcrypt");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const methodOverride = require('method-override');
require('dotenv').config();


const app = express();


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on("error" , console.error.bind(console, "connection error"));
db.once("open", () => {
    console.log("Database connected");
});


// app.use((req, res, next) => {
//     res.locals.userId = req.session.userId || null;
//     next();
// });

function isLoggedIn(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login'); // or send 401 if it's an API
    }
    next();
}

app.use(session({
    secret: 'thisshouldbeabettersecret',  // change in production
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        touchAfter: 24 * 3600 // session only updates once a day
    }),
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24  // 1 day
    }
}));

app.use(flash());

app.use(methodOverride('_method'));


app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.session.userId ? req.session.userId : null;
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname , 'views'));

app.use(expressLayouts);
app.set('layout', 'layouts/boilerplate'); // default layout path inside views folder

app.use(express.urlencoded({ extended: true }));

app.use(async (req, res, next) => {
    if (req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            res.locals.currentUser = user;
        } catch (err) {
            console.error("Error finding user in middleware:", err);
            res.locals.currentUser = null;
        }
    } else {
        res.locals.currentUser = null;
    }
    next();
});

app.get('/home', async (req, res) => {
    console.log("💻 res.locals.currentUser:", res.locals.currentUser);
    res.render('home');
});



app.get('/review', isLoggedIn , async (req,res) =>{
    const allReviews = await Review.find({user: req.session.userId }).populate('user');
    res.render('review', { reviews: allReviews });
})

app.post('/review', isLoggedIn, async (req,res) =>{
    if (!email || !password) {
      req.flash('error', 'Email and password required');
      return res.redirect('/user');
    }

    if (!req.session.userId) {
        return res.status(401).send("Please log in to submit a review");
    }

    const newReview = new Review({
        review: req.body.review,
        user: req.session.userId
    });

    await newReview.save();
    console.log("Data saved successfully");
    res.redirect('/review');
});

app.get('/user', (req,res) => {
    res.render('login/register');
});

app.post('/user', async(req,res) =>{
    if (!email || !password) {
       req.flash('error', 'Email and password required');
       return res.redirect('/user');
    }

    const { email, password } = req.body.user;
    const newUser = await new User({ email, password });
    await newUser.save();
    req.flash('success', 'Registered successfully!');
    res.redirect('/home');
});

app.get('/login', (req,res) => {
    res.render('login/login');
})

app.post('/login', async(req,res) =>{
    const { email, password } = req.body.user;

    const foundUser = await User.findOne({ email });

    if (!foundUser) {
        return res.status(400).send("❌ Email not registered");
    }

    const isMatch = await foundUser.comparePassword(password);

    if (isMatch) {
        req.session.userId = foundUser._id; 
        // req.session.userId = 1; 
        res.redirect('/home');
        } else {
        res.status(401).send("❌ Incorrect password");
    }
    
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/home');
});

// Delete
app.delete('/review/:id', isLoggedIn, async (req, res) => {
  await Review.findByIdAndDelete(req.params.id);
  req.flash('success', 'Review deleted!');
  res.redirect('/review');
});

// Edit form
app.get('/review/:id/edit', isLoggedIn, async (req, res) => {
  const review = await Review.findById(req.params.id);
  res.render('edit', { review });
});

// Update
app.put('/review/:id', isLoggedIn, async (req, res) => {
  const { review } = req.body;
  await Review.findByIdAndUpdate(req.params.id, { review });
  req.flash('success', 'Review updated!');
  res.redirect('/review');
});

// Edit form route
app.get('/review/:id/edit', isLoggedIn, async (req, res) => {
  const review = await Review.findById(req.params.id);
  res.render('edit', { review });
});

// Update route
app.put('/review/:id', isLoggedIn, async (req, res) => {
  const { review } = req.body;
  await Review.findByIdAndUpdate(req.params.id, { review });
  req.flash('success', 'Review updated successfully!');
  res.redirect('/review');
});



const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
});