# Technical Specification: Newsletter Maker

This document outlines the technical architecture, data flow, and "best practices" for the Newsletter Maker application. It is designed to guide AI assistants and developers in understanding the system's core logic and constraints.

## 1. System Overview
The application is a locally-hosted web tool for curating, formatting, and publishing weekly newsletters. It manages a pipeline from article ingestion (Excel/AI) to image selection (API) to final HTML generation and FTP upload.

**Core Tech Stack:**
- **Runtime**: Node.js
- **Backend**: Express.js
- **Database**: File-based JSON (primary), scalable to Supabase.
- **Frontend**: Vanilla JS (static HTML generation + client-side hydration).
- **Services**: `xlsx` (sheet parsing), `basic-ftp` (deployment), `openai`/`anthropic` (AI content), `freepik` (images).

## 2. Component Architecture & State Management

### 2.1 State Isolation Principle
**CRITICAL**: The application must support asynchronous, granular state updates.
- **Global State**: Holds the list of articles, week metadata, and user settings.
- **Local/Component State**:
  - *Article Card*: Each article card operates independently. Triggering an image search or text edit on Article A MUST NOT cause a re-render or state reset for Article B.
  - *Loading States*: Specific actions (Search, Save) should show local loading indicators (spinners on the specific card) where possible, or a global overlay for blocking operations (Upload).

### 2.2 View Hierarchy
1.  **Ingestion View**:
    -   Inputs: Date range pickers, File Upload (Excel), AI Prompt Textarea.
    -   **Priority Logic**: **Excel Sheet takes priority.** The prompt box is secondary; it can be used to clear/restart or modify existing articles *after* loading, but uploading a sheet overrides initial prompt intent.
2.  **Article & Image Management View** ("The Grid"):
    -   Layout: 2-column grid. Even numbers right, odd numbers left.
    -   **Article Card Component**:
        -   *Text*: Title/Description inputs (2 lines max, ~55 chars). Visual warning if overflow.
        -   *Image Search*: "Keyword" button triggers API.
        -   *Image Selector UI*: 
            -   **Layout**: 1 Large Image (Left) + 8 Small Images (Right, 2x4 grid).
            -   **Interaction**: Clicking a small image promotes it to the Large Image slot (Selected).
            -   **Pagination**: "Next" arrow loads 8 *new* small images. The Large Image remains unchanged until a new small one is clicked.
            -   **Persistence**: Images are saved to the article object when "Save" or "Next" is pressed.
3.  **Newsletter Text Editor View**:
    -   **UI**: Prompt Textarea, "Include Articles" Button, Newsletter Type Radio Buttons (Mutually Exclusive).
    -   **Workflow**:
        1.  Select Newsletter Type (MED, THC, etc.).
        2.  Click "Include Articles": Fetches top-numbered articles for that category from the previous step.
        3.  System inserts Article URLs/Titles into the Prompt Textarea.
        4.  User edits the prompt (No hidden constraints/filters; raw prompt is sent to AI).
        5.  AI generates the summary/intro text.
4.  **Publishing View**:
    -   **Action 1: Image Upload**: Located on the Images Page. Uploads *selected* images to FTP. Updates local DB with public URLs.
    -   **Action 2: Newsletter Upload**: Located on Confirmation Page. Uploads generated HTML.

## 3. Data Flow & Lifecycle

### 3.1 Ingestion
1.  User uploads `.xlsx` OR enters Prompt.
2.  Backend normalizes data into `Article` objects:
    ```json
    {
      "id": "uuid",
      "title": "String",
      "description": "String",
      "status": "Y|N|YM|COOL FINDS",
      "category": "MED|THC|CBD|INV",
      "images": [], // Array of potential image URLs
      "selectedImage": null, // URL of chosen image
      "publicImageUrl": null // URL after FTP upload
    }
    ```

### 3.2 Image Search Strategy
-   **Trigger**: User clicks "Search" on an article.
-   **Query Construction**:
    -   Base: Article keywords.
    -   Modifiers: "kawaii" (if person/character), "flat", "fill".
    -   Negative Modifiers: "outline", "black & white".
-   **API Response**: Fetch images (ensure high relevance).
-   **Pagination**:
    -   *Next*: Fetch next 8.
    -   *Prev*: Restore previous set.

### 3.3 Publishing & Synchronization
-   **Step 1: Image Upload (Images Page)**
    -   Filter articles with status `Y`, `YM`, `COOL FINDS`.
    -   Upload `selectedImage` to FTP: `/public_html/{year}-{month}-{day}/images/{filename}`.
    -   **Update**: Write the returned public URL to `Article.publicImageUrl`.
    -   **UI Update**: Replace local blob URL with public URL in the "Big Square".
-   **Step 2: Manifest Generation**
    -   Create JSON/XLSX record of the entire week's data.
    -   Store in **Database** (Local/Supabase), NOT FTP.
-   **Step 3: HTML Publish (Confirmation Page)**
    -   Generate HTML from Templates + Article Data.
    -   Upload to FTP: `/public_html/newsletters/{week-id}.html`.

## 4. Error Handling & Constraints
-   **Concurrency**: Ensure file writes (JSON DB) are atomic to prevent corruption.
-   **Network**: FTP uploads must have retry logic (e.g., 3 retries with exponential backoff).
-   **Validation**:
    -   Text Length: Warn if > 110 chars (2 lines).
    -   Cool Finds: Hard limit of 2 per category.
-   **Loading**: Global overlay for "Publishing" to prevent race conditions.

## 5. Future Proofing / "Tough Questions"
-   **Image Re-selection**: If a user re-selects an image *after* publishing:
    1.  Upload the new image to a *new* path/name.
    2.  Update the database with the new URL.
    3.  **Action**: Leave the old image on the server (do not delete).
-   **Offline Mode**: Since this is local, ensure `freepik.js` handles network failures gracefully (e.g., "Check internet connection").
-   **AI Costs**: Monitor token usage for Article Generation vs. Text Editing.
