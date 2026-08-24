import { useCallback, useRef } from "react";

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * Loads the Razorpay Checkout JS script dynamically (idempotent).
 * Returns a promise that resolves when the script is ready.
 */
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existing) {
      // Script tag exists but Razorpay not yet available — wait for it
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => reject(new Error("Razorpay script failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout. Please check your internet connection."));
    document.body.appendChild(script);
  });
}

/**
 * useRazorpay — hook that returns an openCheckout function.
 *
 * Usage:
 *   const { openCheckout, loading } = useRazorpay();
 *   await openCheckout({ razorpayOrderId, amount, currency, keyId, prefill, description, onSuccess, onFailure });
 */
export function useRazorpay() {
  const handlerRef = useRef(null);
  const isSuccessHandledRef = useRef(false);

  const openCheckout = useCallback(async ({
    razorpayOrderId,
    amount,          // in paise
    currency = "INR",
    keyId,
    prefill = {},
    description = "Lucky Couture — 30% Advance Payment",
    orderName = "Lucky Couture",
    onSuccess,
    onFailure,
    onDismiss,
  }) => {
    try {
      isSuccessHandledRef.current = false;

      if (!window.Razorpay) {
        await loadRazorpayScript();
      }

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout SDK is not available. Please check your internet connection or disable ad-blockers and try again.");
      }

      if (!keyId) {
        throw new Error("Razorpay Key ID is not configured on the server.");
      }

      if (!razorpayOrderId) {
        throw new Error("Razorpay Order ID is missing.");
      }

      const options = {
        key: keyId,
        amount: Number(amount) || amount,
        currency,
        name: orderName,
        description,
        order_id: razorpayOrderId,
        prefill: {
          name: prefill.name || "",
          email: prefill.email || "",
          contact: prefill.contact || "",
        },
        theme: {
          color: "#b8860b", // Lucky Couture accent gold
        },
        modal: {
          ondismiss: () => {
            // Guard: If payment succeeded, do not fire cancellation callbacks
            if (isSuccessHandledRef.current) {
              console.log("[useRazorpay] Modal dismissed after successful payment — skipping cancellation callback.");
              return;
            }
            if (onDismiss) onDismiss();
            else if (onFailure) onFailure("Payment window closed");
          },
          escape: true,
          backdropclose: false,
        },
        handler: (response) => {
          // Set success handled flag BEFORE calling onSuccess
          isSuccessHandledRef.current = true;
          // response = { razorpay_order_id, razorpay_payment_id, razorpay_signature }
          if (onSuccess) {
            onSuccess({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
          }
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on("payment.failed", (response) => {
        const errorDesc = response?.error?.description || response?.error?.reason || "Payment failed";
        if (onFailure) onFailure(errorDesc);
      });

      handlerRef.current = rzpInstance;
      rzpInstance.open();
      console.log("[CHECKOUT] Razorpay modal opened successfully");
    } catch (err) {
      console.error("[useRazorpay Error]:", err);
      if (onFailure) {
        onFailure(err.message || "Failed to open Razorpay payment window");
      }
    }
  }, []);

  return { openCheckout };
}

export default useRazorpay;
