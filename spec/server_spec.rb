require_relative './spec_helper.rb'

RSpec.describe "Terminal integration" do
  it "serves the index route" do
    # Get the index html page
    response = get("/")
    expect(response).not_to be_nil
  end

  it "lists the readers" do
    ensure_simulated_readers
    resp = get_json("/list-readers")
    expect(resp).to have_key("readers")
    expect(resp["readers"].length).to be > 0
  end

  it 'creates payment intents' do
    amount_to_charge = 888
    resp, status = post_json('/create-payment-intent', {
      amount: amount_to_charge
    })
    expect(status).to eq(200)
    expect(resp).to have_key('payment_intent_id')
    payment_intent = Stripe::PaymentIntent.retrieve(resp['payment_intent_id'])
    expect(payment_intent.amount).to eq(amount_to_charge)
    expect(payment_intent.currency).to eq('usd')
    expect(payment_intent.capture_method).to eq('manual')
    expect(payment_intent.payment_method_types).to contain_exactly('card_present')
  end

  it 'retrieves payment intents' do
    amount_to_charge = 888
    payment_intent = Stripe::PaymentIntent.create(amount: amount_to_charge, currency: 'usd')

    resp = get_json("/retrieve-payment-intent?payment_intent_id=#{payment_intent.id}")
    expect(resp).to have_key("payment_intent")
    expect(resp["payment_intent"]["id"]).to eq(payment_intent.id)
  end

  it 'processes payment' do
    reader = Stripe::Terminal::Reader.list(limit: 1, device_type: 'simulated_wisepos_e').data.first
    payment_intent = Stripe::PaymentIntent.create(
      amount: 999,
      currency: 'usd',
      payment_method_types: ['card_present'],
      capture_method: 'manual'
    )
    resp, status = post_json("/process-payment-intent", {
      reader_id: reader.id,
      payment_intent_id: payment_intent.id
    })
    expect(resp).to have_key("reader_state")
    expect(resp["reader_state"]).to have_key("id")
    expect(resp["reader_state"]["id"]).to eq(reader.id)
    expect(resp["reader_state"]).to have_key("action")
    expect(resp["reader_state"]["action"]).to have_key("status")
    expect(resp["reader_state"]["action"]["status"]).to eq("in_progress")
  end

  it 'simulates payment' do
    reader = Stripe::Terminal::Reader.list(limit: 1, device_type: 'simulated_wisepos_e').data.first
    payment_intent = Stripe::PaymentIntent.create(
      amount: 999,
      currency: 'usd',
      payment_method_types: ['card_present'],
      capture_method: 'manual'
    )
    reader = Stripe::Terminal::Reader.process_payment_intent(
      reader.id,
      payment_intent: payment_intent.id
    )
    resp, status = post_json("/simulate-payment", {
      reader_id: reader.id
    })
    expect(status).to eq(200)
    expect(resp).to have_key("reader_state")
    expect(resp["reader_state"]).to have_key("action")
    expect(resp["reader_state"]["action"]).to have_key("status")
    expect(resp["reader_state"]["action"]["status"]).to eq("succeeded")
  end

  it 'retrieves a reader' do
    reader = Stripe::Terminal::Reader.list(limit: 1, device_type: 'simulated_wisepos_e').data.first
    resp = get_json("/retrieve-reader?reader_id=#{reader.id}")
    expect(resp).to have_key("reader_state")
    expect(resp["reader_state"]).to have_key("id")
    expect(resp["reader_state"]["id"]).to eq(reader.id)
  end

  it 'captures a payment intent' do
    payment_intent = Stripe::PaymentIntent.create(
      amount: 333,
      currency: 'usd',
      payment_method: 'pm_card_visa',
      confirm: true,
      capture_method: 'manual'
    )
    resp, status = post_json("/capture-payment-intent", {
      payment_intent_id: payment_intent.id,
    })
    expect(status).to eq(200)
    expect(resp).to have_key("payment_intent")
    expect(resp["payment_intent"]["status"]).to eq("succeeded")
  end


  it 'cancels the reader action' do
    reader = Stripe::Terminal::Reader.list(limit: 1, device_type: 'simulated_wisepos_e').data.first
    payment_intent = Stripe::PaymentIntent.create(
      amount: 999,
      currency: 'usd',
      payment_method_types: ['card_present'],
      capture_method: 'manual'
    )
    reader = Stripe::Terminal::Reader.process_payment_intent(
      reader.id,
      payment_intent: payment_intent.id
    )

    resp, status = post_json("/cancel-reader-action", {
      reader_id: reader.id,
    })

    expect(resp).to have_key("reader_state")
    expect(resp["reader_state"]).to have_key("action")
    expect(resp["reader_state"]["action"]).to be_nil
  end
end
