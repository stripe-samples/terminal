package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/paymentintent"
	reader "github.com/stripe/stripe-go/v72/terminal/reader"
	testreader "github.com/stripe/stripe-go/v72/testhelpers/terminal/reader"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")

	// For sample support and debugging, not required for production:
	stripe.SetAppInfo(&stripe.AppInfo{
		Name:    "stripe-samples/your-sample-name",
		Version: "0.0.1",
		URL:     "https://github.com/stripe-samples",
	})

	http.Handle("/", http.FileServer(http.Dir(os.Getenv("STATIC_DIR"))))
	http.HandleFunc("/list-readers", handleListReaders)
	http.HandleFunc("/create-payment-intent", handleCreatePaymentIntent)
	http.HandleFunc("/retrieve-payment-intent", handleRetrievePaymentIntent)
	http.HandleFunc("/process-payment-intent", handleProcessPaymentIntent)
	http.HandleFunc("/simulate-payment", handleSimulatePayment)
	http.HandleFunc("/retrieve-reader", handleRetrieveReader)
	http.HandleFunc("/capture-payment-intent", handleCapturePaymentIntent)
	http.HandleFunc("/cancel-reader-action", handleCancelReaderAction)

	log.Println("server running at 0.0.0.0:4242")
	http.ListenAndServe("0.0.0.0:4242", nil)
}

// ErrorResponseMessage represents the structure of the error
// object sent in failed responses.
type ErrorResponseMessage struct {
	Message string `json:"message"`
}

// ErrorResponse represents the structure of the error object sent
// in failed responses.
type ErrorResponse struct {
	Error *ErrorResponseMessage `json:"error"`
}

func handleListReaders(w http.ResponseWriter, r *http.Request) {
	params := &stripe.TerminalReaderListParams{}
	readers := reader.List(params)

	writeJSON(w, struct {
		Readers []*stripe.TerminalReader `json:"readers"`
	}{
		Readers: readers.TerminalReaderList().Data,
	})
}

type paymentIntentCreateReq struct {
	Amount int64 `json:"amount"`
}

func handleCreatePaymentIntent(w http.ResponseWriter, r *http.Request) {
	req := paymentIntentCreateReq{}
	json.NewDecoder(r.Body).Decode(&req)

	params := &stripe.PaymentIntentParams{
		Amount:             stripe.Int64(req.Amount),
		Currency: stripe.String(string(stripe.CurrencyUSD)),
		PaymentMethodTypes: stripe.StringSlice([]string{
			"card_present",
		}),
		CaptureMethod: stripe.String(string(stripe.PaymentIntentCaptureMethodManual)),
	}

	pi, err := paymentintent.New(params)
	if err != nil {
		// Try to safely cast a generic error to a stripe.Error so that we can get at
		// some additional Stripe-specific information about what went wrong.
		if stripeErr, ok := err.(*stripe.Error); ok {
			fmt.Printf("Other Stripe error occurred: %v\n", stripeErr.Error())
			writeJSONErrorMessage(w, stripeErr.Error(), 400)
		} else {
			fmt.Printf("Other error occurred: %v\n", err.Error())
			writeJSONErrorMessage(w, "Unknown server error", 500)
		}

		return
	}

	writeJSON(w, struct {
		PaymentIntentID string `json:"payment_intent_id"`
	}{
		PaymentIntentID: pi.ID,
	})
}

func handleRetrievePaymentIntent(w http.ResponseWriter, r *http.Request) {
	PaymentIntentID, ok := r.URL.Query()["payment_intent_id"]
	if !ok || len(PaymentIntentID) < 1 {
		log.Println("Url Param 'payment_intent_id' is missing")
		return
	}
	pi, err := paymentintent.Get(PaymentIntentID[0], nil)
	if err != nil {
		// Try to safely cast a generic error to a stripe.Error so that we can get at
		// some additional Stripe-specific information about what went wrong.
		if stripeErr, ok := err.(*stripe.Error); ok {
			fmt.Printf("Other Stripe error occurred: %v\n", stripeErr.Error())
			writeJSONErrorMessage(w, stripeErr.Error(), 400)
		} else {
			fmt.Printf("Other error occurred: %v\n", err.Error())
			writeJSONErrorMessage(w, "Unknown server error", 500)
		}
		return
	}

	writeJSON(w, struct {
		PaymentIntent *stripe.PaymentIntent `json:"payment_intent"`
	}{
		PaymentIntent: pi,
	})
}

type paymentIntentProcessReq struct {
	Reader          string `json:"reader_id"`
	PaymentIntent          string `json:"payment_intent_id"`
}

func handleProcessPaymentIntent(w http.ResponseWriter, r *http.Request) {
	req := paymentIntentProcessReq{}
	json.NewDecoder(r.Body).Decode(&req)

	params := &stripe.TerminalReaderProcessPaymentIntentParams{
		PaymentIntent: stripe.String(req.PaymentIntent),
	}

	rdr, err := reader.ProcessPaymentIntent(req.Reader, params)
	if err != nil {
		// Try to safely cast a generic error to a stripe.Error so that we can get at
		// some additional Stripe-specific information about what went wrong.
		if stripeErr, ok := err.(*stripe.Error); ok {
			fmt.Printf("Other Stripe error occurred: %v\n", stripeErr.Error())
			writeJSONErrorMessage(w, stripeErr.Error(), 400)
		} else {
			fmt.Printf("Other error occurred: %v\n", err.Error())
			writeJSONErrorMessage(w, "Unknown server error", 500)
		}
		return
	}

	writeJSON(w, struct {
		Reader *stripe.TerminalReader `json:"reader_state"`
	}{
		Reader: rdr,
	})
}

type readerSimulateReq struct {
	Reader          string `json:"reader_id"`
}

func handleSimulatePayment(w http.ResponseWriter, r *http.Request) {
	req := readerSimulateReq{}
	json.NewDecoder(r.Body).Decode(&req)

	params := &stripe.TestHelpersTerminalReaderPresentPaymentMethodParams{}
	rdr, err := testreader.PresentPaymentMethod(req.Reader, params)
	if err != nil {
		// Try to safely cast a generic error to a stripe.Error so that we can get at
		// some additional Stripe-specific information about what went wrong.
		if stripeErr, ok := err.(*stripe.Error); ok {
			fmt.Printf("Other Stripe error occurred: %v\n", stripeErr.Error())
			writeJSONErrorMessage(w, stripeErr.Error(), 400)
		} else {
			fmt.Printf("Other error occurred: %v\n", err.Error())
			writeJSONErrorMessage(w, "Unknown server error", 500)
		}
		return
	}

	writeJSON(w, struct {
		Reader *stripe.TerminalReader `json:"reader_state"`
	}{
		Reader: rdr,
	})
}

func handleRetrieveReader(w http.ResponseWriter, r *http.Request) {
	ReaderID, ok := r.URL.Query()["reader_id"]
	if !ok || len(ReaderID) < 1 {
		log.Println("Url Param 'reader_id' is missing")
		return
	}
	rdr, err := reader.Get(ReaderID[0], nil)
	if err != nil {
		// Try to safely cast a generic error to a stripe.Error so that we can get at
		// some additional Stripe-specific information about what went wrong.
		if stripeErr, ok := err.(*stripe.Error); ok {
			fmt.Printf("Other Stripe error occurred: %v\n", stripeErr.Error())
			writeJSONErrorMessage(w, stripeErr.Error(), 400)
		} else {
			fmt.Printf("Other error occurred: %v\n", err.Error())
			writeJSONErrorMessage(w, "Unknown server error", 500)
		}
		return
	}

	writeJSON(w, struct {
		Reader *stripe.TerminalReader `json:"reader_state"`
	}{
		Reader: rdr,
	})
}

type capturePaymentIntentReq struct {
	PaymentIntent          string `json:"payment_intent_id"`
}

func handleCapturePaymentIntent(w http.ResponseWriter, r *http.Request) {
	req := capturePaymentIntentReq{}
	json.NewDecoder(r.Body).Decode(&req)

	params := &stripe.PaymentIntentCaptureParams{}
	pi, err := paymentintent.Capture(req.PaymentIntent, params)
	if err != nil {
		// Try to safely cast a generic error to a stripe.Error so that we can get at
		// some additional Stripe-specific information about what went wrong.
		if stripeErr, ok := err.(*stripe.Error); ok {
			fmt.Printf("Other Stripe error occurred: %v\n", stripeErr.Error())
			writeJSONErrorMessage(w, stripeErr.Error(), 400)
		} else {
			fmt.Printf("Other error occurred: %v\n", err.Error())
			writeJSONErrorMessage(w, "Unknown server error", 500)
		}
		return
	}

	writeJSON(w, struct {
		PaymentIntent *stripe.PaymentIntent `json:"payment_intent"`
	}{
		PaymentIntent: pi,
	})
}

type cancelReaderActionReq struct {
	Reader string `json:"reader_id"`
}

func handleCancelReaderAction(w http.ResponseWriter, r *http.Request) {
	req := cancelReaderActionReq{}
	json.NewDecoder(r.Body).Decode(&req)

	rdr, err := reader.CancelAction(req.Reader, nil)
	if err != nil {
		// Try to safely cast a generic error to a stripe.Error so that we can get at
		// some additional Stripe-specific information about what went wrong.
		if stripeErr, ok := err.(*stripe.Error); ok {
			fmt.Printf("Other Stripe error occurred: %v\n", stripeErr.Error())
			writeJSONErrorMessage(w, stripeErr.Error(), 400)
		} else {
			fmt.Printf("Other error occurred: %v\n", err.Error())
			writeJSONErrorMessage(w, "Unknown server error", 500)
		}
		return
	}

	writeJSON(w, struct {
		Reader *stripe.TerminalReader `json:"reader_state"`
	}{
		Reader: rdr,
	})
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(v); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Printf("json.NewEncoder.Encode: %v", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if _, err := io.Copy(w, &buf); err != nil {
		log.Printf("io.Copy: %v", err)
		return
	}
}

func writeJSONError(w http.ResponseWriter, v interface{}, code int) {
	w.WriteHeader(code)
	writeJSON(w, v)
	return
}

func writeJSONErrorMessage(w http.ResponseWriter, message string, code int) {
	resp := &ErrorResponse{
		Error: &ErrorResponseMessage{
			Message: message,
		},
	}
	writeJSONError(w, resp, code)
}
