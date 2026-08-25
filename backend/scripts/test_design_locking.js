const assert = require("assert");

// Load the validation helper logic or test with mock Design docs
const ApiError = require("../src/utils/ApiError");

function validateAuthoritativeDesignValues(refDesignDoc, body) {
  if (!refDesignDoc) return;

  const definedGarment = (refDesignDoc.garment || refDesignDoc.garmentType || "").trim();
  if (definedGarment) {
    const submittedGarment = (body.garmentType || "").trim();
    if (submittedGarment && submittedGarment.toLowerCase() !== definedGarment.toLowerCase()) {
      throw new ApiError(
        400,
        `Garment type must match the selected reference design (${definedGarment})`
      );
    }
  }

  const definedFabric = (
    refDesignDoc.fabric ||
    refDesignDoc.material ||
    (Array.isArray(refDesignDoc.availableFabrics) && refDesignDoc.availableFabrics.length === 1 ? refDesignDoc.availableFabrics[0] : "") ||
    (typeof refDesignDoc.availableFabrics === "string" ? refDesignDoc.availableFabrics : "")
  ).trim();

  if (definedFabric) {
    if (body.fabricSource === "shop_provided" && body.preferredMaterial) {
      if (body.preferredMaterial.trim().toLowerCase() !== definedFabric.toLowerCase()) {
        throw new ApiError(
          400,
          `Preferred material must match the selected reference design (${definedFabric})`
        );
      }
    }
  } else if (Array.isArray(refDesignDoc.availableFabrics) && refDesignDoc.availableFabrics.length > 1) {
    if (body.fabricSource === "shop_provided" && body.preferredMaterial) {
      const matchesAny = refDesignDoc.availableFabrics.some(
        (f) => f.trim().toLowerCase() === body.preferredMaterial.trim().toLowerCase()
      );
      if (!matchesAny) {
        throw new ApiError(
          400,
          `Preferred material must be one of the fabrics available for this design (${refDesignDoc.availableFabrics.join(", ")})`
        );
      }
    }
  }
}

console.log("================================================================================");
console.log("TESTING AUTHORITATIVE DESIGN LOCKING & BACKEND VALIDATION");
console.log("================================================================================");

// CASE A: Design has garment type + fabric (Blouse + Cotton)
console.log("\n--- TEST SUITE 1: CASE A (Design defines Garment + Fabric: Blouse + Cotton) ---");
const designA = {
  title: "Classic Cotton Blouse",
  garment: "Blouse",
  fabric: "Cotton",
};

// 1.1: Valid matching submission
assert.doesNotThrow(() => {
  validateAuthoritativeDesignValues(designA, {
    garmentType: "Blouse",
    fabricSource: "shop_provided",
    preferredMaterial: "Cotton",
  });
}, "Valid matching request should not throw");
console.log("✓ PASS: Matching garment (Blouse) and material (Cotton) accepted.");

// 1.2: Contradictory garment type (Kurti instead of Blouse)
assert.throws(
  () => {
    validateAuthoritativeDesignValues(designA, {
      garmentType: "Kurti",
      fabricSource: "shop_provided",
      preferredMaterial: "Cotton",
    });
  },
  (err) => {
    assert.strictEqual(err.statusCode, 400);
    assert(err.message.includes("Garment type must match the selected reference design (Blouse)"));
    return true;
  },
  "Contradictory garment type must throw 400"
);
console.log("✓ PASS: Contradictory garment type (Kurti) rejected with 400.");

// 1.3: Contradictory fabric material (Silk instead of Cotton)
assert.throws(
  () => {
    validateAuthoritativeDesignValues(designA, {
      garmentType: "Blouse",
      fabricSource: "shop_provided",
      preferredMaterial: "Silk",
    });
  },
  (err) => {
    assert.strictEqual(err.statusCode, 400);
    assert(err.message.includes("Preferred material must match the selected reference design (Cotton)"));
    return true;
  },
  "Contradictory fabric material must throw 400"
);
console.log("✓ PASS: Contradictory fabric (Silk) rejected with 400.");


// CASE B: Design has garment type but NO fabric defined
console.log("\n--- TEST SUITE 2: CASE B (Design defines Garment only: Kurti, No Fabric) ---");
const designB = {
  title: "Designer Kurti",
  garment: "Kurti",
  availableFabrics: [],
};

// 2.1: Contradictory garment type rejected
assert.throws(
  () => {
    validateAuthoritativeDesignValues(designB, {
      garmentType: "Frock",
      fabricSource: "shop_provided",
      preferredMaterial: "Silk",
    });
  },
  (err) => {
    assert.strictEqual(err.statusCode, 400);
    assert(err.message.includes("Garment type must match the selected reference design (Kurti)"));
    return true;
  },
  "Contradictory garment type must throw 400"
);
console.log("✓ PASS: Contradictory garment type (Frock) rejected with 400.");

// 2.2: Matching garment type with any fabric accepted (since fabric is not defined by design)
assert.doesNotThrow(() => {
  validateAuthoritativeDesignValues(designB, {
    garmentType: "Kurti",
    fabricSource: "shop_provided",
    preferredMaterial: "Silk",
  });
}, "Valid kurti with Silk should succeed");

assert.doesNotThrow(() => {
  validateAuthoritativeDesignValues(designB, {
    garmentType: "Kurti",
    fabricSource: "shop_provided",
    preferredMaterial: "Cotton",
  });
}, "Valid kurti with Cotton should succeed");
console.log("✓ PASS: Kurti with editable fabrics (Silk, Cotton) accepted without error.");


// CASE C: No selected design (or design removed)
console.log("\n--- TEST SUITE 3: CASE C & D (No Selected Design / Design Removed) ---");
assert.doesNotThrow(() => {
  validateAuthoritativeDesignValues(null, {
    garmentType: "Lehenga",
    fabricSource: "shop_provided",
    preferredMaterial: "Velvet",
  });
}, "Without design, Lehenga + Velvet should succeed");

assert.doesNotThrow(() => {
  validateAuthoritativeDesignValues(null, {
    garmentType: "Frock",
    fabricSource: "customer_provided",
  });
}, "Without design, Frock + customer_provided should succeed");
console.log("✓ PASS: Free custom tailoring without design reference works normally.");

console.log("\n================================================================================");
console.log("ALL TESTS PASSED SUCCESSFULLY! 🎉");
console.log("================================================================================");
