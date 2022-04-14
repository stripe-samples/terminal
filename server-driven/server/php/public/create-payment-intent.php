<?php

require_once 'shared.php';

try {
  // Create the PaymentIntent
  $paymentIntent = $stripe->paymentIntents->create([
    'amount' => $_POST['amount'],
    'currency' => 'usd',
    'capture_method' => 'manual',
    'payment_method_types' => ['card_present'],
  ]);
} catch (\Stripe\Exception\ApiErrorException $e) {
  http_response_code(400);
  error_log($e->getError()->message);
?>
  <h1>Error</h1>
  <p>Failed to create a PaymentIntent</p>
  <p>Please check the server logs for more information</p>
<?php
  exit;
} catch (Exception $e) {
  error_log($e);
  http_response_code(500);
  exit;
}

try {
  // Hand off to the reader
  $reader = $stripe->terminal->readers->processPaymentIntent($_POST['reader'], [
    'payment_intent' => $paymentIntent->id,
  ]);
} catch (\Stripe\Exception\ApiErrorException $e) {
  http_response_code(400);
  error_log($e->getError()->message);
?>
  <h1>Error</h1>
  <p>Failed to hand off to the reader.</p>
  <p>Please check the server logs for more information</p>
<?php
  exit;
} catch (Exception $e) {
  error_log($e);
  http_response_code(500);
  exit;
}
?>

<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stripe Terminal Sample</title>
    <link rel="icon" href="favicon.ico" type="image/x-icon" />
    <link rel="stylesheet" href="css/normalize.css" />
    <link rel="stylesheet" href="css/global.css" />
  </head>
  <body>
    <header>
    </header>
    <div class="sr-root">
      <div class="sr-main">
        <section class="container">
          <h2>Step 2: Complete and capture the payment</h2>
          <p>Complete the payment. At this stage, the reader has been prompted for payment and ready for a dip, tap, or swipe (in the case of fallback).</p>
          <p>You can use amounts ending in the certain values to produce specific responses. See <a href="https://stripe.com/docs/terminal/references/testing#physical-test-cards">the documentation</a> for more details.</p>
          <div class="sr-form-row">
            <label>Select Reader: </label>
            <select name="reader" class="sr-select" disabled>
              <option value="<?= $reader->id; ?>"><?= $reader->label; ?> (<?= $reader->id ?>)</option>
            </select>
          </div>
          <div class="sr-form-row">
            <label for="amount">Amount:</label>
            <input type="text" id="amount" class="sr-input" disabled value="<?= $paymentIntent->amount; ?>" />
          </div>

          <div class="button-row">

            <form action="/captured.php" method="POST">
              <input type="hidden" name="payment_intent" value="<?= $paymentIntent->id; ?>" />
              <button type="submit">Capture</button>
            </form>

            <form action="/canceled.php" method="POST">
              <input type="hidden" name="reader" value="<?= $reader->id; ?>" />
              <button type="submit">Cancel</button>
            </form>

            <form action="/simulated.php" method="POST">
              <input type="hidden" name="reader" value="<?= $reader->id; ?>" />
              <button type="submit">Simulate Payment</button>
            </form>
          </div>
          </form>
        </section>
        <div id="messages" role="alert" style="display: none;"></div>
      </div>
    </div>
  </body>
</html>
