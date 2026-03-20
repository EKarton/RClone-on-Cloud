# Generate Gemini API Key

This document outlines the steps needed to generate a secure Gemini API key.

## Steps

1. First, go to <https://aistudio.google.com> and select `Get API Key`:

    ![Click on the Get API key button](./images/generate_gemini_api_key/generate_key_1.png)

1. Next, create the API key and attach it to your GCP project:

    ![Click on the Create API Key button](./images/generate_gemini_api_key/generate_key_2.png)

    ![Name your API Key](./images/generate_gemini_api_key/generate_key_3.png)

    ![Import your GCP project](./images/generate_gemini_api_key/generate_key_4.png)

    ![Enter your GCP project](./images/generate_gemini_api_key/generate_key_5.png)

    ![Click on Create Key](./images/generate_gemini_api_key/generate_key_6.png)

1. Copy the Gemini key to your notepad:

    ![Copy the Gemini Key to your notepad](./images/generate_gemini_api_key/generate_key_7.png)

1. Finally, secure your API key by restricting access to your API key from the Photos Drive Web UI's endpoint. This can be done in the <https://console.cloud.google.com> website:

    1. First, go to <https://console.cloud.google.com> and select your project:

    ![Select your GCP project in the home page](./images/generate_gemini_api_key/gcp_1.png)

    1. Then, go to the Credentials page:

    ![Go to the credentials page](./images/generate_gemini_api_key/gcp_2.png)

    1. Next, select your Gemini credentials:

    ![Select your Gemini credentials](./images/generate_gemini_api_key/secure_key_1.png)

    1. Set the key restriction to only be accessible via the web ui to uri <http://localhost:4200>:

    ![Set the key restriction to only be accessible via the web ui](./images/generate_gemini_api_key/secure_key_2.png)

    1. Save the changes:

    ![Save your changes](./images/generate_gemini_api_key/secure_key_3.png)

1. You're done! You have created a secure Gemini API key.
