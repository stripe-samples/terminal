# Collect in-person payments with Stripe Terminal's API

## Table of contents

1. [Installation and Configuration](#how-to-run-locally)
2. [Creating a Location](#creating-a-location)
3. [Creating a Reader](#creating-a-reader)
4. [Running the sample](#running-the-sample)

This integration shows you how to accept in-person payments with Stripe
[Terminal](https://stripe.com/docs/terminal).

With Terminal you can build a point-of-sales application and integrate with a card reader using Stripe's Terminal APIs or Terminal's SDK.

Once your user and cashier are ready to complete their transaction, use the Stripe Terminal SDK or Terminal APIs to prompt the reader to collect payment. 🥳

## How to run locally

The recommended approach is to install with the [Stripe CLI](https://stripe.com/docs/stripe-cli#install):

```sh
stripe samples create terminal
```

Then pick:

```sh
server-driven
```

This sample includes several different server implementations and several
different client implementations. The servers all implement the same routes and
the clients all work with the same server routes.

Pick a server:

- [python](./server/python)
- [node](./server/node)
- [go](./server/go)
- [php](./server/php)
- [ruby](./server/ruby)
- [java](./server/java)
- [.NET](./server/dotnet)

Pick a client:

- [html](./client)

**Installing and cloning manually**

If you do not want to use the Stripe CLI, you can manually clone and configure
the sample yourself:

```bash
git clone https://github.com/stripe-samples/terminal
```

Rename and move the [`.env.example`](.env.example) file into a file named
`.env` in the specific folder of the server language you want to use. For
example:

```
cp .env.example server-driven/server/node/.env
```

Example `.env` file:

```sh
STRIPE_SECRET_KEY=<replace-with-your-secret-key>
STATIC_DIR="../../client"
```

You will need a Stripe account in order to run the demo. Once you set up
your account, go to the Stripe [developer
dashboard](https://stripe.com/docs/development#api-keys) to find your API
keys.

The other environment variables are configurable:

`STATIC_DIR` tells the server where the client files are located and does
not need to be modified unless you move the server files.

## Creating a Location

Locations help you manage readers and their activity by associating them with a physical operating site.

You can create a Location in the Dashboard or with the API. This sample requires at least one Location, because Locations are required to register Readers.

You can quickly create a location using the Stripe API like so:

```sh
curl https://api.stripe.com/v1/terminal/locations \
  -u sk_test_123: \
  -d "display_name"="HQ" \
  -d "address[line1]"="1272 Valencia Street" \
  -d "address[city]"="San Francisco" \
  -d "address[state]"="CA" \
  -d "address[country]"="US" \
  -d "address[postal_code]"="94110" \
```

This will return the JSON: -->

```json
{
  "id": "tml_ElKc2wnORlbxOx",
  "object": "terminal.location",
  "address": {
    "city": "San Francisco",
    "country": "US",
    "line1": "1272 Valencia Street",
    "line2": "",
    "postal_code": "94110",
    "state": "CA"
  },
  "display_name": "HQ",
  "livemode": false,
  "metadata": {}
}
```

## Creating a Reader

Stripe Terminal only works with our pre-certified readers. This demo assumes that you're using the [BBPOS WisePOS E](https://stripe.com/docs/terminal/payments/setup-reader/bbpos-wisepad3). Stripe also

You can create a Reader in the [Dashboard](https://stripe.com/docs/terminal/payments/connect-reader?terminal-sdk-platform=js&reader-type=smart#register-in-the-dashboard) or with the [API](https://stripe.com/docs/terminal/payments/connect-reader?terminal-sdk-platform=js&reader-type=smart#register-using-the-api). This sample requires at least one Reader.

If you're testing this integration with a physical device, connect it WiFi and [generate a pairing code](https://stripe.com/docs/terminal/payments/connect-reader?terminal-sdk-platform=js&reader-type=smart#register-reader). If you're using the simulated reader, set `registration_code` to `simulated-wpe`.

```sh
curl https://api.stripe.com/v1/terminal/readers \
  -u sk_test_test: \
  -d "registration_code"="{{READER_REGISTRATION_CODE}}" \
  -d "label"="Stripe Sample Reader" \
  -d "location"="{{LOCATION_ID}}" #generated in previous step
```

This will return the JSON: -->

```json
{
  "id": "tmr_ElKwIQjhcdTvWi",
  "object": "terminal.reader",
  "action": null,
  "device_sw_version": "",
  "device_type": "simulated_wisepos_e",
  "ip_address": "0.0.0.0",
  "label": "simulated-wpe-e435045e-9251-4e8e-8dc6-068192a466d8",
  "livemode": false,
  "location": "tml_ElKc2wnORlbxOx",
  "metadata": {},
  "serial_number": "e435045e-9251-4e8e-8dc6-068192a466d8",
  "status": "online"
}
```

## Running the sample

Pick the server language you want and follow the instructions in the server
folder README on how to run.

For example, if you want to run the Node server:

```bash
cd server/node
# There's a README in this folder with instructions to run the server.
npm install
npm start
```

The sample will run in the browser at `localhost:4242`.
