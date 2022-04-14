package com.stripe.sample;

import java.util.HashMap;
import java.util.Map;
import java.nio.file.Paths;

import static spark.Spark.get;
import static spark.Spark.post;
import static spark.Spark.staticFiles;
import static spark.Spark.port;

import com.google.gson.Gson;
import com.google.gson.annotations.SerializedName;

import com.stripe.Stripe;
import com.stripe.net.ApiResource;
import com.stripe.model.PaymentIntent;
import com.stripe.model.terminal.*;
import com.stripe.exception.*;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.PaymentIntentConfirmParams;
import com.stripe.param.PaymentIntentRetrieveParams;
import com.stripe.param.PaymentIntentCaptureParams;
import com.stripe.param.terminal.*;

import io.github.cdimascio.dotenv.Dotenv;

public class Server {
  private static Gson gson = new Gson();

  static class CreatePaymentIntentRequest {
    @SerializedName("amount")
    long amount;

    public long getAmount() {
      return amount;
    }
  }

  static class ProcessPaymentIntentRequest {
    @SerializedName("reader_id")
    String readerId;

    @SerializedName("payment_intent_id")
    String paymentIntentId;

    public String getReaderId() {
      return readerId;
    }

    public String getPaymentIntentId() {
      return paymentIntentId;
    }
  }

  static class SimulatePaymentIntentRequest {
    @SerializedName("reader_id")
    String readerId;

    public String getReaderId() {
      return readerId;
    }
  }

  static class CapturePaymentIntentRequest {
    @SerializedName("payment_intent_id")
    String paymentIntentId;

    public String getPaymentIntentId() {
      return paymentIntentId;
    }
  }

  static class CancelReaderActionRequest {
    @SerializedName("reader_id")
    String readerId;

    public String getReaderId() {
      return readerId;
    }
  }

  static class FailureResponse {
    private HashMap<String, String> error;

    public FailureResponse(String message) {
      this.error = new HashMap<String, String>();
      this.error.put("message", message);
    }
  }

  public static void main(String[] args) {
    port(4242);
    Dotenv dotenv = Dotenv.load();

    Stripe.apiKey = dotenv.get("STRIPE_SECRET_KEY");

    // For sample support and debugging, not required for production:
    Stripe.setAppInfo(
        "stripe-samples/terminal/server-driven",
        "0.0.1",
        "https://github.com/stripe-samples");

    staticFiles.externalLocation(
      Paths.get(
        Paths.get("").toAbsolutePath().toString(), dotenv.get("STATIC_DIR")
      ).normalize().toString()
    );

    get("/list-readers", (request, response) -> {
      response.type("application/json");

      ReaderListParams params = ReaderListParams.builder().build();
      ReaderCollection readers = Reader.list(params);

      Map<String, Object> resp = new HashMap<>();
      resp.put("readers", readers.getData());

      return gson.toJson(resp);
    });

    post("/create-payment-intent", (request, response) -> {
      response.type("application/json");

      CreatePaymentIntentRequest postBody = gson.fromJson(request.body(), CreatePaymentIntentRequest.class);

      PaymentIntentCreateParams createParams = new PaymentIntentCreateParams
        .Builder()
        .setCurrency("usd")
        .setAmount(postBody.getAmount())
        .addPaymentMethodType("card_present")
        .setCaptureMethod(PaymentIntentCreateParams.CaptureMethod.MANUAL)
        .build();

      try {
        // Create a PaymentIntent with the order amount and currency
        PaymentIntent intent = PaymentIntent.create(createParams);

        // Send PaymentIntent details to client
        Map<String, Object> resp = new HashMap<>();
        resp.put("payment_intent_id", intent.getId());

        return gson.toJson(resp);
      } catch(StripeException e) {
        response.status(400);
        return gson.toJson(new FailureResponse(e.getMessage()));
      } catch(Exception e) {
        response.status(500);
        return gson.toJson(e);
      }
    });

    get("/retrieve-payment-intent", (request, response) -> {
      response.type("application/json");

      try {
        // Create a PaymentIntent with the order amount and currency
        PaymentIntent intent = PaymentIntent.retrieve(
          request.queryParams("payment_intent_id")
        );

        // Send PaymentIntent details to client
        Map<String, Object> resp = new HashMap<>();
        resp.put("payment_intent", intent);

        return gson.toJson(resp);
      } catch(StripeException e) {
        response.status(400);
        return gson.toJson(new FailureResponse(e.getMessage()));
      } catch(Exception e) {
        response.status(500);
        return gson.toJson(e);
      }
    });

    post("/process-payment-intent", (request, response) -> {
      response.type("application/json");

      ProcessPaymentIntentRequest postBody = gson.fromJson(request.body(), ProcessPaymentIntentRequest.class);

      ReaderProcessPaymentIntentParams params = new ReaderProcessPaymentIntentParams
        .Builder()
        .setPaymentIntent(postBody.getPaymentIntentId())
        .build();

      try {
        Reader reader = Reader.retrieve(postBody.getReaderId());
        Reader updatedReader = reader.processPaymentIntent(params);

        // Send PaymentIntent details to client
        Map<String, Object> resp = new HashMap<>();
        resp.put("reader_state", updatedReader);

        return gson.toJson(resp);
      } catch(StripeException e) {
        response.status(400);
        return gson.toJson(new FailureResponse(e.getMessage()));
      } catch(Exception e) {
        response.status(500);
        return gson.toJson(e);
      }
    });

    post("/simulate-payment", (request, response) -> {
      response.type("application/json");

      SimulatePaymentIntentRequest postBody = gson.fromJson(request.body(), SimulatePaymentIntentRequest.class);

      try {
        Reader resource = Reader.retrieve(postBody.getReaderId());
        ReaderPresentPaymentMethodParams params = ReaderPresentPaymentMethodParams.builder().build();

        Reader reader = resource.getTestHelpers().presentPaymentMethod(params);
        // Send PaymentIntent details to client
        Map<String, Object> resp = new HashMap<>();
        resp.put("reader_state", reader);

        return gson.toJson(resp);
      } catch(StripeException e) {
        response.status(400);
        return gson.toJson(new FailureResponse(e.getMessage()));
      } catch(Exception e) {
        response.status(500);
        return gson.toJson(e);
      }
    });

    get("/retrieve-reader", (request, response) -> {
      response.type("application/json");

      try {
        // Create a PaymentIntent with the order amount and currency
        Reader reader = Reader.retrieve(request.queryParams("reader_id"));

        // Send PaymentIntent details to client
        Map<String, Object> resp = new HashMap<>();
        resp.put("reader_state", reader);

        return gson.toJson(resp);
      } catch(StripeException e) {
        response.status(400);
        return gson.toJson(new FailureResponse(e.getMessage()));
      } catch(Exception e) {
        response.status(500);
        return gson.toJson(e);
      }
    });

    post("/capture-payment-intent", (request, response) -> {
      response.type("application/json");

      CapturePaymentIntentRequest postBody = gson.fromJson(request.body(), CapturePaymentIntentRequest.class);

      try {

        PaymentIntent paymentIntent = PaymentIntent.retrieve(postBody.getPaymentIntentId());

        PaymentIntent updatedPaymentIntent = paymentIntent.capture();

        Map<String, Object> resp = new HashMap<>();
        resp.put("payment_intent", updatedPaymentIntent);

        return gson.toJson(resp);
      } catch(StripeException e) {
        response.status(400);
        return gson.toJson(new FailureResponse(e.getMessage()));
      } catch(Exception e) {
        response.status(500);
        return gson.toJson(e);
      }
    });

    post("/cancel-reader-action", (request, response) -> {
      response.type("application/json");

      CancelReaderActionRequest postBody = gson.fromJson(request.body(), CancelReaderActionRequest.class);

      try {

        Reader reader = Reader.retrieve(postBody.getReaderId());

        Reader updatedReader = reader.cancelAction();

        Map<String, Object> resp = new HashMap<>();
        resp.put("reader_state", updatedReader);

        return gson.toJson(resp);
      } catch(StripeException e) {
        response.status(400);
        return gson.toJson(new FailureResponse(e.getMessage()));
      } catch(Exception e) {
        response.status(500);
        return gson.toJson(e);
      }
    });

  }
}
