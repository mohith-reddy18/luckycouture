const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { listCategories, createCategory, updateCategory, deleteCategory } = require("../controllers/categoryController");

const router = express.Router();

router.get("/", listCategories);
router.post("/", protect, authorize("admin"), createCategory);
router.patch("/:id", protect, authorize("admin"), updateCategory);
router.delete("/:id", protect, authorize("admin"), deleteCategory);

module.exports = router;
