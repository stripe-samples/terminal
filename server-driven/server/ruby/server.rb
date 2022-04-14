# frozen_string_literal: true

require 'stripe'
require 'sinatra'
require 'sinatra/reloader'
require 'dotenv'

# Replace if using a different env file or config
Dotenv.load

# For sample support and debugging, not required for production:
Stripe.set_app_info(
  'stripe-samples/terminal/server-driven',
  version: '0.0.1',
  url: 'https://github.com/stripe-samples'
)
Stripe.api_version = '2020-08-27'
Stripe.api_key = ENV['STRIPE_SECRET_KEY']

set :static, true
set :public_folder, File.join(File.dirname(__FILE__), ENV['STATIC_DIR'])
set :port, 4242

get '/' do
  content_type 'text/html'
  send_file File.join(settings.public_folder, 'index.html')
end

get '/list-readers' do
  begin
    # List all Terminal Readers. You can optionally pass a limit or Location ID to further filter the Readers. See the documentation [0] for the full list of supported parameters.
    #
    # [0] https://stripe.com/docs/api/terminal/readers/list
    readers = Stripe::Terminal::Reader.list.data
    { readers: readers }.to_json
  rescue => e
    { error: { message: e.message }}
  end
end

post '/create-payment-intent' do
  content_type 'application/json'
  data = JSON.parse(request.body.read)
  begin
    # Create a PaymentIntent with the amount, currency, and a payment method type.
    # For in-person payments, you must pass "card_present" in the payment_method_types array and set the capture_method to "manual".
    #
    # See the documentation [0] for the full list of supported parameters.
    #
    # [0] https://stripe.com/docs/api/payment_intents/create
    payment_intent = Stripe::PaymentIntent.create(
      amount: data['amount'],
      currency: 'usd',
      payment_method_types: ['card_present'],
      capture_method: 'manual'
    )

    # Send the PaymentIntent ID to the client.
    { payment_intent_id: payment_intent.id }.to_json
  rescue => e
    { error: { message: e.message }}.to_json
  end
end

get '/retrieve-payment-intent' do
  # Retrieves a PaymentIntent by ID.
  begin
    payment_intent = Stripe::PaymentIntent.retrieve(params[:payment_intent_id])
    { payment_intent: payment_intent }.to_json
  rescue => e
    { error: { message: e.message }}.to_json
  end
end

post '/process-payment-intent' do
  content_type 'application/json'
  data = JSON.parse(request.body.read)
  # Hands-off a PaymentIntent to a Terminal Reader.
  # This action requires a PaymentIntent ID and Reader ID.
  #
  # See the documentation [0] for additional optional
  # parameters.
  #
  # [0] https://stripe.com/docs/api/terminal/readers/process_payment_intent
  begin
    payment_intent_id = data['payment_intent_id']
    reader_id = data['reader_id']

    reader = Stripe::Terminal::Reader.process_payment_intent(
      reader_id,
      payment_intent: payment_intent_id
    )
    { reader_state: reader }.to_json
  rescue => e
    { error: { message: e.message }}.to_json
  end
end

post '/simulate-payment' do
  content_type 'application/json'
  data = JSON.parse(request.body.read)
  # Simulates a user tapping/dipping their credit card
  # on a simulated reader.
  #
  # This action requires a Reader ID and can be configured
  # to simulate different outcomes using a card_present dictionary.
  # See the documentation [0][1] for details.
  #
  # [0] https://stripe.com/docs/api/terminal/readers/present_payment_method
  # [1] https://stripe.com/docs/terminal/payments/collect-payment?terminal-sdk-platform=server-driven#simulate-a-payment
  begin
    reader_id = data['reader_id']
    reader = Stripe::Terminal::Reader::TestHelpers.present_payment_method(
      reader_id
    )
    { reader_state: reader }.to_json
  rescue => e
    { error: { message: e.message }}.to_json
  end
end


get '/retrieve-reader' do
  # Retrieves a Reader.
  begin
    reader_id = params[:reader_id]
    reader = Stripe::Terminal::Reader.retrieve(reader_id)
    { reader_state: reader }.to_json
  rescue => e
    { error: { message: e.message }}.to_json
  end
end

post '/capture-payment-intent' do
  content_type 'application/json'
  data = JSON.parse(request.body.read)
  # Captures a PaymentIntent that been completed but uncaptured.
  # This action only requires a PaymentIntent ID but can be configured
  # with additional parameters.
  #
  # [0] https://stripe.com/docs/api/payment_intents/capture
  begin
    payment_intent_id = data['payment_intent_id']
    payment_intent = Stripe::PaymentIntent.capture(payment_intent_id)
    { payment_intent: payment_intent }.to_json
  rescue => e
    { error: { message: e.message }}.to_json
  end
end

post '/cancel-reader-action' do
  content_type 'application/json'
  data = JSON.parse(request.body.read)

  # Cancels the Reader action and resets the screen to the idle state.
  # This can also be use to reset the Reader's screen back to the idle state.
  #
  # It only returns a failure if the Reader is currently processing a payment
  # after a customer has dipped/tapped or swiped their card.
  #
  # Note: This doesn't cancel in-flight payments.
  begin
    reader_id = data['reader_id']
    reader = Stripe::Terminal::Reader.cancel_action(reader_id)
    { reader_state: reader }.to_json
  rescue => e
    { error: { message: e.message }}.to_json
  end
end
