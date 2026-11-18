const mongoose = require("mongoose");
const Listing = require("../models/listing");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

async function main() {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to MongoDB");

    const sampleListings = [
        {
            title: "Cozy Beachfront Cottage",
            description: "Enjoy a peaceful stay near the ocean.",
            image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2",
            price: 2500,
            location: "Goa",
            country: "India"
        },
        {
            title: "Mountain View Villa",
            description: "Beautiful villa surrounded by mountains.",
            image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233",
            price: 4500,
            location: "Manali",
            country: "India"
        },
        {
            title: "Modern City Apartment",
            description: "A comfortable apartment in the heart of the city.",
            image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c",
            price: 3200,
            location: "Mumbai",
            country: "India"
        }
    ];

    await Listing.insertMany(sampleListings);

    console.log("Sample listings inserted!");

    await mongoose.connection.close();
}

main().catch(console.error);