#! /usr/bin/env python3.6
"""
server.py
Stripe Sample.
Python 3.7 or newer required.
"""

import stripe
import os

from flask import Flask, jsonify, request, render_template
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
stripe.api_version = "2020-08-27"
# For sample support and debugging, not required for production
stripe.app_info = {
    "name": "stripe-samples/terminal/server-driven",
    "version": "0.0.1",
    "url": "https://github.com/stripe-samples"
}

static_dir = str(os.path.abspath(os.path.join(os.getenv("STATIC_DIR"))))
app = Flask(__name__,
            static_folder=static_dir,
            static_url_path="",
            template_folder=static_dir)


@app.route("/", methods=['GET'])
def home():
    return render_template('index.html')


@app.route("/reader", methods=['GET'])
def reader():
    return render_template('reader.html')


@app.route("/list-readers", methods=['GET'])
def list_readers():
    """
    List all Terminal Readers. You can optionally pass a limit or Location ID to further filter the Readers. See the documentation [0] for the full list of supported parameters.

    [0] https://stripe.com/docs/api/terminal/readers/list
    """
    try:
        readers = stripe.terminal.Reader.list()
        readers_list = readers.data
        return jsonify({'readers': readers_list})
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 400


@app.route("/create-payment-intent", methods=['POST'])
def create_payment_intent():
    """
    Create a PaymentIntent with the amount, currency, and a payment method type.
    For in-person payments, you must pass "card_present" in the payment_method_types array and set the capture_method to "manual".

    See the documentation [0] for the full list of supported parameters.

    [0] https://stripe.com/docs/api/payment_intents/create
    """
    try:
        amount = request.get_json().get('amount')
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="usd",
            payment_method_types=["card_present"],
            capture_method="manual")
        return jsonify({'payment_intent_id': payment_intent.id})
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 400


@app.route("/retrieve-payment-intent", methods=['GET'])
def retrieve_payment_intent():
    """
    Retrieves a PaymentIntent by ID.
    """
    try:
        payment_intent_id = request.args.get("payment_intent_id")
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return jsonify({"payment_intent": payment_intent})
    except Exception as e:
        return jsonify({"error": {"message": str(e)}})


@app.route("/process-payment-intent", methods=['POST'])
def process_payment_intent():
    """
    Hands-off a PaymentIntent to a Terminal Reader.
    This action requires a PaymentIntent ID and Reader ID.

    See the documentation [0] for additional optional
    parameters.

    [0] https://stripe.com/docs/api/terminal/readers/process_payment_intent
    """
    try:
        request_json = request.get_json()
        payment_intent_id = request_json.get('payment_intent_id')
        reader_id = request_json.get('reader_id')

        reader_state = stripe.terminal.Reader.process_payment_intent(
            reader_id,
            payment_intent=payment_intent_id,
        )
        return jsonify({'reader_state': reader_state})
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 400


@app.route("/simulate-payment", methods=['POST'])
def simulate_terminal_payment():
    """
    Simulates a user tapping/dipping their credit card
    on a simulated reader.

    This action requires a Reader ID and can be configured
    to simulate different outcomes using a card_present dictionary.
    See the documentation [0][1] for details.

    [0] https://stripe.com/docs/api/terminal/readers/present_payment_method
    [1] https://stripe.com/docs/terminal/payments/collect-payment?terminal-sdk-platform=server-driven#simulate-a-payment
    """
    try:
        reader_id = request.get_json().get('reader_id')
        reader_state = stripe.terminal.Reader.TestHelpers.present_payment_method(
            reader_id)
        return jsonify({'reader_state': reader_state})
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 400


@app.route("/retrieve-reader", methods=['GET'])
def retrieve_reader():
    """
    Retrieves a Reader.
    """
    try:
        reader_id = request.args.get("reader_id")
        reader_state = stripe.terminal.Reader.retrieve(reader_id)
        return jsonify({"reader_state": reader_state})
    except Exception as e:
        return jsonify({"error": {"message": str(e)}})


@app.route("/capture-payment-intent", methods=['POST'])
def capture_payment_intent():
    """
    Captures a PaymentIntent that been completed but uncaptured.
    This action only requires a PaymentIntent ID but can be configured
    with additional parameters.

    [0] https://stripe.com/docs/api/payment_intents/capture
    """
    try:
        payment_intent_id = request.get_json().get('payment_intent_id')
        payment_intent = stripe.PaymentIntent.capture(payment_intent_id)
        return jsonify({'payment_intent': payment_intent})
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 400


@app.route("/cancel-reader-action", methods=['POST'])
def cancel_action():
    """
    Cancels the Reader action and resets the screen to the idle state.
    This can also be use to reset the Reader's screen back to the idle state.

    It only returns a failure if the Reader is currently processing a payment
    after a customer has dipped/tapped or swiped their card.

    Note: This doesn't cancel in-flight payments.
    """
    try:
        reader_id = request.get_json().get('reader_id')
        reader_state = stripe.terminal.Reader.cancel_action(reader_id)
        return jsonify({'reader_state': reader_state})
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 400


if __name__ == '__main__':
    app.run(port=4242, debug=True)
