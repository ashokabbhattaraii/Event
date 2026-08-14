// eSewa's ePay v2 checkout is initiated by a real HTML form POST to their
// gateway (not a fetch/XHR redirect like Stripe's session.url), so the
// signed fields the backend returns get built into a throwaway form and
// auto-submitted — this navigates the browser to eSewa exactly as if the
// user had submitted a payment form by hand.
export function submitEsewaForm(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}
