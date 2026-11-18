const express = require("express");
const mongoose = require("mongoose");
const Listing = require("./models/listing");
const methodOverride = require("method-override");
const passport = require("passport"); //authentication next 4
const LocalStrategy = require("passport-local");
const session = require("express-session");
const User = require("./models/user");
const Review = require("./models/review");
const Booking = require("./models/booking");

const app = express();
app.use(express.urlencoded({ extended: true })); 
//authentication middleware start
app.use(session({
    secret: "wanderlust-secret",
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
//end
app.use(methodOverride("_method"));
app.use(express.static("public"));
app.set("view engine", "ejs");
main()
.then(() => {
    console.log("Connected to MongoDB");
})
.catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");
}


const port = 8080;
// Authentication middleware
const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }

    next();
};
//isOwnermiddleware
const isOwner = async (req, res, next) => {
    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
        return res.status(404).send("Listing not found");
    }

    if (!listing.owner || !listing.owner.equals(req.user._id)) {
        return res.status(403).send("You don't have permission to do this");
    }

    next();
};
app.get("/", async (req, res) => {

    const search = req.query.search;
    const category = req.query.category;

    let listings;

    if (search) {

        listings = await Listing.find({
            $or: [
                { title: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } },
                { country: { $regex: search, $options: "i" } }
            ]
        });

    } else if (category) {

        listings = await Listing.find({
            category: category
        });

    } else {

        listings = await Listing.find({});

    }

    res.render("home.ejs", { listings });
});
// Show the new listing form
app.get("/listings/new", isLoggedIn, (req, res) => {
    res.render("new.ejs");
});

// Create a new listing
app.post("/listings", isLoggedIn, async (req, res) => {

    const newListing = new Listing({
        title: req.body.title,
        description: req.body.description,
        image: req.body.image || undefined,
        price: req.body.price,
        location: req.body.location,
        country: req.body.country,
        category: req.body.category,
        owner: req.user._id
    });

    await newListing.save();

    res.redirect("/");
});
//listing get
app.get("/listings/:id", async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            }
        });

    res.render("listing.ejs", { listing });

});
// Show edit form
app.get("/listings/:id/edit", isLoggedIn, isOwner, async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id);

    res.render("edit.ejs", { listing });
});
// Update listing
app.put("/listings/:id", isLoggedIn, isOwner, async (req, res) => {
    const { id } = req.params;

    const updatedData = { ...req.body };

    if (!updatedData.image) {
        delete updatedData.image;
    }

    await Listing.findByIdAndUpdate(id, updatedData, {
        runValidators: true
    });

    res.redirect(`/listings/${id}`);
});
// Delete listing
app.delete("/listings/:id", isLoggedIn,isOwner, async (req, res) => {

    const { id } = req.params;

    await Listing.findByIdAndDelete(id);

    res.redirect("/");
});
// Signup form
app.get("/signup", (req, res) => {
    res.render("signup.ejs");
});

// Register new user
app.post("/signup", async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        const newUser = new User({
            username,
            email
        });

        const registeredUser = await User.register(newUser, password);

        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }

            res.redirect("/");
        });

    } catch (err) {
        res.send(err.message);
    }
});
// Login form
app.get("/login", (req, res) => {
    res.render("login.ejs");
});

// Login user
app.post("/login",
    passport.authenticate("local", {
        failureRedirect: "/login"
    }),
    (req, res) => {
        res.redirect("/");
    }
);
app.post("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }

        res.redirect("/");
    });
});
// Create a review
app.post("/listings/:id/reviews", isLoggedIn, async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id);

    const newReview = new Review({
        comment: req.body.comment,
        rating: req.body.rating,
        author: req.user._id
    });

    await newReview.save();

    listing.reviews.push(newReview._id);

    await listing.save();

    res.redirect(`/listings/${id}`);
});
// Show booking form
app.get("/listings/:id/book", isLoggedIn, async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
        return res.status(404).send("Listing not found");
    }

    res.render("booking.ejs", { listing });
});
// Create a booking
app.post("/listings/:id/book", isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const { checkIn, checkOut } = req.body;

    const listing = await Listing.findById(id);

    if (!listing) {
        return res.status(404).send("Listing not found");
    }

    const startDate = new Date(`${checkIn}T00:00:00.000Z`);
    const endDate = new Date(`${checkOut}T00:00:00.000Z`);

    // Validate dates
const today = new Date();
today.setHours(0, 0, 0, 0);

if (
    isNaN(startDate.getTime()) ||
    isNaN(endDate.getTime()) ||
    startDate < today ||
    endDate <= startDate
) {
    return res.status(400).send("Please select valid booking dates.");
}
    // Check booking availability
const existingBooking = await Booking.findOne({
    listing: listing._id,
    status: "Confirmed",
    checkIn: { $lt: endDate },
    checkOut: { $gt: startDate }
});

if (existingBooking) {
    return res.status(400).send(
        "Sorry! This property is already booked for these dates."
    );
}

    // Calculate number of nights
    const nights = (endDate - startDate) / (1000 * 60 * 60 * 24);

    // Calculate total price
    const totalPrice = nights * listing.price;

    const newBooking = new Booking({
        listing: listing._id,
        guest: req.user._id,
        checkIn: startDate,
        checkOut: endDate,
        totalPrice: totalPrice
    });

await newBooking.save();

res.redirect(`/bookings/${newBooking._id}/confirmation`);
});
// Booking confirmation page
app.get("/bookings/:id/confirmation", isLoggedIn, async (req, res) => {
    const { id } = req.params;

    const booking = await Booking.findById(id)
        .populate("listing")
        .populate("guest");

    if (!booking) {
        return res.status(404).send("Booking not found");
    }

    if (!booking.guest._id.equals(req.user._id)) {
        return res.status(403).send("Access denied");
    }

    res.render("confirmation.ejs", { booking });
});
// My Bookings Dashboard
// app.get("/my-bookings", isLoggedIn, async (req, res) => {

//     const bookings = await Booking.find({
//         guest: req.user._id
//     })
//     .populate("listing")
//     .sort({ checkIn: -1 });

//     res.render("myBookings.ejs", { bookings });
// });
app.get("/my-bookings", isLoggedIn, async (req, res) => {

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [upcomingBookings, pastBookings, cancelledBookings] =
        await Promise.all([

            Booking.find({
                guest: req.user._id,
                status: "Confirmed",
                checkOut: { $gte: today }
            })
            .populate("listing")
            .sort({ checkIn: 1 }),

            Booking.find({
                guest: req.user._id,
                status: "Confirmed",
                checkOut: { $lt: today }
            })
            .populate("listing")
            .sort({ checkIn: -1 }),

            Booking.find({
                guest: req.user._id,
                status: "Cancelled"
            })
            .populate("listing")
            .sort({ checkIn: -1 })

        ]);

    res.render("myBookings.ejs", {
        upcomingBookings,
        pastBookings,
        cancelledBookings
    });
});
// Cancel a booking
app.post("/bookings/:id/cancel", isLoggedIn, async (req, res) => {
    const { id } = req.params;

    const booking = await Booking.findById(id);

    if (!booking) {
        return res.status(404).send("Booking not found");
    }

    // Check booking ownership
    if (!booking.guest.equals(req.user._id)) {
        return res.status(403).send("You cannot cancel this booking");
    }

    // Check booking status
    if (booking.status === "Cancelled") {
        return res.status(400).send("Booking is already cancelled");
    }

    booking.status = "Cancelled";

    await booking.save();

    res.redirect("/my-bookings");
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});