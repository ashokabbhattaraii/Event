/**
 * Centralized error message extraction and toast helper.
 * Ensures every API error surfaces a clear, user-friendly message
 * rather than a raw stack trace or empty toast.
 */

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  // Axios error
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosErr = error as { response?: { data?: { message?: string; error?: string; errors?: { message?: string }[] } }; message?: string };
    if (axiosErr.response?.data?.message) return axiosErr.response.data.message;
    if (axiosErr.response?.data?.error) return axiosErr.response.data.error;
    if (axiosErr.response?.data?.errors?.[0]?.message) return axiosErr.response.data.errors[0].message;
    if (axiosErr.message) {
      // Network errors
      if (axiosErr.message.includes("Network Error")) return "Network error. Please check your connection.";
      if (axiosErr.message.includes("timeout")) return "Request timed out. Please try again.";
      return axiosErr.message;
    }
  }
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "string") return error;
  return fallback;
}

export function getSuccessMessage(message?: string, fallback = "Done!"): string {
  return message || fallback;
}
