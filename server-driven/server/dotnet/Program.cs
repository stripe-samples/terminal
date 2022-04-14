using System;
using Microsoft.AspNetCore.StaticFiles.Infrastructure;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Terminal;
using TestReaderService = Stripe.TestHelpers.Terminal.ReaderService;

DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();
builder.Services.AddSingleton<IStripeClient>(new StripeClient(builder.Configuration["STRIPE_SECRET_KEY"]));
builder.Services.AddSingleton<ReaderService>();
builder.Services.AddSingleton<TestReaderService>();
builder.Services.AddSingleton<PaymentIntentService>();

var app = builder.Build();

StripeConfiguration.AppInfo = new AppInfo
{
    Name = "stripe-samples/terminal/server-driven",
    Url = "https://github.com/stripe-samples",
    Version = "0.0.1",
};

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

var staticFileOptions = new SharedOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), builder.Configuration["STATIC_DIR"])
    ),
};
app.UseDefaultFiles(new DefaultFilesOptions(staticFileOptions));
app.UseStaticFiles(new StaticFileOptions(staticFileOptions));


app.MapGet("list-readers", async (ReaderService service) =>
{
    var options = new ReaderListOptions();
    StripeList<Reader> readers = service.List(options);
    return Results.Ok(new { readers = readers.Data });
});

app.MapPost("create-payment-intent", async (CreatePaymentIntentRequest req, PaymentIntentService service, ILogger<Program> logger) =>
{
    try
    {
        var options = new PaymentIntentCreateOptions
        {
            Amount = req.Amount,
            Currency = "usd",
            PaymentMethodTypes = new List<string> { "card_present" },
            CaptureMethod = "manual",
        };
        var paymentIntent = await service.CreateAsync(options);
        return Results.Ok(new { payment_intent_id = paymentIntent.Id });
    }
    catch(Exception e)
    {
        logger.LogError(e, "Request failed.");
        return Results.BadRequest(new { error = new { message = e.Message }});
    }
});

app.MapGet("retrieve-payment-intent", async (string payment_intent_id, PaymentIntentService service) =>
{
    var intent = await service.GetAsync(payment_intent_id);
    return Results.Ok(new { payment_intent = intent });
});

app.MapPost("process-payment-intent", async (ProcessPaymentIntentRequest req, ReaderService service, ILogger<Program> logger) =>
{
    try
    {
        var options = new ReaderProcessPaymentIntentOptions
        {
            PaymentIntent = req.payment_intent_id,
        };
        var reader = await service.ProcessPaymentIntentAsync(req.reader_id, options);
        return Results.Ok(new { reader_state = reader });
    }
    catch(Exception e)
    {
        logger.LogError(e, "Request failed.");
        return Results.BadRequest(new { error = new { message = e.Message }});
    }
});

app.MapPost("simulate-payment", async (SimulatePaymentRequest req, TestReaderService service, ILogger<Program> logger) =>
{
    try
    {
        var reader = await service.PresentPaymentMethodAsync(req.reader_id);
        return Results.Ok(new { reader_state = reader });
    }
    catch(Exception e)
    {
        logger.LogError(e, "Request failed.");
        return Results.BadRequest(new { error = new { message = e.Message }});
    }
});

app.MapGet("retrieve-reader", async (string reader_id, ReaderService service) =>
{
    var reader = await service.GetAsync(reader_id);
    return Results.Ok(new { reader_state = reader });
});

app.MapPost("capture-payment-intent", async (CapturePaymentIntentRequest req, PaymentIntentService service, ILogger<Program> logger) =>
{
    try
    {
        var intent = await service.CaptureAsync(req.payment_intent_id);
        return Results.Ok(new { payment_intent = intent });
    }
    catch(Exception e)
    {
        logger.LogError(e, "Request failed.");
        return Results.BadRequest(new { error = new { message = e.Message }});
    }
});

app.MapPost("cancel-reader-action", async (CancelReaderActionRequest req, ReaderService service, ILogger<Program> logger) =>
{
    try
    {
        var reader = await service.CancelActionAsync(req.reader_id);
        return Results.Ok(new { reader_state = reader });
    }
    catch(Exception e)
    {
        logger.LogError(e, "Request failed.");
        return Results.BadRequest(new { error = new { message = e.Message }});
    }
});


app.Run();

public record CreatePaymentIntentRequest(long Amount);
public record ProcessPaymentIntentRequest(string reader_id, string payment_intent_id);
public record SimulatePaymentRequest(string reader_id, string payment_intent_id);
public record CapturePaymentIntentRequest(string payment_intent_id);
public record CancelReaderActionRequest(string reader_id);
