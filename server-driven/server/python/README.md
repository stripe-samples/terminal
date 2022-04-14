# Stripe Terminal Sample

A [Flask](https://flask.palletsprojects.com/en/2.1.x/) implementation of Stripe Terminal.

## Requirements

- Python 3
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

2. Create and activate a new virtual environment

**MacOS / Unix**

```
python3 -m venv env
source env/bin/activate
```

**Windows (PowerShell)**

```
python3 -m venv env
.\env\Scripts\activate.bat
```

3. Install dependencies

```
pip install -r requirements.txt
```

4. Export and run the application

**MacOS / Unix**

```
export FLASK_APP=server.py
python3 -m flask run --port=4242
```

**Windows (PowerShell)**

```
$env:FLASK_APP=“server.py"
python3 -m flask run --port=4242
```

5. Go to `localhost:4242` in your browser to see the demo
