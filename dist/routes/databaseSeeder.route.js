"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const databaseSeeder_1 = __importDefault(require("../controllers/databaseSeeder"));
const router = (0, express_1.Router)();
const { DatabaseSeeder, GetRestaurantById, GetUser } = new databaseSeeder_1.default();
router.route("/foodData-Seeder").post(DatabaseSeeder);
router.route("/GetRestaurantById/:id").get(GetRestaurantById);
router.route("/user").get(GetUser);
exports.default = router;
