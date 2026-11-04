(() => {
  const status = document.getElementById("oauth-status");
  const errorMessage = document.getElementById("oauth-error");
  const retry = document.getElementById("oauth-retry");
  const signupForm = document.getElementById("oauth-signup-form");
  const signupError = document.getElementById("oauth-signup-error");

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!signupForm.reportValidity()) return;

    const submit = signupForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    signupError.textContent = "";
    try {
      await MNM_API.auth.completeOAuthSignUp(
        signupForm.elements.namedItem("username").value,
        signupForm.elements.namedItem("track").value,
      );
      location.replace("dashboard.html");
    } catch (error) {
      signupError.textContent = error.message;
      submit.disabled = false;
    }
  });

  MNM_API.auth.completeOAuthRedirect()
    .then((result) => {
      if (result?.pendingSignUp) {
        status.textContent = "Finish creating your account";
        signupForm.hidden = false;
        return;
      }
      location.replace("dashboard.html");
    })
    .catch((error) => {
      console.error("Could not complete Clerk sign-in:", error);
      status.textContent = "Sign in could not be completed";
      errorMessage.textContent = error.message;
      signupForm.hidden = true;
      retry.hidden = false;
    });
})();
