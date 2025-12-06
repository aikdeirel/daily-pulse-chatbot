/**
 * API Logger utility for logging API requests and responses
 */
const APILogger = {
  /**
   * Check if logging is enabled
   * @returns true if logging is enabled, false otherwise
   */
  isLoggingEnabled(): boolean {
    // Only enable logging in non-production environments
    return process.env.NODE_ENV !== "production";
  },

  /**
   * Log API request and response
   * @param serviceName Name of the service (e.g., 'Google', 'Spotify')
   * @param method HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param endpoint API endpoint
   * @param requestData Request payload/data
   * @param responseData Response data
   * @param statusCode HTTP status code
   * @param durationMs Request duration in milliseconds
   */
  logRequest(
    serviceName: string,
    method: string,
    endpoint: string,
    requestData: any,
    responseData: any,
    statusCode: number,
    durationMs: number,
  ): void {
    if (!this.isLoggingEnabled()) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      service: serviceName,
      method,
      endpoint,
      statusCode,
      durationMs,
      request: this.sanitizeData(requestData),
      response: this.sanitizeData(responseData),
    };

    // Log to console in a readable format
    console.log(
      `[API ${serviceName}] ${method} ${endpoint} - ${statusCode} (${durationMs}ms)`,
    );

    // Log detailed information
    console.log(JSON.stringify(logEntry, null, 2));
  },

  /**
   * Log API errors
   * @param serviceName Name of the service
   * @param method HTTP method
   * @param endpoint API endpoint
   * @param error Error object
   * @param requestData Request payload/data
   */
  logError(
    serviceName: string,
    method: string,
    endpoint: string,
    error: Error | any,
    requestData: any,
  ): void {
    if (!this.isLoggingEnabled()) {
      return;
    }

    const timestamp = new Date().toISOString();
    const errorLog = {
      timestamp,
      service: serviceName,
      method,
      endpoint,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        ...(error?.status && { status: error.status }),
        ...(error?.code && { code: error.code }),
      },
      request: this.sanitizeData(requestData),
    };

    console.error(
      `[API ${serviceName} ERROR] ${method} ${endpoint}: ${error?.message || "Unknown error"}`,
    );
    console.error(JSON.stringify(errorLog, null, 2));
  },

  /**
   * Sanitize sensitive data from logging
   * @param data Data to sanitize
   * @returns Sanitized data
   */
  sanitizeData(data: any): any {
    if (!data || typeof data !== "object") {
      return data;
    }

    // Create a deep copy to avoid modifying original data
    try {
      const sanitized = JSON.parse(JSON.stringify(data));

      // Remove sensitive fields - expanded list
      const sensitiveFields = [
        "accessToken",
        "access_token",
        "refreshToken",
        "refresh_token",
        "token",
        "password",
        "secret",
        "apiKey",
        "api_key",
        "apikey",
        "auth",
        "authorization",
        "bearer",
        "clientsecret",
        "client_secret",
        "credential",
        "credentials",
        "key",
        "passwd",
        "privatekey",
        "private_key",
        "secretkey",
        "secret_key",
        "session",
        "sessionid",
        "session_id",
      ];

      const removeSensitiveFields = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(removeSensitiveFields);
        }

        if (obj && typeof obj === "object") {
          const result: any = {};
          for (const key in obj) {
            if (
              sensitiveFields.some((field) =>
                key.toLowerCase().includes(field.toLowerCase()),
              )
            ) {
              result[key] = "[REDACTED]";
            } else if (typeof obj[key] === "object" && obj[key] !== null) {
              result[key] = removeSensitiveFields(obj[key]);
            } else {
              result[key] = obj[key];
            }
          }
          return result;
        }

        return obj;
      };

      return removeSensitiveFields(sanitized);
    } catch (e) {
      // If JSON serialization fails, return a safe fallback
      console.warn("Failed to sanitize data, returning original:", e);
      return "[UNABLE_TO_SANITIZE]";
    }
  },
};

// Export the APILogger object
export { APILogger };
