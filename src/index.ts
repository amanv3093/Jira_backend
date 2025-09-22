import express from "express";
import { PORT } from "./constant/constants";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


// seeder routes
import auth from "./routes/auth.route"
app.use("/api/v1/auth", auth);

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();




app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));
