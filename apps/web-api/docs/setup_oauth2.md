# Creating your Google OAuth2 Client

## Description

This document outlines how to create your own OAuth2 client and obtain your client ID and client secrets so that you can authenticate with your Web API

## Steps

1. Go to <https://cloud.google.com/cloud-console> and log into your Google account

2. Create a new project with any name, and select that new project:

   ![Select a project](./images/setup_oauth2/image-1.png)

   ![Create a new project](./images/setup_oauth2/image-2.png)

   ![Enter the details of your new project](./images/setup_oauth2/image-3.png)

   ![Select the project](./images/setup_oauth2/image-4.png)

   ![Dashboard of your project](./images/setup_oauth2/image-5.png)

3. Create a new OAuth2 Consent Screen by going to to the APIs and Services tab, creating an External API, and fill in the details:

   ![Click on OAuth consent screen](./images/setup_oauth2/image-6.png)

   ![Click on get started](./images/setup_oauth2/image-7.png)

   ![Fill in app information](./images/setup_oauth2/image-8.png)

   ![Select external app](./images/setup_oauth2/image-9.png)

   ![Enter contact information](./images/setup_oauth2/image-10.png)

   ![Consent to ToS and create screen](./images/setup_oauth2/image-11.png)

4. Create a Web App OAuth2 client. Set `http://localhost:4200` as the authorized JavaScript origins, and `http://localhost:4200/auth/v1/google/callback` as the authorized redirect uri:

   ![Click on Create OAuth client](./images/setup_oauth2/image-12.png)

   ![Set application type to Web Application and name to Photos Drive Web UI](./images/setup_oauth2/image-13.png)

   ![Set authorized JavaScript origins and redirect URIs](./images/setup_oauth2/image-14.png)

   ![Click on Create button](./images/setup_oauth2/image-15.png)

5. A popup will appear. You can see the client ID and client secrets from your JSON file or from the OAuth2 client web page. Save them to your note pad on your computer:

   ![Download the JSON file](./images/setup_oauth2/image-16.png)

   ![Copy the Client ID and Client Secrets from the OAuth2 Client page](./images/setup_oauth2/image-17.png)
