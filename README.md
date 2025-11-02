# Ishtar: A Multimodal AI Chat Application

**Live Demo:** [**https://ishtar.nunnarivulabs.in**](https://ishtar.nunnarivulabs.in)

> Ishtar is a full-stack, AI-powered chat application that goes beyond text, allowing users to analyze images, query PDF documents, and generate new images, all within a sleek, responsive interface.

---

## 1. Project Goal

The goal of this project was to build a complete, production-ready AI application from the ground up. This involved not only integrating with the powerful Google Gemini API but also architecting a secure, scalable, and efficient serverless backend, a performant frontend, and a fully automated deployment pipeline.

## 2. My Solution

I built Ishtar, a feature-rich web application where users can have dynamic, multimodal conversations with AI. Users can sign up, and all conversations are securely saved to their account.

The application's backend is powered by Google Cloud Functions, which handle all communication with the Gemini API. This ensures that sensitive API keys are never exposed on the client-side. The frontend is built with React and MUI, and it's heavily optimized for a smooth user experience, capable of handling even very long conversations without slowing down.

## 3. Key Features

*   **Multimodal AI Capabilities:**
    *   **Text Chat:** Engage in standard text-based conversations.
    *   **Image Analysis:** Upload an image and ask questions about it.
    *   **PDF Querying:** Upload a PDF and have the AI answer questions based on its content.
    *   **Image Generation:** Create new images from text prompts using the latest Gemini models.

*   **Secure & Scalable Serverless Backend:**
    *   All API logic is handled by **Google Cloud Functions**, ensuring a secure and scalable architecture.
    *   **Firebase Authentication** provides a robust and easy-to-use user login system.
    *   **Cloud Firestore** and **Firebase Storage** are used to securely persist all user conversations and uploaded files.
    *   Includes automated cleanup functions for managing data and storage efficiently.

*   **Optimized & Performant Frontend:**
    *   Built with **React** and the **MUI** component library for a clean, responsive design that works on any device.
    *   **TanStack Query** manages all data fetching, caching, and state, creating a snappy user experience.
    *   Long conversations are handled effortlessly using **TanStack Virtual** to virtualize messages, only rendering what's visible on screen.

*   **Automated CI/CD Pipeline:**
    *   Using **GitHub Actions**, every push to the main branch automatically triggers a build and deploys the latest version to **Firebase Hosting**, ensuring the live application is always up-to-date.

## 4. Tech Stack

*   **Frontend:** React, Vite, MUI, TanStack Query, TanStack Router, TanStack Virtual
*   **Backend:** Google Cloud Functions (Node.js)
*   **Database & Services:** Firebase (Authentication, Firestore, Storage, Hosting)
*   **APIs:** Google Gemini
*   **DevOps:** GitHub Actions

## 5. Challenges & Lessons Learned

A key challenge was providing a full-featured live demo that uses the paid Google Gemini API without risking abuse. To solve this, I implemented a **Guest Mode** with a client-side rate limit. Using the browser's `sessionStorage`, the application tracks the number of API calls made by a guest user and limits them to 10 requests per session, displaying a polite banner when the limit is reached. This provides an excellent interactive demo for visitors while protecting the application's resources.
