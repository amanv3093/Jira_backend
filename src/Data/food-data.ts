import { ObjectId } from "mongodb"; 

interface Restaurant {
  id: string;  
  name: string;
  location: string;
  rating: number;
}

interface FoodItem {
  id: number;
  name: string;
  restaurant: Restaurant;
  price: number;
  cuisine: string;
  category: string;
  is_veg: boolean;
  ingredients: string[];
  rating: number;
  delivery_time: string;
  discount: number;
  image_url: string;
  description: string;
}

const foodData: FoodItem[] = [
  {
    id: 1,
    name: "Margherita Pizza",
    restaurant: {
      id: new ObjectId().toString(),  
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

export default foodData;
