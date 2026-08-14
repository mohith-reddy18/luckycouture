const { body } = require("express-validator");

const DIFFICULTY_LEVELS = ["simple", "moderate", "heavy"];
const DESIGN_STATUSES = ["active", "draft", "pending_review", "rejected", "archived"];

const designCreateRules = [
  body("title").trim().notEmpty().withMessage("Design title is required"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("description").optional().trim(),
  body("difficultyLevel")
    .optional()
    .isIn(DIFFICULTY_LEVELS)
    .withMessage(`Difficulty level must be one of: ${DIFFICULTY_LEVELS.join(", ")}`),
  body("status")
    .optional()
    .isIn(DESIGN_STATUSES)
    .withMessage(`Status must be one of: ${DESIGN_STATUSES.join(", ")}`),
  body("designCost")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Design cost must be a non-negative number"),
  body("standardFabricQty")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Standard fabric quantity must be a non-negative number"),
  body("estimatedPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Estimated price must be a non-negative number"),
  body("estimatedStitchingDays")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Estimated stitching days must be a positive integer"),
  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer"),
  body("isFeatured").optional().isBoolean().withMessage("isFeatured must be true or false"),
  body("garment").optional().trim(),
  body("designType").optional().trim(),
  body("availableFabrics").optional().isArray().withMessage("Available fabrics must be an array of strings"),
  body("fabricRecommendation").optional().isArray().withMessage("Fabric recommendation must be an array of strings"),
  body("occasion").optional().isArray().withMessage("Occasion must be an array of strings"),
  body("tags").optional().isArray().withMessage("Tags must be an array of strings"),
];

const designUpdateRules = [
  body("title").optional().trim().notEmpty().withMessage("Design title cannot be blank"),
  body("category").optional().trim().notEmpty().withMessage("Category cannot be blank"),
  body("description").optional().trim(),
  body("difficultyLevel")
    .optional()
    .isIn(DIFFICULTY_LEVELS)
    .withMessage(`Difficulty level must be one of: ${DIFFICULTY_LEVELS.join(", ")}`),
  body("status")
    .optional()
    .isIn(DESIGN_STATUSES)
    .withMessage(`Status must be one of: ${DESIGN_STATUSES.join(", ")}`),
  body("designCost")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Design cost must be a non-negative number"),
  body("standardFabricQty")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Standard fabric quantity must be a non-negative number"),
  body("estimatedPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Estimated price must be a non-negative number"),
  body("estimatedStitchingDays")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Estimated stitching days must be a positive integer"),
  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer"),
  body("isFeatured").optional().isBoolean().withMessage("isFeatured must be true or false"),
  body("garment").optional().trim(),
  body("designType").optional().trim(),
  body("availableFabrics").optional().isArray().withMessage("Available fabrics must be an array of strings"),
  body("fabricRecommendation").optional().isArray().withMessage("Fabric recommendation must be an array of strings"),
  body("occasion").optional().isArray().withMessage("Occasion must be an array of strings"),
  body("tags").optional().isArray().withMessage("Tags must be an array of strings"),
];

module.exports = { designCreateRules, designUpdateRules };
