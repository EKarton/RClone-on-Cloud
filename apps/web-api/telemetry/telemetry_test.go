package telemetry

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/otel"
)

func TestInitTelemetry(t *testing.T) {
	ctx := context.Background()

	t.Run("Initialize with empty endpoint", func(t *testing.T) {
		shutdown := InitTelemetry(ctx, Config{
			ServiceName: "test-service",
			Endpoint:    "",
		})
		assert.NotNil(t, shutdown)
		
		err := shutdown(ctx)
		assert.NoError(t, err)

		// Verify tracer provider is set (even if noop)
		tp := otel.GetTracerProvider()
		assert.NotNil(t, tp)
	})

	t.Run("Initialize with invalid headers does not panic", func(t *testing.T) {
		// We use a dummy endpoint to trigger the exporter initialization logic
		// This won't actually send anything during the test.
		shutdown := InitTelemetry(ctx, Config{
			ServiceName: "test-service",
			Endpoint:    "http://localhost:4318",
			Headers:     "invalid-header-format",
		})
		assert.NotNil(t, shutdown)
		defer func() { _ = shutdown(ctx) }()
	})

	t.Run("Initialize with valid endpoint and headers", func(t *testing.T) {
		shutdown := InitTelemetry(ctx, Config{
			ServiceName: "test-service",
			Endpoint:    "http://localhost:4318",
			Headers:     "api-key=test,other=value",
		})
		assert.NotNil(t, shutdown)
		defer func() { _ = shutdown(ctx) }()

		tp := otel.GetTracerProvider()
		assert.NotNil(t, tp)
	})
}
