const http = require("http");

const data = JSON.stringify({
  garmentType: "Saree",
  fabricSource: "shop_provided",
  designComplexity: "simple",
  measurements: { bust: 34 },
  isFastDelivery: false,
  guestInfo: { name: "Test", phone: "1234567890" },
});

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/tailoring",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length,
  },
};

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", body);
  });
});

req.on("error", (e) => {
  console.error("Error:", e);
});

req.write(data);
req.end();
