const mongoose = require("mongoose");
const Listing = require("../models/listing");

async function main() {
    await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");

    await Listing.updateOne(
        { title: "Cozy Beachfront Cottage" },
        { $set: { category: "Beaches" } }
    );

    await Listing.updateOne(
        { title: "Mountain View Villa" },
        { $set: { category: "Mountains" } }
    );

    await Listing.updateOne(
        { title: "Modern City Apartment" },
        { $set: { category: "City" } }
    );

    console.log("Categories updated!");

    await mongoose.connection.close();
}

main().catch(console.error);