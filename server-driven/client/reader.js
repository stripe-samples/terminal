document.addEventListener('DOMContentLoaded', async () => {
  // Retrieve transaction info, in our case from the URL search params 
  const urlParams = new URLSearchParams(window.location.search);
  const readerId = urlParams.get('reader_id');
  const paymentIntentId = urlParams.get('payment_intent_id'); 
  const amount = urlParams.get('amount');

  // Redirect if anything is missing
  if (!(readerId && paymentIntentId && amount)) {
    window.location.replace('/');
  }
  
  // Get the reader
  addMessage(`Retrieving reader ${readerId}.`)
  const { reader, readerError } = await retrieveReader(readerId);
  if (readerError) {
    handleError(readerError.message);
  }

  // Mount reader and amount info
  const readerSelect = document.getElementById('readers'); 
  const readerOption = document.createElement('option');
  readerOption.value = reader.id; 
  readerOption.text = `${reader.label} (${reader.id})`; 
  readerSelect.append(readerOption);

  const amountInput = document.getElementById('amount'); 
  amountInput.value = amount;

  // Event listener for cancel button
  const cancelButton = document.getElementById('cancel-button');
  cancelButton.addEventListener('click', async (e) => {
    e.preventDefault(); 
    cancelButton.disabled = true;
    const { cancelActionError } = await cancelReaderAction(reader.id);
    if (cancelActionError) {
      handleError(cancelActionError);
      cancelButton.disabled = false;
      return;
    }
    addMessage(`Resetting the reader.`);
    window.location.replace(`/canceled.html?payment_intent_id=${paymentIntentId}`);
  });

  // Event listener for capture button 
  const captureButton = document.getElementById('capture-button');
  captureButton.addEventListener('click', async (e) => {
    e.preventDefault(); 
    captureButton.disabled = true;
    addMessage(`Capturing ${paymentIntentId}.`);
    const { captureError } = await capturePaymentIntent(paymentIntentId);
    if (captureError) {
      handleError(captureError);
      addMessage(`See your Stripe dashboard for error details for this payment here: ${paymentIntentId}.`);
      captureButton.disabled = false;
      return;
    }
    window.location.replace(`/success.html?payment_intent_id=${paymentIntentId}`);
  });

  // Event listener for capture button 
  const simulatePaymentButton = document.getElementById('simulate-payment-button');
  simulatePaymentButton.addEventListener('click', async (e) => {
    e.preventDefault(); 
    simulatePaymentButton.disabled = true;
    const { simulatePaymentError } = await simulatePayment(reader.id);
    if (simulatePaymentError) {
      handleError(simulatePaymentError);
      simulatePaymentButton.disabled = false;
      return;
    }
    addMessage(`Successfully simulated payment for ${paymentIntentId}.`);
    simulatePaymentButton.disabled = false;
  });
});

// Retrieve's the reader's state and information
async function retrieveReader(readerId) {
  const res = await fetch(`/retrieve-reader?reader_id=${readerId}`);
  const { reader_state: reader, error: readerError } = await res.json();
  return { reader, readerError }; 
}

// Cancels the reader action. It does not cancel in-flight payments
async function cancelReaderAction(readerId) {
  const res = await fetch("/cancel-reader-action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reader_id: readerId }),
  });
  const { reader_state: canceledReader, error: cancelActionError } = await res.json();
  return { canceledReader, cancelActionError }; 
}

// Simulates a payment on a simulated reader
async function simulatePayment(readerId) {
  const res = await fetch("/simulate-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reader_id: readerId }),
  });
  const { reader_state: reader, error: simulatePaymentError } = await res.json();
  return { reader, simulatePaymentError }; 
}