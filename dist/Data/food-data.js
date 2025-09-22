"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const foodData = [
    {
        id: 1,
        name: "Margherita Pizza",
        restaurant: {
            id: new mongodb_1.ObjectId().toString(),
            name: "Pizza Hub",
            location: "Downtown",
            rating: 4.5
        },
        price: 299,
        cuisine: "Italian",
        category: "Pizza",
        is_veg: true,
        ingredients: ["Tomato", "Mozzarella", "Basil"],
        rating: 4.5,
        delivery_time: "30 mins",
        discount: 10,
        image_url: "https://www.vegrecipesofindia.com/wp-content/uploads/2020/12/margherita-pizza-4-1152x1536.jpg",
        description: "Classic margherita pizza with fresh mozzarella and basil."
    },
];
exports.default = foodData;
