package telemetry

import (
	"context"
	"log"
	"strings"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.opentelemetry.io/otel/trace/noop"
)

// Config represents telemetry configuration.
type Config struct {
	ServiceName    string
	ServiceVersion string
	Endpoint       string
	Headers        string // comma-separated pairs: key=value,key=value
}

// InitTelemetry initializes OTLP exporters for traces and metrics.
// Returns a shutdown function.
func InitTelemetry(ctx context.Context, cfg Config) func(context.Context) error {
	if cfg.Endpoint == "" {
		otel.SetTracerProvider(noop.NewTracerProvider())
		return func(context.Context) error { return nil }
	}

	headerMap := parseHeaders(cfg.Headers)

	// -- Traces --
	traceExporter, err := otlptracehttp.New(ctx,
		otlptracehttp.WithEndpointURL(cfg.Endpoint),
		otlptracehttp.WithHeaders(headerMap),
	)
	if err != nil {
		log.Printf("failed to create trace exporter: %v\n", err)
	}

	// -- Metrics --
	metricExporter, err := otlpmetrichttp.New(ctx,
		otlpmetrichttp.WithEndpointURL(cfg.Endpoint),
		otlpmetrichttp.WithHeaders(headerMap),
	)
	if err != nil {
		log.Printf("failed to create metric exporter: %v\n", err)
	}

	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			resource.Default().SchemaURL(),
			semconv.ServiceName(cfg.ServiceName),
			semconv.ServiceVersion(cfg.ServiceVersion),
		),
	)
	if err != nil {
		log.Printf("failed to create resource: %v", err)
	}

	// -- Trace Provider --
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(traceExporter),
		sdktrace.WithResource(res),
	)
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}))

	// -- Meter Provider --
	mp := sdkmetric.NewMeterProvider(
		sdkmetric.WithResource(res),
		sdkmetric.WithReader(sdkmetric.NewPeriodicReader(metricExporter, sdkmetric.WithInterval(30*time.Second))),
	)
	otel.SetMeterProvider(mp)

	return func(shCtx context.Context) error {
		var errs []string
		if err := tp.Shutdown(shCtx); err != nil {
			errs = append(errs, "trace shutdown: "+err.Error())
		}
		if err := mp.Shutdown(shCtx); err != nil {
			errs = append(errs, "metric shutdown: "+err.Error())
		}
		if len(errs) > 0 {
			return log.Output(2, strings.Join(errs, "; "))
		}
		return nil
	}
}

func parseHeaders(headers string) map[string]string {
	headerMap := map[string]string{}
	if headers == "" {
		return headerMap
	}
	pairs := strings.Split(headers, ",")
	for _, pair := range pairs {
		parts := strings.SplitN(pair, "=", 2)
		if len(parts) == 2 {
			headerMap[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
		}
	}
	return headerMap
}
