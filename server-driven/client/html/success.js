document.addEventListener('DOMContentLoaded', async () => {

  const urlParams = new URLSearchParams(window.location.search);
  const paymentIntentId = urlParams.get('payment_intent_id');
  
  if (paymentIntentId) {
    const { paymentIntent, paymentError } = await retrievePaymentIntent(paymentIntentId); 

    if (paymentError) {
      handleError(paymentError)
      return; 
    }
    const paymentIntentJSON = JSON.stringify(paymentIntent, null, 2); 
    document.querySelector('pre').textContent = paymentIntentJSON;
  }
  
});