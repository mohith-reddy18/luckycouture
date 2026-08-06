const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  listMeasurementProfiles,
  createMeasurementProfile,
  updateMeasurementProfile,
  deleteMeasurementProfile,
  duplicateMeasurementProfile,
  listUsers,
  setUserStatus,
} = require("../controllers/userController");

const router = express.Router();

router.use(protect);

router.patch("/me", updateProfile);

router.post("/me/addresses", addAddress);
router.patch("/me/addresses/:addressId", updateAddress);
router.delete("/me/addresses/:addressId", deleteAddress);

router.get("/me/measurements", listMeasurementProfiles);
router.post("/me/measurements", createMeasurementProfile);
router.patch("/me/measurements/:profileId", updateMeasurementProfile);
router.delete("/me/measurements/:profileId", deleteMeasurementProfile);
router.post("/me/measurements/:profileId/duplicate", duplicateMeasurementProfile);

router.get("/", authorize("admin"), listUsers);
router.patch("/:id/status", authorize("admin"), setUserStatus);

module.exports = router;
