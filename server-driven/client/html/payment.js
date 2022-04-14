async function createPaymentIntent(amount) {
  const res = await fetch("/create-payment-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amount
    }),
  });
  const { payment_intent_id: paymentIntentId, error: paymentError } = await res.json();
  return { paymentIntentId, paymentError };
}

async function retrievePaymentIntent(paymentIntentId) {
  const res = await fetch(`/retrieve-payment-intent?payment_intent_id=${paymentIntentId}`);
  const { payment_intent: paymentIntent, error: paymentError } = await res.json();
  return { paymentIntent, paymentError };
}

async function capturePaymentIntent(paymentIntentId) {
  const res = await fetch("/capture-payment-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payment_intent_id: paymentIntentId }),
  });
  const { payment_intent: capturedPaymentIntent, error: captureError } = await res.json();
  return { capturedPaymentIntent, captureError };
}
