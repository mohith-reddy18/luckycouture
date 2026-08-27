import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Loader2,
  MapPin,
  MessageCircle,
  Check,
  AlertCircle,
  ChevronDown,
  ExternalLink,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import SectionHeading from "../components/SectionHeading";
import StarDivider from "../components/StarDivider";
import { contactInfo } from "../data/mockData";
import api from "../utils/api";
import getImageUrl from "../utils/imageUrl";
import { resolvePrimaryAddress } from "../utils/addressUtils";
import { lookupIndianPincode, isValidPincodeFormat, formatDisplayAddress, verifyDeliveryAddress } from "../utils/addressValidator";
import { calculateShortDistanceDeliveryFee, calculateDeliveryDetails } from "../utils/deliveryPricing";
import SEO from "../components/SEO";
import { useRazorpay } from "../hooks/useRazorpay";
import { calculatePlatformFee } from "../utils/platformFee";

// Helper to uniquely identify a cart item by Product + Color + Size + FabricType
const getItemKey = (item, idx = 0) => {
  if (!item) return `cart-item-${idx}`;
  if (item.itemKey) return item.itemKey;
  const baseId = item._id || item.id || "item";
  const color = (item.color || "").trim().toLowerCase();
  const size = (item.size || "").trim().toLowerCase();
  const fabricType = (item.fabricType || "").trim().toLowerCase();
  return `${baseId}_${color}_${size}_${fabricType}`;
};

export default function Cart() {
  const { cart, updateQty, removeFromCart, notify, user, setCart } = useApp();
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  const [checking, setChecking] = useState(false);
  const [paymentStep, setPaymentStep] = useState("idle"); // "idle" | "creating" | "paying" | "verifying"
  const { openCheckout } = useRazorpay();

  // Stable memoized cart array
  const safeCart = useMemo(() => (Array.isArray(cart) ? cart.filter(Boolean) : []), [cart]);

  // Selection state for Amazon-style cart item selection
  const [selectedItemKeys, setSelectedItemKeys] = useState(() => {
    return new Set(safeCart.map((item, idx) => getItemKey(item, idx)));
  });

  const prevKeysRef = useRef(new Set(safeCart.map((item, idx) => getItemKey(item, idx))));

  // Component lifecycle mount tracker & debounce cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // Keep selection state synchronized strictly when cart items change
  const cartSignature = useMemo(() => safeCart.map((item, idx) => getItemKey(item, idx)).join("|"), [safeCart]);

  useEffect(() => {
    const currentKeys = new Set(safeCart.map((item, idx) => getItemKey(item, idx)));
    setSelectedItemKeys((prev) => {
      // If previous selection is empty and cart just loaded with items, select all
      if (prev.size === 0 && prevKeysRef.current.size === 0 && currentKeys.size > 0) {
        prevKeysRef.current = currentKeys;
        return new Set(currentKeys);
      }

      const next = new Set();
      // Keep selected items that still exist in the cart
      for (const key of currentKeys) {
        if (prev.has(key)) {
          next.add(key);
        } else if (!prevKeysRef.current.has(key)) {
          // If a brand new item was just added to cart, select it by default
          next.add(key);
        }
      }
      prevKeysRef.current = currentKeys;
      return next;
    });
  }, [cartSignature]);

  // Delivery selection state
  const [needsDelivery, setNeedsDelivery] = useState(true);

  // Address state prefilled strictly from primary/default address if available
  const defaultAddr = resolvePrimaryAddress(user?.addresses);
  const [address, setAddress] = useState({
    country: "India",
    line1: defaultAddr?.line1 || "",
    line2: defaultAddr?.line2 || "",
    locality: defaultAddr?.locality || "",
    city: defaultAddr?.city || "",
    state: defaultAddr?.state || "",
    pincode: defaultAddr?.pincode || "",
    phone: user?.phone || "",
  });

  const [pinStatus, setPinStatus] = useState(defaultAddr?.pincode ? "valid" : "idle");
  const [pinError, setPinError] = useState("");
  const [localities, setLocalities] = useState([]);
  const [showSavedPicker, setShowSavedPicker] = useState(false);
  const debounceTimer = useRef(null);

  useEffect(() => {
    const primary = resolvePrimaryAddress(user?.addresses);
    if (primary && isMountedRef.current) {
      setAddress({
        _id: primary._id,
        country: "India",
        line1: primary.line1 || "",
        line2: primary.line2 || "",
        locality: primary.locality || "",
        city: primary.city || "",
        state: primary.state || "",
        pincode: primary.pincode || "",
        phone: user?.phone || "",
        roadDistanceKm: primary.verifiedLocation?.roadDistanceKm != null ? primary.verifiedLocation.roadDistanceKm : null,
        isVerified: Boolean(primary.verifiedLocation?.isVerified),
      });
      setPinStatus("valid");
      setPinError("");
    }
  }, [user]);

  const handlePincodeChange = (e) => {
    const rawVal = (e.target?.value || "").replace(/\D/g, "").slice(0, 6);
    setAddress((prev) => ({
      ...prev,
      _id: undefined,
      isVerified: false,
      roadDistanceKm: null,
      pincode: rawVal,
      city: rawVal.length === 6 ? prev.city : "",
      state: rawVal.length === 6 ? prev.state : "",
    }));

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (rawVal.length < 6) {
      setPinStatus(rawVal.length > 0 ? "typing" : "idle");
      setPinError("");
      setLocalities([]);
      return;
    }

    setPinStatus("loading");
    setPinError("");

    debounceTimer.current = setTimeout(async () => {
      const res = await lookupIndianPincode(rawVal);
      if (!isMountedRef.current) return;
      if (res?.valid) {
        setPinStatus("valid");
        setPinError("");
        setAddress((prev) => ({
          ...prev,
          city: res.city || "",
          state: res.state || "",
          locality: prev.locality || (res.localities && res.localities[0]) || "",
        }));
        setLocalities(res.localities || []);
      } else {
        setPinStatus("invalid");
        setPinError(res?.error || "Please enter a valid Indian PIN code.");
        setAddress((prev) => ({ ...prev, city: "", state: "" }));
        setLocalities([]);
      }
    }, 300);
  };


  const selectSavedAddress = (savedAddr) => {
    if (!savedAddr) return;
    setAddress({
      _id: savedAddr._id,
      country: "India",
      line1: savedAddr.line1 || "",
      line2: savedAddr.line2 || "",
      locality: savedAddr.locality || "",
      city: savedAddr.city || "",
      state: savedAddr.state || "",
      pincode: savedAddr.pincode || "",
      phone: user?.phone || address.phone || "",
      roadDistanceKm: savedAddr.verifiedLocation?.roadDistanceKm != null ? savedAddr.verifiedLocation.roadDistanceKm : null,
      isVerified: Boolean(savedAddr.verifiedLocation?.isVerified),
    });
    setPinStatus("valid");
    setPinError("");
    setShowSavedPicker(false);
  };

  // ── Selection helpers ───────────────────────────────────────────────────
  const allItemKeys = safeCart.map((item, idx) => getItemKey(item, idx));
  const isAllSelected = allItemKeys.length > 0 && allItemKeys.every((k) => selectedItemKeys.has(k));
  const isPartiallySelected = !isAllSelected && allItemKeys.some((k) => selectedItemKeys.has(k));

  const toggleItemSelection = (itemKey) => {
    setSelectedItemKeys((prev) => {
      const next = new Set(prev);
      if (next.has(itemKey)) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemKeys(new Set());
    } else {
      setSelectedItemKeys(new Set(allItemKeys));
    }
  };

  // Filter items selected for checkout
  const selectedItems = safeCart.filter((item, idx) => selectedItemKeys.has(getItemKey(item, idx)));
  const selectedCount = selectedItems.reduce((sum, item) => sum + (Number(item.qty || item.quantity) || 1), 0);
  const selectedSubtotal = selectedItems.reduce(
    (acc, item) => acc + (Number(item.price) || 0) * (Number(item.qty || item.quantity) || 1),
    0
  );

  // Delivery calculation logic based strictly on selected items and road distance
  const deliveryDetails = needsDelivery && selectedCount > 0
    ? calculateDeliveryDetails({
        roadDistanceKm: address?.roadDistanceKm,
        state: address?.state,
        pincode: address?.pincode,
        city: address?.city,
      })
    : null;

  const isShortDistance = Boolean(deliveryDetails?.isShortDistance);
  const isLongDistance = Boolean(deliveryDetails?.isLongDistance);
  const shippingFee = deliveryDetails ? deliveryDetails.deliveryFee : 0;

  const orderBaseAmount = selectedSubtotal + shippingFee;
  const platformFee = selectedCount > 0 ? calculatePlatformFee(orderBaseAmount) : 0;
  const finalTotal = orderBaseAmount + platformFee;

  if (safeCart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-24 text-center">
        <SEO title="Shopping Cart | Lucky Couture" canonical="/cart" robots="noindex, nofollow" />
        <ShoppingBag size={40} className="mx-auto text-primary/30 mb-5" />
        <h1 className="font-display text-2xl font-semibold text-primary mb-2">Your cart is empty</h1>
        <p className="text-ink/60 mb-8">Explore the shop and add pieces you love.</p>
        <Link to="/shop" className="inline-block bg-primary text-bg px-7 py-3 rounded-full font-medium hover:bg-primary/90">
          Browse Shop
        </Link>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (!user) {
      notify("Please sign in to place an order");
      navigate("/login");
      return;
    }

    if (selectedItems.length === 0 || selectedCount === 0) {
      notify("Please select at least one item to proceed to checkout");
      return;
    }

    if (needsDelivery) {
      const pin = String(address?.pincode || "").trim();
      const city = String(address?.city || "").trim();
      const state = String(address?.state || "").trim();
      const line1 = String(address?.line1 || "").trim();
      const phone = String(address?.phone || "").trim();

      if (!pin || !isValidPincodeFormat(pin) || pinStatus === "invalid") {
        notify("Please enter a valid 6-digit Indian PIN code");
        return;
      }
      if (!city || !state) {
        notify("Please ensure your PIN code is verified with a valid city and state");
        return;
      }
      if (!line1) {
        notify("Please enter your street address / road");
        return;
      }
      if (!phone) {
        notify("Please enter a contact phone number for delivery");
        return;
      }

      // Authoritative physical location validation (only if not already verified from saved address)
      if (!address?.isVerified || address?.roadDistanceKm == null) {
        try {
          const verifyRes = await verifyDeliveryAddress({
            line1,
            line2: String(address?.line2 || "").trim(),
            locality: String(address?.locality || "").trim(),
            city,
            state,
            pincode: pin,
            country: "India",
          });
          if (!verifyRes.valid) {
            notify(
              verifyRes.error ||
                "The entered address does not match the PIN code. Please enter the correct address/location or PIN code."
            );
            return;
          }
          if (verifyRes.data?.roadDistanceKm != null) {
            setAddress((prev) => ({
              ...prev,
              roadDistanceKm: verifyRes.data.roadDistanceKm,
              isVerified: true,
            }));
          }
        } catch (verErr) {
          notify(verErr.message || "Address verification failed. Please check your address and PIN code.");
          return;
        }
      }
    }

    if (checking) return;
    setChecking(true);

    const items = selectedItems.map((item) => {
      const rawImage =
        item.image ||
        item.thumbnail?.url ||
        item.images?.[0]?.url ||
        (typeof item.thumbnail === "string" ? item.thumbnail : "") ||
        (typeof item.images?.[0] === "string" ? item.images[0] : "") ||
        item.thumbnail ||
        item.images ||
        "";
      return {
        product: item._id || item.id || item.product,
        name: item.name || "Item",
        image: getImageUrl(rawImage) || (typeof item.image === "string" ? item.image : ""),
        price: Number(item.price) || 0,
        quantity: Number(item.qty || item.quantity) || 1,
        size: item.size || "",
        color: item.color || "",
        fabricCategory: item.fabricCategory || "",
        fabricType: item.fabricType || "",
      };
    });

    const shippingAddress = needsDelivery
      ? {
          _id: address?._id,
          country: "India",
          line1: String(address?.line1 || "").trim(),
          line2: String(address?.line2 || "").trim(),
          locality: String(address?.locality || "").trim(),
          city: String(address?.city || "").trim(),
          state: String(address?.state || "").trim(),
          pincode: String(address?.pincode || "").trim(),
          phone: String(address?.phone || "").trim(),
          roadDistanceKm: address?.roadDistanceKm,
        }
      : {};

    try {
      console.log("[CHECKOUT] Place Order clicked");
      // ── Step 1: Create a pending Razorpay order in our DB ──
      setPaymentStep("creating");
      let orderRes;
      try {
        orderRes = await api.post("/api/orders", {
          items,
          needsDelivery,
          shippingAddress,
          paymentMethod: "razorpay",
        });
      } catch (orderErr) {
        console.error("[CHECKOUT] Order creation failed:", orderErr);
        notify(orderErr.message || "Could not create order — please try again");
        setChecking(false);
        setPaymentStep("idle");
        return;
      }

      const dbOrder = orderRes.data;
      console.log("[CHECKOUT] Backend order created:", dbOrder._id || dbOrder.orderId);

      // ── Step 2: Get Razorpay checkout details from backend ──
      let rzpRes;
      try {
        rzpRes = await api.post("/api/payments/create-order", {
          dbOrderId: dbOrder._id,
        });
      } catch (rzpErr) {
        console.error("[CHECKOUT] Razorpay order creation failed:", rzpErr);
        notify(rzpErr.message || "Could not initialise payment — please try again");
        setChecking(false);
        setPaymentStep("idle");
        return;
      }

      const { razorpayOrderId, amount, currency, keyId, prefill, amountINR, balanceDueINR } = rzpRes.data;
      console.log("[CHECKOUT] Razorpay order created");
      console.log("[CHECKOUT] Razorpay order ID:", razorpayOrderId);

      // ── Step 3: Open Razorpay Checkout JS ──
      setPaymentStep("paying");
      console.log("[CHECKOUT] Opening Razorpay Checkout");

      openCheckout({
        razorpayOrderId,
        amount,
        currency,
        keyId,
        prefill,
        description: `Lucky Couture — 30% Advance (₹${amountINR?.toLocaleString("en-IN")})`,
        onSuccess: async ({ razorpayOrderId: rzpOrderId, razorpayPaymentId, razorpaySignature }) => {
          // ── Step 4: Verify payment signature on the backend ──
          console.log("[CHECKOUT] Razorpay payment successful:", razorpayPaymentId);
          console.log("[CHECKOUT] Verifying payment on server...");
          setPaymentStep("verifying");
          try {
            const verifyRes = await api.post("/api/payments/verify", {
              razorpayOrderId: rzpOrderId,
              razorpayPaymentId,
              razorpaySignature,
              dbOrderId: dbOrder._id,
              orderType: "shopping",
            });

            console.log("[CHECKOUT] Server verification succeeded:", verifyRes);

            // ── Step 5: Clear ONLY purchased items from cart (supports partial checkout) ──
            const purchasedKeys = new Set(selectedItems.map((item, idx) => getItemKey(item, idx)));
            if (typeof setCart === "function") {
              setCart((prev) =>
                Array.isArray(prev) ? prev.filter((item, idx) => !purchasedKeys.has(getItemKey(item, idx))) : []
              );
            }

            const targetOrderId = dbOrder._id || dbOrder.orderId;
            notify("Payment successful — order placed! 🎉");
            if (isMountedRef.current) {
              setChecking(false);
              setPaymentStep("idle");
            }

            // Guaranteed smooth SPA navigation to Order Confirmation page
            navigate(`/orders/shopping/${targetOrderId}`, { replace: true });
          } catch (verifyErr) {
            console.error("[CHECKOUT] Verification failed:", verifyErr);
            notify(verifyErr.message || "Payment verification failed — please contact support");
            if (isMountedRef.current) {
              setChecking(false);
              setPaymentStep("idle");
            }
          }
        },
        onFailure: async (errMsg) => {
          // Guard: Do NOT cancel if verification is already in flight
          if (paymentStep === "verifying") {
            console.log("[CHECKOUT] Verification in flight — skipping cancellation on failure callback.");
            return;
          }
          console.log("[CHECKOUT] Payment failed/cancelled by user. Cleaning up unpaid session...");
          try {
            if (dbOrder?._id) {
              await api.post("/api/payments/cancel-attempt", { dbOrderId: dbOrder._id });
            }
          } catch (cleanErr) {
            console.warn("[CHECKOUT] Cancel cleanup warning:", cleanErr.message);
          }
          notify(errMsg || "Payment failed — your items are still in the cart");
          if (isMountedRef.current) {
            setChecking(false);
            setPaymentStep("idle");
          }
        },
        onDismiss: async () => {
          // Guard: Do NOT cancel if verification is already in flight
          if (paymentStep === "verifying") {
            console.log("[CHECKOUT] Verification in flight — skipping cancellation on dismiss callback.");
            return;
          }
          console.log("[CHECKOUT] Payment dismissed by user. Cleaning up unpaid session...");
          try {
            if (dbOrder?._id) {
              await api.post("/api/payments/cancel-attempt", { dbOrderId: dbOrder._id });
            }
          } catch (cleanErr) {
            console.warn("[CHECKOUT] Cancel cleanup warning:", cleanErr.message);
          }
          notify("Payment cancelled — your items are still in the cart");
          if (isMountedRef.current) {
            setChecking(false);
            setPaymentStep("idle");
          }
        },
      });

    } catch (err) {
      notify(err.message || "Checkout failed — please try again");
      if (isMountedRef.current) {
        setChecking(false);
        setPaymentStep("idle");
      }
    }
  };

  // Human-readable step label for button
  const paymentStepLabel = {
    idle: null,
    creating: "Preparing order…",
    paying: "Opening payment…",
    verifying: "Verifying payment…",
  };

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SEO title="Shopping Cart | Lucky Couture" canonical="/cart" robots="noindex, nofollow" />
      <SectionHeading align="left" eyebrow="Your Bag" title="Shopping Cart" />

      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        <div className="flex flex-col gap-4">
          {/* Select All Controls Header */}
          <div className="bg-white rounded-2xl shadow-card px-5 py-4 flex items-center justify-between border border-primary/10">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isPartiallySelected;
                }}
                onChange={handleToggleSelectAll}
                className="w-5 h-5 rounded text-accent border-primary/20 focus:ring-accent accent-accent cursor-pointer"
                aria-label="Select all cart items"
              />
              <span className="text-xs sm:text-sm font-semibold text-primary">
                Select all items ({safeCart.length} {safeCart.length === 1 ? "item" : "items"})
              </span>
            </label>

            <div className="text-xs text-ink/60">
              {selectedItems.length > 0 ? (
                <span className="font-medium text-accent">
                  {selectedItems.length} of {safeCart.length} selected
                </span>
              ) : (
                <span className="text-red-500 font-medium">None selected</span>
              )}
            </div>
          </div>

          {/* Cart Items List */}
          {safeCart.map((item, idx) => {
            if (!item) return null;
            const categoryName =
              typeof item.category === "object"
                ? (item.category?.name || "")
                : (typeof item.category === "string" ? item.category : "");
            const rawImage =
              item.image ||
              item.thumbnail?.url ||
              item.images?.[0]?.url ||
              (typeof item.thumbnail === "string" ? item.thumbnail : "") ||
              (typeof item.images?.[0] === "string" ? item.images[0] : "") ||
              item.thumbnail ||
              item.images ||
              "";
            const itemId = getItemKey(item, idx);
            const isSelected = selectedItemKeys.has(itemId);
            const imageUrl = getImageUrl(item.image || rawImage || item) || "";
            const itemPrice = Number(item.price) || 0;
            const itemQty = Number(item.qty || item.quantity) || 1;
            const itemName = item.name || "Custom Piece";

            const maxStock = (function () {
              if (Array.isArray(item.colorVariants) && item.colorVariants.length > 0 && item.color) {
                const cv = item.colorVariants.find(
                  (v) => (v?.color || "").trim().toLowerCase() === String(item.color).trim().toLowerCase()
                );
                if (cv && Array.isArray(cv.inventory) && cv.inventory.length > 0 && item.size) {
                  const inv = cv.inventory.find(
                    (i) => (i?.size || "").trim().toLowerCase() === String(item.size).trim().toLowerCase()
                  );
                  if (inv && typeof inv.quantity === "number") {
                    return Math.max(0, Number(inv.quantity));
                  }
                }
              }
              if (item.maxStock !== undefined && item.maxStock !== null && !isNaN(Number(item.maxStock))) {
                return Math.max(0, Number(item.maxStock));
              }
              if (item.stock !== undefined && item.stock !== null && !isNaN(Number(item.stock))) {
                return Math.max(0, Number(item.stock));
              }
              return 99;
            })();

            const isAtMaxStock = maxStock > 0 ? itemQty >= maxStock : false;

            return (
              <motion.div
                layout
                key={itemId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex gap-3.5 sm:gap-4 bg-white rounded-2xl shadow-card p-4 transition-all border ${
                  isSelected ? "border-primary/10 ring-1 ring-primary/5" : "border-primary/5 opacity-75 bg-bg/30"
                }`}
              >
                {/* Individual Item Checkbox */}
                <div className="flex items-center self-center shrink-0 pr-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleItemSelection(itemId)}
                    className="w-5 h-5 rounded text-accent border-primary/20 focus:ring-accent accent-accent cursor-pointer"
                    aria-label={`Select ${itemName}`}
                  />
                </div>

                <img
                  src={imageUrl}
                  alt={itemName}
                  className="w-20 sm:w-24 h-24 sm:h-28 object-cover rounded-xl shrink-0 bg-primary/5"
                />

                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    {categoryName && (
                      <p className="text-[11px] uppercase tracking-wide text-secondary">{categoryName}</p>
                    )}
                    <h3 className="font-display text-sm sm:text-base font-medium text-primary truncate">{itemName}</h3>
                    <div className="flex flex-wrap gap-1.5 text-xs text-ink/60 mt-1">
                      {item.color && (
                        <span className="bg-bg px-2 py-0.5 rounded-md border border-primary/10">
                          Color: <strong className="text-primary">{item.color}</strong>
                        </span>
                      )}
                      {item.size && (
                        <span className="bg-bg px-2 py-0.5 rounded-md border border-primary/10">
                          Size: <strong className="text-primary">{item.size}</strong>
                        </span>
                      )}
                      {item.fabricType && (
                        <span className="bg-bg px-2 py-0.5 rounded-md border border-primary/10">
                          Fabric: <strong className="text-primary">{item.fabricType}</strong>
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-primary mt-1.5">₹{itemPrice.toLocaleString("en-IN")}</p>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1">
                    <div className="flex items-center gap-2.5 sm:gap-3 border border-primary/15 rounded-full px-2 py-0.5 sm:py-1 bg-white">
                      <button
                        type="button"
                        onClick={() => {
                          if (itemQty <= 1) {
                            removeFromCart(item.itemKey || itemId);
                            notify("Removed from cart");
                          } else {
                            updateQty(item.itemKey || itemId, itemQty - 1);
                          }
                        }}
                        className="w-6 h-6 flex items-center justify-center text-primary cursor-pointer hover:bg-primary/5 rounded-full transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs sm:text-sm w-4 text-center font-medium">{itemQty}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (itemQty >= maxStock) {
                            const variantLabel = [item.color, item.size].filter(Boolean).join(" / ");
                            notify(`Only ${maxStock} ${maxStock === 1 ? "item is" : "items are"} available${variantLabel ? ` in ${variantLabel}` : ""}.`);
                            return;
                          }
                          updateQty(item.itemKey || itemId, itemQty + 1);
                        }}
                        disabled={isAtMaxStock}
                        className="w-6 h-6 flex items-center justify-center text-primary cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/5 rounded-full transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        removeFromCart(item.itemKey || itemId);
                        notify("Removed from cart");
                      }}
                      className="text-ink/40 hover:text-red-500 transition-colors cursor-pointer p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Order Summary Column */}
        <div className="bg-white rounded-2xl shadow-card p-6 h-fit lg:sticky lg:top-24 border border-primary/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-primary">Order Summary</h3>
            <span className="text-xs font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded-full">
              {selectedCount} {selectedCount === 1 ? "item" : "items"}
            </span>
          </div>

          {/* Delivery Selection */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              Do you need delivery?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNeedsDelivery(false)}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  !needsDelivery
                    ? "bg-primary text-bg border-primary shadow-sm"
                    : "border-primary/15 text-primary hover:border-primary/40"
                }`}
              >
                No (Store Pickup)
              </button>
              <button
                type="button"
                onClick={() => setNeedsDelivery(true)}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  needsDelivery
                    ? "bg-primary text-bg border-primary shadow-sm"
                    : "border-primary/15 text-primary hover:border-primary/40"
                }`}
              >
                Yes (Delivery)
              </button>
            </div>
          </div>

          {/* Delivery Address Details */}
          {needsDelivery ? (
            <div className="mb-5 space-y-3 bg-bg/60 p-4 rounded-2xl border border-primary/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <MapPin size={13} className="text-accent" /> Delivery Address (India)
                </span>
                {user?.addresses?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSavedPicker((s) => !s)}
                    className="text-[11px] text-accent font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Saved Addresses <ChevronDown size={12} />
                  </button>
                )}
              </div>

              {/* Saved Address Quick Dropdown */}
              {showSavedPicker && user?.addresses?.length > 0 && (
                <div className="bg-white border border-primary/15 rounded-xl p-2 shadow-sm max-h-40 overflow-y-auto space-y-1.5">
                  {user.addresses.map((sa) => (
                    <button
                      key={sa._id}
                      type="button"
                      onClick={() => selectSavedAddress(sa)}
                      className="w-full text-left p-2 rounded-lg hover:bg-bg/80 text-xs text-ink transition-colors cursor-pointer border border-transparent hover:border-primary/10"
                    >
                      <span className="font-semibold text-primary block">
                        {sa.label || "Address"} {sa.isDefault && <span className="text-[10px] text-accent">(Primary)</span>}
                      </span>
                      <span className="text-ink/60 block truncate">{formatDisplayAddress(sa)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Form fields */}
              <div>
                <label className="block text-[11px] font-medium text-ink/70 mb-1">
                  Pincode <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={address.pincode}
                    onChange={handlePincodeChange}
                    placeholder="e.g. 522002"
                    className="w-full px-3 py-2 rounded-xl border border-primary/15 text-xs text-ink bg-white font-mono"
                  />
                  {pinStatus === "loading" && (
                    <Loader2 size={13} className="absolute right-3 top-2.5 animate-spin text-accent" />
                  )}
                  {pinStatus === "valid" && (
                    <Check size={13} className="absolute right-3 top-2.5 text-emerald-600" />
                  )}
                </div>
                {pinError && <p className="text-[10px] text-red-500 mt-1">{pinError}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-ink/70 mb-1">City</label>
                  <input
                    type="text"
                    readOnly
                    value={address.city}
                    placeholder="Auto-filled"
                    className="w-full px-3 py-2 rounded-xl border border-primary/10 text-xs text-ink bg-primary/5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink/70 mb-1">State</label>
                  <input
                    type="text"
                    readOnly
                    value={address.state}
                    placeholder="Auto-filled"
                    className="w-full px-3 py-2 rounded-xl border border-primary/10 text-xs text-ink bg-primary/5"
                  />
                </div>
              </div>

              {localities.length > 0 && (
                <div>
                  <label className="block text-[11px] font-medium text-ink/70 mb-1">Locality / Area</label>
                  <select
                    value={address.locality}
                    onChange={(e) => setAddress((p) => ({ ...p, locality: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-primary/15 text-xs text-ink bg-white cursor-pointer"
                  >
                    {localities.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-ink/70 mb-1">
                  Street Address / Road <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={address.line1}
                  onChange={(e) => setAddress((p) => ({ ...p, line1: e.target.value }))}
                  placeholder="e.g. Brodipet Main Road"
                  className="w-full px-3 py-2 rounded-xl border border-primary/15 text-xs text-ink bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink/70 mb-1">Flat / House No. (Optional)</label>
                <input
                  type="text"
                  value={address.line2}
                  onChange={(e) => setAddress((p) => ({ ...p, line2: e.target.value }))}
                  placeholder="e.g. Flat 4B, Sri Sai Nilayam"
                  className="w-full px-3 py-2 rounded-xl border border-primary/15 text-xs text-ink bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink/70 mb-1">
                  Contact Phone <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={address.phone}
                  onChange={(e) => setAddress((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-xl border border-primary/15 text-xs text-ink bg-white font-mono"
                />
              </div>

              {/* Delivery notice */}
              {isLongDistance && (
                <div className="p-3 bg-accent/10 rounded-xl border border-accent/20 text-xs text-ink/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-accent">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>Long-Distance Delivery</span>
                  </div>
                  <p className="text-[11px] text-ink/70 leading-relaxed">
                    {deliveryDetails?.estimatedDeliveryText || (deliveryDetails?.isAndhraPradesh ? "Estimated delivery: 4–7 days" : "Estimated delivery: 10+ days")}. Dispatched securely via courier partners.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <a
              href={
                contactInfo.mapsUrl ||
                (contactInfo.lat && contactInfo.lng
                  ? `https://www.google.com/maps/search/?api=1&query=${contactInfo.lat},${contactInfo.lng}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      contactInfo.address
                    )}`)
              }
              target="_blank"
              rel="noopener noreferrer"
              className="mb-5 bg-bg/60 hover:bg-bg/90 p-3.5 rounded-xl border border-primary/15 hover:border-accent/40 text-xs text-ink/70 flex items-start gap-2.5 transition-all group cursor-pointer shadow-2xs block"
              aria-label="View Lucky Couture store location on Google Maps"
            >
              <MapPin
                size={15}
                className="text-accent shrink-0 mt-0.5 group-hover:text-primary group-hover:scale-110 transition-transform"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <strong className="text-primary font-semibold group-hover:text-accent transition-colors">
                    Store Pickup Location:
                  </strong>
                  <span className="text-[11px] font-medium text-accent inline-flex items-center gap-0.5 opacity-85 group-hover:opacity-100 group-hover:underline transition-all">
                    View on Maps <ExternalLink size={11} />
                  </span>
                </div>
                <span className="text-ink/75 group-hover:text-primary leading-relaxed block transition-colors">
                  {contactInfo.address}
                </span>
              </div>
            </a>
          )}

          {/* Breakdown */}
          <div className="space-y-2 text-sm text-ink/70 mb-4">
            <div className="flex justify-between">
              <span>Subtotal ({selectedCount} {selectedCount === 1 ? "item" : "items"})</span>
              <span className="font-medium text-primary">₹{selectedSubtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span className={shippingFee > 0 ? "font-semibold text-primary" : ""}>
                {!needsDelivery
                  ? "Free (Store Pickup)"
                  : selectedCount === 0
                  ? "—"
                  : !address?.pincode && !address?.city
                  ? "Enter Address"
                  : isLongDistance
                  ? `₹${shippingFee.toFixed(2)} (${deliveryDetails?.estimatedDaysText || (deliveryDetails?.isAndhraPradesh ? "4–7 days" : "10+ days")})`
                  : `₹${shippingFee.toFixed(2)}${address?.roadDistanceKm != null ? ` (${Number(address.roadDistanceKm).toFixed(1)} km)` : ""}`}
              </span>
            </div>
            {selectedCount > 0 && platformFee > 0 && (
              <div className="flex justify-between">
                <span>Platform Fee</span>
                <span className="font-medium text-primary">₹{platformFee.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>

          <StarDivider className="mb-4" />

          <div className="flex justify-between font-semibold text-primary text-base mb-2">
            <span>Order Total</span>
            <span className="font-bold text-lg text-primary">₹{finalTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          {/* Razorpay 30% Advance Breakdown */}
          {selectedCount > 0 && (
            <div className="mb-5 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-ink/70 font-medium">Pay Now (30% Advance)</span>
                <span className="font-bold text-accent">₹{Math.round(finalTotal * 0.30).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-xs text-ink/55">
                <span>Balance due at delivery (70%)</span>
                <span>₹{(finalTotal - Math.round(finalTotal * 0.30)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-ink/50 pt-0.5 border-t border-accent/10 mt-1">
                <ShieldCheck size={11} className="text-accent/70 shrink-0" />
                <span>Secured by Razorpay · PCI-DSS compliant</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleCheckout}
            disabled={checking || selectedCount === 0}
            className="w-full bg-highlight text-primary font-semibold py-3.5 rounded-full hover:bg-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {checking ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {paymentStepLabel[paymentStep] || "Processing…"}
              </>
            ) : selectedCount === 0 ? (
              "Select items to proceed"
            ) : (
              <>
                <CreditCard size={16} />
                Pay ₹{Math.round(finalTotal * 0.30).toLocaleString("en-IN")} via Razorpay
              </>
            )}
          </button>

          {selectedCount > 0 && !checking && (
            <p className="text-[11px] text-center text-ink/45 mt-1.5">
              30% advance now · Balance ₹{(finalTotal - Math.round(finalTotal * 0.30)).toLocaleString("en-IN")} at delivery
            </p>
          )}

          {selectedCount === 0 && safeCart.length > 0 && (
            <p className="text-[11px] text-center text-ink/50 mt-2">
              Select items above using checkboxes to proceed with purchase.
            </p>
          )}

          {!user && (
            <p className="text-xs text-center text-ink/50 mt-3">
              <Link to="/login" className="text-accent underline font-medium">Sign in</Link> to place your order
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
