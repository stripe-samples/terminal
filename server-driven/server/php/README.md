# Terminal

An implementation in PHP


## Requirements

- PHP

## How to run

1. Confirm `.env` configuration

Ensure the API keys are configured in `.env` in this directory. It should include the following keys:

```yaml
# Stripe API keys - see https://stripe.com/docs/development/quickstart#api-keys
STRIPE_SECRET_KEY=sk_test...

# Required to verify signatures in the webhook handler.
# See README on how to use the Stripe CLI to test webhooks
STRIPE_WEBHOOK_SECRET=whsec_...
```

2. Run composer to set up dependencies

```bash
composer install
```

3. Copy .env.example to .env and replace with your Stripe API keys

```bash
cp ../../.env.example .env
```

4. Run the server locally

```bash
cd public
php -S 127.0.0.1:4242
```

4. Go to [localhost:4242](http://localhost:4242)
