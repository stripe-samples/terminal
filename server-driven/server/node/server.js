const express = require('express');
const app = express();
const {resolve} = require('path');
// Replace if using a different env file or config
const env = require('dotenv').config({path: './.env'});

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-08-27',
  appInfo: { // For sample support and debugging, not required for production:
    name: "stripe-samples/terminal/api-driven",
    version: "0.0.1",
    url: "https://github.com/stripe-samples"
  }
});

app.use(express.static(process.env.STATIC_DIR));
app.use(express.json({}));

app.get('/', (req, res) => {
  const path = resolve(process.env.STATIC_DIR + '/index.html');
  res.sendFile(path);
});

app.get('/reader', (req, res) => {
  const path = resolve(process.env.STATIC_DIR + '/reader.html');
  res.sendFile(path);
});

app.get('/list-readers', async (req, res) => {
  /**
   * List all Terminal Readers. You can optionally pass a limit or Location ID
   * to further filter the Readers. 
   * See the documentation [0] for the full list of supported parameters.
   * [0] https://stripe.com/docs/api/terminal/readers/list
   */
  try {
    const readers = await stripe.terminal.readers.list(); 
    const readersList = readers.data; 
    // Send list of Readers
    return res.send({
      readers: readersList,
    }); 
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});


app.post('/create-payment-intent', async (req, res) => {
  /**
   * Create a PaymentIntent with the amount, currency, and a payment method type.
   * For in-person payments, you must pass "card_present" in the payment_method_types
   * array and set the capture_method to "manual"
   * 
   * See the documentation [0] for the full list of supported parameters.
   * [0] https://stripe.com/docs/api/payment_intents/create
   */
  try {
    const amount = req.body.amount;
    const paymentIntent = await stripe.paymentIntents.create({
      currency: 'usd',
      amount: amount,
      payment_method_types: ["card_present"], 
      capture_method: "manual",
    });
    res.send({
      payment_intent_id: paymentIntent.id,
    });
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});

app.get('/retrieve-payment-intent', async (req, res) => {
  /** 
   * Retrieves a PaymentIntent by ID. 
   */
  try {
    const paymentIntentId = req.query.payment_intent_id;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    res.send({
      payment_intent: paymentIntent,
    });
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});

app.post('/process-payment-intent', async (req, res) => {
  /**
   * Hands-off a PaymentIntent to a Terminal Reader. This action requires a PaymentIntent ID and Reader ID.
   * See the documentation [0] for additional optional parameters.
   * [0] https://stripe.com/docs/api/terminal/readers/process_payment_intent
   */
  try {
    const { payment_intent_id: paymentIntentId, reader_id: readerId } = req.body;
    const readerState = await stripe.terminal.readers.processPaymentIntent(readerId, 
      { payment_intent: paymentIntentId});
    res.send({
      reader_state: readerState,
    });
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});

app.post('/simulate-payment', async (req, res) => {
  /**
   * Simulates a user tapping/dipping their credit card on a simulated reader. 
   * This action requires a Reader ID and can be configured to simulate different
   * outcomes using a card_present dictionary. See the documentation [0][1] for details.
   * 
   * [0] https://stripe.com/docs/api/terminal/readers/present_payment_method 
   * [1] https://stripe.com/docs/terminal/payments/collect-payment?terminal-sdk-platform=server-driven#simulate-a-payment
   */
  try {
    const readerId  = req.body.reader_id;
    const readerState = await stripe.testHelpers.terminal.readers.presentPaymentMethod(readerId);
    res.send({
      reader_state: readerState,
    });
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});

app.get('/retrieve-reader', async (req, res) => {
  /**
   * Retrieves a Reader.
   */
  try {
    const readerId = req.query.reader_id;
    const readerState = await stripe.terminal.readers.retrieve(readerId);
    res.send({
      reader_state: readerState,
    });
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});


app.post('/capture-payment-intent', async (req, res) => {
  /**
   * Captures a PaymentIntent that been completed but uncaptured. This action
   * only requires a PaymentIntent ID but can be configured with additional
   * parameters. See the documentation for details [0]
   * 
   * [0] https://stripe.com/docs/api/payment_intents/capture
   */
  try {
    const paymentIntentId = req.body.payment_intent_id;
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    res.send({ payment_intent: paymentIntent });
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});


app.post('/cancel-reader-action', async (req, res) => {
  /**
   * Cancels the Reader action and resets the screen to the idle state. This can 
   * also be use to reset the Reader's screen back to the idle state. It only
   * returns a failure if the Reader is currently processing a payment after a customer
   * has dipped/tapped or swiped their card.
   *  
   * Note: This doesn't cancel in-flight payments.
   */
  try {
    const readerId  = req.body.reader_id;
    const readerState = await stripe.terminal.readers.cancelAction(readerId);
    res.send({
      reader_state: readerState,
    });
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});

app.listen(4242, () =>
  console.log(`Node server listening at http://localhost:4242`)
);