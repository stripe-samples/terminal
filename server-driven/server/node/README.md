# Stripe Terminal Sample

An [Express server](http://expressjs.com) implementation of Stripe Terminal.

## Requirements

- Node v10+
- [Configured .env file](../README.md)

## How to run

1. Confirm `.env` configuration

Ensure the API keys are configured in `.env` in this directory. It should include the following keys:

```yaml
# Stripe API keys - see https://stripe.com/docs/development/quickstart#api-keys
STRIPE_SECRET_KEY=sk_test...

# Path to front-end implementation. Note: PHP has it's own front end implementation.
STATIC_DIR=../../client
```

2. Install dependencies and start the server

```
npm install
npm start
```

3. If you're using the html client, go to `localhost:4242` to see the demo. For
   react, visit `localhost:3000`.
