require('dotenv').config();
const express = require('express');
const cors = require('cors');
const forge = require('node-forge');

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*' // Or restrict to your frontend domain
}));

// POST /create-payment
app.post('/create-payment', async (req, res) => {
  try {
    const {
      order_id,
      amount,
      email,
      first_name,
      last_name,
      contact_number,
      address_line_one
    } = req.body;

    // Mandatory fields check
    const requiredFields = ['order_id','amount','email','first_name','last_name','contact_number','address_line_one'];
    for (const f of requiredFields) {
      if (!req.body[f]) {
        return res.status(400).json({ error: `Missing mandatory field: ${f}` });
      }
    }

    // Prepare plaintext payload
    const paymentData = {
      secret_key: process.env.WXP_SECRET_KEY,
      merchant_id: process.env.WXP_MERCHANT_ID,
      process_currency: 'LKR',
      cms: 'Node.js/Render',
      order_id,
      amount,
      email,
      first_name,
      last_name,
      contact_number,
      address_line_one
    };

    const plaintext = JSON.stringify(paymentData);

    // Encrypt using public key
    const publicKeyPem = process.env.WXP_PUBLIC_KEY;
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const encrypted = publicKey.encrypt(plaintext, 'RSA-OAEP', {
      md: forge.md.sha1.create()
    });

    const encryptedBase64 = Buffer.from(encrypted, 'binary').toString('base64');

    // Return HTML form for frontend to auto-submit
    const html = `
      <form id="redirectForm" action="https://webxpay.com/index.php?route=checkout/billing" method="POST">
        <input type="hidden" name="payment" value="${encryptedBase64}">
      </form>
      <script>document.getElementById('redirectForm').submit();</script>
    `;

    res.status(200).send(html);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webxpay backend running on port ${PORT}`));
